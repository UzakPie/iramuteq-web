# IRaMuTeQ Web Studio

**Reproducible, browser-native lexicometric & Reinert text mining — zero R installation, Apple Silicon (ARM) ready, white-paper publication exports, and strict zero-retention RAM-only privacy.**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](#local-setup-python)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](#api-endpoints)
[![D3.js v7](https://img.shields.io/badge/Charts-D3.js%20v7-F9A03C?logo=d3.js&logoColor=white)](#key-capabilities)
[![Docker Ready](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](#docker-deployment)
[![Zero Retention](https://img.shields.io/badge/Privacy-RAM--Only%20Zero%20Retention-10B981)](#privacy--public-server-hardening)

---

## Why Statistical Text Mining Instead of Black-Box LLM Summaries?

Generative LLM summaries are non-deterministic, opaque, and prone to subtle hallucination — making them difficult to defend in peer-reviewed theses, social science publications, and policy audits.

**IRaMuTeQ Web Studio** delivers **100% deterministic, reproducible, and auditable lexicometric statistics**:
- **Exact Reinert Descending Hierarchical Classification (CHD):** Iterative SVD bipartitioning of Elementary Context Units (UCEs) into lexical worlds with exact class shares (`Class 1 — 24.9%`).
- **Exact 1-df Pearson $\chi^2$ & Exact $p$-values:** Every lemma association is backed by exact contingency counts and $p = \operatorname{erfc}(\sqrt{\chi^2 / 2})$.
- **Full Audit Trail (Chart $\rightarrow$ Quote):** Every word in the Word Cloud, every node in the Similitude Graph, every point/class badge in the AFC/CA biplot, and every bar in the Specificity Chart opens the exact original respondent quotes in context.
- **Native Compatibility on macOS Apple Silicon (M1 / M2 / M3 / M4 ARM), Windows & Linux:** Runs entirely in your browser (or via Docker), eliminating the classic R version conflicts, wxPython/X11 crashes, and ARM compilation failures that plague legacy desktop IRaMuTeQ installations.

---

## Comparison: IRaMuTeQ Web Studio vs. Classic Desktop IRaMuTeQ

| Capability | Classic Desktop IRaMuTeQ (R / wxPython) | IRaMuTeQ Web Studio |
|---|---|---|
| **Setup Time** | 30–60 min (specific R version, R packages, Tcl/Tk, wxPython) | **< 1 min** (`docker compose up` or `pip install -r requirements.txt && python server.py`) |
| **Apple Silicon (M1–M4 ARM) Support** | Frequently breaks on macOS ARM / R library compilation | **100% Native** (standard Python + browser UI) |
| **Raw CSV & Excel Import** | Requires manual conversion to `**** *var_val` `.txt` files | **Direct `.csv` & `.xlsx` Upload** with 5-row **Column-Mapping Modal** + classic `.txt` support |
| **Multi-Language NLP & Bigrams** | Static dictionary tables, no PMI collocation toggle | **`EN / FR / RU` Dictionary Lemmatization** (`WordNet`, `pymorphy3`, optional `spaCy`) + **PMI Bigram Detection** |
| **Interactive Quote Inspection** | Static image exports; separate plain-text lookup windows | **Slide-Over KWIC Drawer** on click from every chart + **Interactive Stopword Exclusion & Recalculation** |
| **Metadata Sub-Corpus Comparison** | Manual cross-tab scripts | Dedicated **Specificity Analysis** diverging $+\chi^2 / -\chi^2$ bar chart |
| **Publication Figure Export** | Low-DPI static R plots with overlapping labels | **Dark UI & Academic White-Paper (`#FFFFFF`)** vector **SVG** & 2× HiDPI **PNG** exports |
| **Academic Reporting** | Manual transcription of corpus metrics | One-click **Copy Methodology** paragraph (`EN / FR / RU`) auto-filled with run metrics |
| **Privacy (Public Hosting)** | Local files only | **Zero-Retention RAM-only** processing (`BytesIO`), 15 MB / 15,000-row cap, per-IP rate limiting |

---

## Key Capabilities

1. **Academic White-Paper Chart Export (`Dark` vs. `White Paper`)**
   - Keep the comfortable dark research workspace on screen while exporting crisp `#FFFFFF` background, `#111827` high-contrast typography, and darkened axes/gridlines into standalone **SVG** and **2× HiDPI PNG** files ready for Word, Google Docs, LaTeX, and print journals.
2. **Multi-Language Dictionary Lemmatization (`EN / FR / RU`), PMI Bigrams & Interactive Stopwords**
   - Choose Corpus Language (`English`, `Français`, `Русский`) on import (`WordNetLemmatizer` + POS tagger, French morphological lemmatizer, `pymorphy3` Russian dictionary analyzer, with automatic `spaCy` detection if installed).
   - Enable **Detect Bigrams (PMI)** to automatically merge high-cohesion collocations (`social_media`, `screen_time`, `digital_detox`, `mental_health`) prior to Reinert clustering.
   - Click **`Exclude & Recalculate`** on any noisy word directly inside the KWIC drawer to add it to the removable custom-stopword bar and cleanly re-run CHD, AFC, Similitude, and Specificity in RAM.
3. **Reinert CHD Dendrogram & Exportable $\chi^2$ Statistics Table**
   - Orthogonal hierarchical dendrogram showing split proportions, exact class percentage shares, and top characteristic lemmas.
   - Full-width searchable, sortable $\chi^2$ table (`Lemma`, `Class`, `Freq in Class`, `Total Freq`, `%`, `Chi-square (χ²)`, `p-value`) with one-click Excel-ready **Export CSV** (UTF-8 BOM).
4. **Metadata Specificity Analysis (`Sub-Corpus χ² Comparison`)**
   - Diverging horizontal bar chart highlighting statistically over-represented ($+\chi^2$) and under-represented ($-\chi^2$) lemmas across metadata groups (e.g., `Reddit` vs. `YouTube`, `digitalminimalism` vs. `dumbphones`, `Pre` vs. `Post`), clickable to the KWIC drawer.
5. **5-Class AFC/CA Biplot, Similitude MST Graph & Lexical Word Clouds**
   - Interactive zoom/pan, AFC label density modes (`Top words (χ² ≥ 15)`, `All active words`, `On hover only`), Similitude physics pause/resume + single-click ego-network focus, and Word Cloud `Frequency` vs. `Significance (χ²)` weighting.
6. **One-Click "Copy Methodology", "Data Recipes" & Instant Demo Dataset**
   - Auto-generate a publication-ready methodology paragraph matching your active `EN / FR / RU` UI language.
   - Built-in collapsible **Data Recipes** (3-step export guides for Google Forms, Reddit, and YouTube Apify) and one-click **Load Demo Dataset** (260 anonymized entries, 5 Reinert classes).

---

## Privacy & Public Server Hardening

`server.py` is hardened out of the box for public VPS / university hosting:
- **Zero-Retention RAM-Only Processing:** Uploaded `.csv`, `.xlsx`, and `.txt` files are parsed strictly from `io.BytesIO` in memory and are never written to disk or logged. Staged sessions expire automatically in RAM.
- **Upload Resource Caps:** Enforces a strict **15 MB** file limit and **15,000-row** spreadsheet limit with clear HTTP `413` JSON messages.
- **Per-IP Rate Limiting:** Sliding-window in-memory rate limiter (**10 analysis requests/minute per IP**, configurable via `RATE_LIMIT_PER_MIN`, returning HTTP `429` with `Retry-After`).

---

## Local Setup (Python)

### 1. Clone & Create a Virtual Environment

```bash
git clone <your-repo-url>
cd iramuteq-web-studio
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS (Apple Silicon / Intel) & Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Multi-Language NLP Models

- **English (`en`):** Uses NLTK `WordNetLemmatizer` + Penn Treebank POS tagger (auto-downloads `wordnet`, `omw-1.4`, `averaged_perceptron_tagger_eng`, and `stopwords` on first run).
- **French (`fr`):** Uses NLTK French stopwords + morphological lemmatizer.
- **Russian (`ru`):** Uses `pymorphy3` (`pymorphy3-dicts-ru`, installed automatically via `requirements.txt`).

To pre-cache NLTK resources manually:
```bash
python -c "import nltk; [nltk.download(p) for p in ['wordnet', 'omw-1.4', 'averaged_perceptron_tagger_eng', 'stopwords']]"
```

*(Optional)* If you prefer **spaCy** models (auto-detected with priority when installed on Python 3.10–3.12):
```bash
pip install spacy
python -m spacy download en_core_web_sm
python -m spacy download fr_core_news_sm
python -m spacy download ru_core_news_sm
```

### 3. Run the Application

```bash
python server.py
# Or via uvicorn directly:
uvicorn server:app --host 0.0.0.0 --port 8000
```

Open **[http://localhost:8000](http://localhost:8000)** in any browser.

---

## Docker Deployment

Deploy on any server, VPS, or Apple Silicon Mac with one command:

```bash
docker compose up --build -d
```

- Web UI & API: **[http://localhost:8000](http://localhost:8000)**
- Health endpoint: **`GET /api/health`**
- Stop container: `docker compose down`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the IRaMuTeQ Web Studio UI |
| `GET` | `/api/health` | Backend health, active `EN / FR / RU` lemmatizers & privacy/limit configuration |
| `GET` | `/api/demo` | Returns the built-in anonymized Demo Dataset (260 entries, 5 Reinert classes) |
| `GET` | `/api/demo/csv` | Downloads `demo_digital_detox.csv` |
| `POST` | `/api/upload/preview` | RAM-only `.csv`, `.xlsx/.xls`, or `.txt` upload preview (5 rows, max 15 MB / 15,000 rows) |
| `POST` | `/api/analyze/mapped` | Runs `EN / FR / RU` lemmatized CHD, AFC, MST & Specificity on mapped spreadsheet columns |
| `POST` | `/api/analyze/text` | Runs `EN / FR / RU` lemmatized analysis on pasted/uploaded `.txt` corpora |
| `POST` | `/api/analyze/recalculate` | Re-runs analysis in RAM with updated custom excluded stopwords |
