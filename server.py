"""
IRaMuTeQ Web Studio — Hardened Zero-Retention FastAPI Backend & Static Server.

Privacy & Hardening Guarantees:
- Zero-Retention In-Memory Processing: Uploaded files are read strictly via `BytesIO`
  in RAM and are NEVER written to disk or logged.
- Upload Limits: Hard 15 MB file cap and 15,000-row spreadsheet cap with clear JSON errors (HTTP 413).
- Rate Limiting: Sliding-window per-IP rate limiter (10 analysis requests / 60s, HTTP 429).

Endpoints:
- GET  /                        : Serves index.html (Web Studio UI)
- GET  /api/health              : Backend status, available EN/FR/RU lemmatizers & privacy config
- GET  /api/demo                : Built-in anonymized Demo Dataset (260 entries)
- GET  /api/demo/csv            : Downloadable anonymized sample CSV file
- POST /api/upload/preview      : RAM-only upload (.csv, .xlsx/.xls, .txt) -> 5-row preview & columns
- POST /api/analyze/mapped      : Analyze mapped CSV/Excel columns (EN/FR/RU, bigrams, custom stopwords)
- POST /api/analyze/text        : Analyze pasted/uploaded .txt corpus (EN/FR/RU, bigrams, custom stopwords)
- POST /api/analyze/recalculate : Recalculate any active dataset (precomputed, uploaded, or pasted)
                                  with updated custom stopwords, language, or bigram toggle
"""

from __future__ import annotations

from collections import defaultdict, deque
from contextlib import asynccontextmanager
import io
import json
import os
import re
import time
import uuid
from typing import Any, Deque, Dict, List, Literal, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from iramuteq_engine import (
    get_available_lemmatizers,
    get_lemmatizer,
    parse_iramuteq_txt,
    parse_tabular_records,
    process_corpus,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_JSON_PATH = os.path.join(BASE_DIR, "iramuteq_data.json")
DEMO_CSV_PATH = os.path.join(BASE_DIR, "data", "demo_digital_detox.csv")

# Hardening & Zero-Retention constants
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_UPLOAD_ROWS = 15_000
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_PER_MIN", "10"))
RATE_LIMIT_WINDOW_SECONDS = 60

# In-memory upload staging store (RAM-only, TTL 20 minutes, strictly capped)
_UPLOAD_STORE: Dict[str, Dict[str, Any]] = {}
_MAX_STAGED_UPLOADS = 20
_UPLOAD_TTL_SECONDS = 1200

# In-memory per-IP sliding window rate limiter
_IP_REQUEST_LOG: Dict[str, Deque[float]] = defaultdict(deque)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_lemmatizer("en")
    yield
    _UPLOAD_STORE.clear()
    _IP_REQUEST_LOG.clear()


app = FastAPI(
    title="IRaMuTeQ Web Studio API",
    description="Zero-retention interactive lexical & Reinert text-mining backend (EN/FR/RU lemmatization, bigrams, specificity χ², CSV/Excel import).",
    version="3.5.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(request: Request) -> None:
    ip = _get_client_ip(request)
    now = time.monotonic()
    q = _IP_REQUEST_LOG[ip]
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    while q and q[0] < cutoff:
        q.popleft()
    if len(q) >= RATE_LIMIT_MAX_REQUESTS:
        retry_after = max(1, int(RATE_LIMIT_WINDOW_SECONDS - (now - q[0])))
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({RATE_LIMIT_MAX_REQUESTS} analysis requests per minute). Please retry in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    q.append(now)


def _cleanup_uploads() -> None:
    now = time.time()
    expired = [k for k, v in _UPLOAD_STORE.items() if now - v["created_at"] > _UPLOAD_TTL_SECONDS]
    for k in expired:
        _UPLOAD_STORE.pop(k, None)
    if len(_UPLOAD_STORE) > _MAX_STAGED_UPLOADS:
        oldest = sorted(_UPLOAD_STORE.items(), key=lambda item: item[1]["created_at"])
        for k, _ in oldest[: len(_UPLOAD_STORE) - _MAX_STAGED_UPLOADS]:
            _UPLOAD_STORE.pop(k, None)


def _read_tabular_bytes(content: bytes, filename: str) -> pd.DataFrame:
    """Parse raw .csv or .xlsx strictly from in-memory BytesIO (zero disk writes)."""
    ext = os.path.splitext(filename.lower())[1]
    if ext in {".xlsx", ".xls"}:
        try:
            return pd.read_excel(io.BytesIO(content), engine="openpyxl")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Unable to parse Excel workbook: {exc}")

    last_err: Optional[Exception] = None
    for enc in ("utf-8-sig", "utf-8", "cp1251", "latin1"):
        try:
            df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=None, engine="python")
            if df.shape[1] >= 1:
                return df
        except Exception as exc:
            last_err = exc
    raise HTTPException(status_code=400, detail=f"Unable to parse CSV file: {last_err}")


def _suggest_columns(df: pd.DataFrame) -> Dict[str, Any]:
    """Heuristically identify the main text column and categorical metadata columns."""
    avg_lengths: Dict[str, float] = {}
    meta_candidates: List[str] = []
    n_rows = max(len(df), 1)

    for col in df.columns:
        series = df[col].dropna().astype(str).str.strip()
        if series.empty:
            avg_lengths[col] = 0.0
            continue
        avg_len = float(series.str.len().mean())
        avg_lengths[col] = avg_len
        n_unique = int(series.nunique())
        if 2 <= n_unique <= min(40, max(2, int(n_rows * 0.6))) and avg_len < 50:
            meta_candidates.append(col)

    text_col = max(avg_lengths, key=lambda c: avg_lengths[c]) if avg_lengths else str(df.columns[0])
    meta_candidates = [c for c in meta_candidates if c != text_col][:4]
    return {"suggested_text_col": text_col, "suggested_meta_cols": meta_candidates}


def _load_precomputed_datasets() -> Dict[str, Any]:
    if os.path.exists(DATA_JSON_PATH):
        with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _load_builtin_source_docs(dataset_key: str) -> Tuple[List[Dict[str, Any]], str]:
    """Load raw documents for any built-in dataset so interactive stopword recalculation works seamlessly."""
    if dataset_key == "demo_digital_detox" and os.path.exists(DEMO_CSV_PATH):
        df = pd.read_csv(DEMO_CSV_PATH)
        docs = parse_tabular_records(
            df.to_dict(orient="records"),
            text_column="text",
            metadata_columns=["community", "content_type", "platform"],
        )
        return docs, "Demo Dataset — Digital Detox Discourse (Anonymized)"

    if dataset_key == "reddit_iramuteq":
        path = os.path.join(BASE_DIR, "reddit_iramuteq_corpus.txt")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return parse_iramuteq_txt(f.read()), "Reddit Digital Minimalism (Main)"

    if dataset_key == "reddit_detox":
        path = os.path.join(BASE_DIR, "RedditDigitalDetox.txt")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return parse_iramuteq_txt(f.read()), "Reddit Digital Detox Corpus"

    if dataset_key == "reddit_combined":
        docs: List[Dict[str, Any]] = []
        for fname in ("reddit_iramuteq_corpus.txt", "RedditDigitalDetox.txt"):
            p = os.path.join(BASE_DIR, fname)
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    docs.extend(parse_iramuteq_txt(f.read()))
        if docs:
            return docs, "Combined Reddit Corpus (All)"

    if dataset_key == "youtube_detox":
        p = os.path.join(BASE_DIR, "dataset_youtube-scraper_2026-10-12_14-20-18-145.json")
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                yt_data = json.load(f)
            docs = [
                {
                    "id": str(i),
                    "meta": {"id": str(i), "type": "video", "channel": re.sub(r"\W+", "", item.get("channelName", "Unknown"))},
                    "text": f"{item.get('title', '')}. {item.get('text', '')}",
                }
                for i, item in enumerate(yt_data, start=1)
            ]
            return docs, "YouTube Digital Detox Videos"

    if dataset_key == "all_in_one":
        p = os.path.join(BASE_DIR, "ALLinONE.txt")
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                lines = [ln.strip() for ln in f if ln.strip()]
            docs = [{"id": str(i), "meta": {"id": str(i), "type": "comment", "source": "allinone"}, "text": ln} for i, ln in enumerate(lines, start=1)]
            return docs, "Community Detox & Dumbphones (ALLinONE)"

    raise HTTPException(status_code=404, detail=f"Source documents for dataset '{dataset_key}' not found.")


class MappedAnalyzeRequest(BaseModel):
    upload_id: str
    text_column: str
    metadata_columns: List[str] = Field(default_factory=list)
    target_classes: int = Field(default=5, ge=2, le=8)
    language: Literal["en", "fr", "ru"] = "en"
    detect_bigrams: bool = False
    custom_stopwords: List[str] = Field(default_factory=list)
    dataset_name: Optional[str] = None


class RawTextAnalyzeRequest(BaseModel):
    text: str
    dataset_name: str = "Custom Corpus"
    target_classes: int = Field(default=5, ge=2, le=8)
    language: Literal["en", "fr", "ru"] = "en"
    detect_bigrams: bool = False
    custom_stopwords: List[str] = Field(default_factory=list)


class RecalculateRequest(BaseModel):
    source_type: Literal["builtin", "upload", "text"]
    dataset_key: Optional[str] = None
    upload_id: Optional[str] = None
    text_column: Optional[str] = None
    metadata_columns: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = None
    dataset_name: Optional[str] = None
    target_classes: int = Field(default=5, ge=2, le=8)
    language: Literal["en", "fr", "ru"] = "en"
    detect_bigrams: bool = False
    custom_stopwords: List[str] = Field(default_factory=list)


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    precomputed = _load_precomputed_datasets()
    lemmatizers = get_available_lemmatizers()
    return {
        "status": "ok",
        "lemmatizer": lemmatizers["en"],
        "lemmatizers": lemmatizers,
        "datasets_available": list(precomputed.keys()),
        "demo_csv_ready": os.path.exists(DEMO_CSV_PATH),
        "privacy": {
            "zero_retention_ram_only": True,
            "max_upload_mb": MAX_UPLOAD_BYTES // (1024 * 1024),
            "max_upload_rows": MAX_UPLOAD_ROWS,
            "rate_limit_per_min": RATE_LIMIT_MAX_REQUESTS,
        },
    }


@app.get("/api/demo")
def get_demo_dataset() -> JSONResponse:
    precomputed = _load_precomputed_datasets()
    if "demo_digital_detox" in precomputed:
        return JSONResponse(content=precomputed["demo_digital_detox"])
    docs, name = _load_builtin_source_docs("demo_digital_detox")
    return JSONResponse(content=process_corpus(docs, name=name, target_classes=5, language="en"))


@app.get("/api/demo/csv")
def download_demo_csv() -> FileResponse:
    if not os.path.exists(DEMO_CSV_PATH):
        raise HTTPException(status_code=404, detail="Demo CSV not generated yet.")
    return FileResponse(DEMO_CSV_PATH, media_type="text/csv", filename="demo_digital_detox.csv")


@app.post("/api/upload/preview")
async def upload_preview(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Zero-retention RAM-only upload preview for .csv, .xlsx/.xls, or IRaMuTeQ .txt.
    Enforces strict 15 MB file limit and 15,000-row spreadsheet cap.
    """
    _cleanup_uploads()
    filename = file.filename or "uploaded_file"
    ext = os.path.splitext(filename.lower())[1]

    # Read at most MAX_UPLOAD_BYTES + 1 bytes directly into RAM (zero temp files)
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit. Please trim your file and try again.",
        )

    upload_id = str(uuid.uuid4())

    if ext in {".csv", ".xlsx", ".xls"}:
        df = _read_tabular_bytes(content, filename)
        df.columns = [str(c).strip() for c in df.columns]
        if df.empty or len(df.columns) == 0:
            raise HTTPException(status_code=400, detail="Spreadsheet contains no rows or columns.")
        if len(df) > MAX_UPLOAD_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Spreadsheet has {len(df):,} rows, exceeding the {MAX_UPLOAD_ROWS:,}-row cap for public server processing.",
            )

        suggestions = _suggest_columns(df)
        preview_df = df.head(5).fillna("")
        preview_rows = [
            {col: str(row[col])[:220] for col in df.columns}
            for row in preview_df.to_dict(orient="records")
        ]

        _UPLOAD_STORE[upload_id] = {
            "type": "tabular",
            "filename": filename,
            "records": df.where(pd.notnull(df), None).to_dict(orient="records"),
            "columns": list(df.columns),
            "created_at": time.time(),
        }

        return {
            "upload_id": upload_id,
            "file_type": "tabular",
            "filename": filename,
            "total_rows": int(len(df)),
            "columns": list(df.columns),
            "preview_rows": preview_rows,
            **suggestions,
        }

    if ext in {".txt", ".text"}:
        decoded = None
        for enc in ("utf-8-sig", "utf-8", "cp1251", "latin1"):
            try:
                decoded = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded is None:
            decoded = content.decode("utf-8", errors="ignore")

        docs = parse_iramuteq_txt(decoded)
        if not docs:
            raise HTTPException(status_code=400, detail="No documents found in uploaded text file.")
        if len(docs) > MAX_UPLOAD_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Text corpus has {len(docs):,} documents, exceeding the {MAX_UPLOAD_ROWS:,}-entry limit.",
            )

        _UPLOAD_STORE[upload_id] = {
            "type": "txt",
            "filename": filename,
            "raw_text": decoded,
            "created_at": time.time(),
        }

        return {
            "upload_id": upload_id,
            "file_type": "txt",
            "filename": filename,
            "total_docs": len(docs),
            "has_iramuteq_headers": "****" in decoded,
            "raw_text": decoded,
        }

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported file format '{ext}'. Please upload .csv, .xlsx, .xls, or .txt.",
    )


@app.post("/api/analyze/mapped")
def analyze_mapped_upload(req: MappedAnalyzeRequest, request: Request) -> JSONResponse:
    """Run full multi-language dictionary-lemmatized IRaMuTeQ analysis on RAM-staged CSV/Excel columns."""
    _enforce_rate_limit(request)
    _cleanup_uploads()
    staged = _UPLOAD_STORE.get(req.upload_id)
    if not staged or staged.get("type") != "tabular":
        raise HTTPException(status_code=404, detail="Upload session expired or not found in RAM. Please re-upload your file.")

    if req.text_column not in staged["columns"]:
        raise HTTPException(status_code=400, detail=f"Selected text column '{req.text_column}' not found.")

    valid_meta = [c for c in req.metadata_columns if c in staged["columns"] and c != req.text_column]
    docs = parse_tabular_records(staged["records"], req.text_column, valid_meta)
    if len(docs) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 non-empty text rows in the selected column to run classification.",
        )

    base_name = req.dataset_name or os.path.splitext(staged["filename"])[0]
    try:
        result = process_corpus(
            docs,
            name=f"{base_name} (Imported)",
            target_classes=req.target_classes,
            language=req.language,
            detect_bigrams=req.detect_bigrams,
            custom_stopwords=req.custom_stopwords,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return JSONResponse(content=result)


@app.post("/api/analyze/text")
def analyze_raw_text(req: RawTextAnalyzeRequest, request: Request) -> JSONResponse:
    """Run full multi-language dictionary-lemmatized IRaMuTeQ analysis on pasted IRaMuTeQ .txt or raw text."""
    _enforce_rate_limit(request)
    raw = req.text.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Input text is empty.")
    if len(raw.encode("utf-8")) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Pasted text exceeds the 15 MB size limit.")

    docs = parse_iramuteq_txt(raw)
    if not docs:
        raise HTTPException(status_code=400, detail="Could not parse any text documents from input.")
    if len(docs) > MAX_UPLOAD_ROWS:
        raise HTTPException(status_code=413, detail=f"Corpus exceeds the {MAX_UPLOAD_ROWS:,}-document limit.")

    try:
        result = process_corpus(
            docs,
            name=req.dataset_name,
            target_classes=req.target_classes,
            language=req.language,
            detect_bigrams=req.detect_bigrams,
            custom_stopwords=req.custom_stopwords,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return JSONResponse(content=result)


@app.post("/api/analyze/recalculate")
def recalculate_corpus(req: RecalculateRequest, request: Request) -> JSONResponse:
    """Recalculate any active dataset (built-in, RAM-staged CSV/Excel, or pasted text) with custom excluded stopwords."""
    _enforce_rate_limit(request)
    _cleanup_uploads()

    if req.source_type == "builtin":
        if not req.dataset_key:
            raise HTTPException(status_code=400, detail="Missing dataset_key for builtin recalculation.")
        docs, default_name = _load_builtin_source_docs(req.dataset_key)
        ds_name = req.dataset_name or default_name
    elif req.source_type == "upload":
        staged = _UPLOAD_STORE.get(req.upload_id or "")
        if not staged or staged.get("type") != "tabular":
            raise HTTPException(status_code=404, detail="Uploaded dataset session expired in RAM. Please re-upload.")
        if not req.text_column or req.text_column not in staged["columns"]:
            raise HTTPException(status_code=400, detail="Invalid text_column for recalculation.")
        valid_meta = [c for c in req.metadata_columns if c in staged["columns"] and c != req.text_column]
        docs = parse_tabular_records(staged["records"], req.text_column, valid_meta)
        ds_name = req.dataset_name or f"{os.path.splitext(staged['filename'])[0]} (Imported)"
    else:
        raw = (req.raw_text or "").strip()
        if not raw:
            raise HTTPException(status_code=400, detail="Missing raw_text for recalculation.")
        docs = parse_iramuteq_txt(raw)
        ds_name = req.dataset_name or "Custom Corpus"

    try:
        result = process_corpus(
            docs,
            name=ds_name,
            target_classes=req.target_classes,
            language=req.language,
            detect_bigrams=req.detect_bigrams,
            custom_stopwords=req.custom_stopwords,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return JSONResponse(content=result)


# Serve static files (CSS, JS, libs, index.html)
@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


app.mount("/", StaticFiles(directory=BASE_DIR), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
