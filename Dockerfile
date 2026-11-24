# IRaMuTeQ Web Studio — Production Docker Image (EN/FR/RU NLP + Zero-Retention FastAPI)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/usr/local/share/nltk_data \
    RATE_LIMIT_PER_MIN=10 \
    PORT=8000

WORKDIR /app

# Install curl for container healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python & multi-language NLP dependencies (NLTK + pymorphy3)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK WordNet, POS tagger & EN/FR/RU stopwords for instant offline startup
RUN python -c "import nltk; [nltk.download(p, download_dir='/usr/local/share/nltk_data', quiet=True) for p in ['wordnet', 'omw-1.4', 'averaged_perceptron_tagger_eng', 'stopwords']]"

# Copy application source & built-in assets
COPY iramuteq_engine.py generate_iramuteq_data.py server.py ./
COPY index.html styles.css app.js ./
COPY libs/ ./libs/
COPY data/ ./data/
COPY iramuteq_data.json data.js ./

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
