"""
Generate precomputed IRaMuTeQ Web Studio datasets (`iramuteq_data.json` & `data.js`)
and an anonymized built-in Demo Dataset (`data/demo_digital_detox.csv`) using the
full dictionary-lemmatized NLP pipeline (`iramuteq_engine.py`).
"""

import csv
import json
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from iramuteq_engine import get_lemmatizer, parse_iramuteq_txt, process_corpus


def anonymize_text(text: str) -> str:
    """Strip Reddit usernames, @handles, and personal URLs for the built-in demo dataset."""
    text = re.sub(r"\bu/[A-Za-z0-9_-]+", "[user]", text)
    text = re.sub(r"@[A-Za-z0-9_]+", "[user]", text)
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_anonymized_demo_csv(docs: list, out_csv: str) -> list:
    """Save ~260 anonymized sample rows to `data/demo_digital_detox.csv` for instant demo & CSV upload testing."""
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    demo_docs = []
    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["entry_id", "community", "content_type", "platform", "text"])
        for idx, d in enumerate(docs, start=1):
            clean_body = anonymize_text(d["text"])
            if len(clean_body.split()) < 6:
                continue
            comm = str(d["meta"].get("comm", d["meta"].get("sub", "digitalminimalism")))
            ctype = str(d["meta"].get("type", "comment"))
            platform = "Reddit"
            writer.writerow([f"DEMO_{idx:03d}", comm, ctype, platform, clean_body])
            demo_docs.append({
                "id": f"DEMO_{idx:03d}",
                "meta": {
                    "community": comm,
                    "content_type": ctype,
                    "platform": platform,
                },
                "text": clean_body,
            })
            if len(demo_docs) >= 260:
                break
    print(f"Saved anonymized demo CSV: {out_csv} ({len(demo_docs)} rows)")
    return demo_docs


def main() -> None:
    lem = get_lemmatizer()
    print(f"Active NLP Lemmatizer: {lem.backend}")

    datasets = {}
    docs1 = []
    docs2 = []

    # 1. Main IRaMuTeQ Corpus (reddit_iramuteq_corpus.txt)
    if os.path.exists("reddit_iramuteq_corpus.txt"):
        with open("reddit_iramuteq_corpus.txt", "r", encoding="utf-8", errors="ignore") as f:
            docs1 = parse_iramuteq_txt(f.read())
        print(f"Processing reddit_iramuteq ({len(docs1)} docs)...")
        datasets["reddit_iramuteq"] = process_corpus(
            docs1, name="Reddit Digital Minimalism (Main)", target_classes=5
        )

    # 2. RedditDigitalDetox.txt
    if os.path.exists("RedditDigitalDetox.txt"):
        with open("RedditDigitalDetox.txt", "r", encoding="utf-8", errors="ignore") as f:
            docs2 = parse_iramuteq_txt(f.read())
        print(f"Processing reddit_detox ({len(docs2)} docs)...")
        datasets["reddit_detox"] = process_corpus(
            docs2, name="Reddit Digital Detox Corpus", target_classes=5
        )

    # 3. Built-in Anonymized Demo Dataset (~260 entries, also exported as data/demo_digital_detox.csv)
    demo_source = docs1 + docs2
    if demo_source:
        demo_docs = build_anonymized_demo_csv(demo_source, os.path.join("data", "demo_digital_detox.csv"))
        print(f"Processing demo_digital_detox ({len(demo_docs)} docs)...")
        datasets["demo_digital_detox"] = process_corpus(
            demo_docs, name="Demo Dataset — Digital Detox Discourse (Anonymized)", target_classes=5
        )

    # 4. Combined Reddit Corpus
    if docs1 and docs2:
        combined_docs = docs1 + docs2
        print(f"Processing reddit_combined ({len(combined_docs)} docs)...")
        datasets["reddit_combined"] = process_corpus(
            combined_docs, name="Combined Reddit Corpus (All)", target_classes=5
        )

    # 5. YouTube Scraper Dataset
    yt_file = "dataset_youtube-scraper_2026-10-12_14-20-18-145.json"
    if os.path.exists(yt_file):
        with open(yt_file, "r", encoding="utf-8") as f:
            yt_data = json.load(f)
        yt_docs = []
        for i, item in enumerate(yt_data, start=1):
            title = item.get("title", "")
            desc = item.get("text", "")
            meta = {
                "id": str(i),
                "type": "video",
                "channel": re.sub(r"\W+", "", item.get("channelName", "Unknown")),
            }
            yt_docs.append({"id": str(i), "meta": meta, "text": f"{title}. {desc}"})
        print(f"Processing youtube_detox ({len(yt_docs)} docs)...")
        datasets["youtube_detox"] = process_corpus(
            yt_docs, name="YouTube Digital Detox Videos", target_classes=3
        )

    # 6. ALLinONE.txt
    if os.path.exists("ALLinONE.txt"):
        with open("ALLinONE.txt", "r", encoding="utf-8", errors="ignore") as f:
            aio_lines = [ln.strip() for ln in f if ln.strip()]
        aio_docs = [
            {"id": str(idx), "meta": {"id": str(idx), "type": "comment", "source": "allinone"}, "text": line}
            for idx, line in enumerate(aio_lines, start=1)
        ]
        print(f"Processing all_in_one ({len(aio_docs)} docs)...")
        datasets["all_in_one"] = process_corpus(
            aio_docs, name="Community Detox & Dumbphones (ALLinONE)", target_classes=4
        )

    # Write iramuteq_data.json
    with open("iramuteq_data.json", "w", encoding="utf-8") as f:
        json.dump(datasets, f, indent=2, ensure_ascii=False)
    print(f"Generated iramuteq_data.json ({os.path.getsize('iramuteq_data.json'):,} bytes)")

    # Write data.js for standalone/fast static loading
    js_content = "window.IRAMUTEQ_PRECOMPUTED_DATA = " + json.dumps(datasets, ensure_ascii=False) + ";\n"
    with open("data.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Generated data.js ({os.path.getsize('data.js'):,} bytes)")


if __name__ == "__main__":
    main()
