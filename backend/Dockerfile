FROM python:3.12-slim\n\n# set work directory\nWORKDIR /app\n\n# Install system dependencies\nRUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*\n\n# Install Python dependencies\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\n\n# Copy application code\nCOPY . ./\n\n# Expose port (default from .env)\nEXPOSE 8000\n\n# Start the app\nCMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
