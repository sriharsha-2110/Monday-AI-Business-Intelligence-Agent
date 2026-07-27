# Use official Python 3.12 slim image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set working directory
WORKDIR /workspace

# Copy dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . /workspace/backend/

# Expose port
EXPOSE 8000

# Run FastAPI app via uvicorn from the parent directory of backend to match the render start command
WORKDIR /workspace
CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
