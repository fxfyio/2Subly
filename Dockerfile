FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY server.py index.html app.js styles.css share.html share.js README.md /app/
COPY assets /app/assets

RUN useradd -m -u 10001 appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

USER appuser

ENV HOST=0.0.0.0 \
    PORT=5173 \
    DB_PATH=/app/data/subly.db

EXPOSE 5173

CMD ["python3", "/app/server.py"]
