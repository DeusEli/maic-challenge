FROM python:3.10-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway will override this with $PORT)
EXPOSE 8000

# Health check (optional but helpful for debugging)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health')" || exit 1

# Start command - use shell form to allow environment variable substitution
CMD echo "Starting server on port ${PORT:-8000}" && \
    uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
