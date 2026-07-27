# Stage 1: Build the Next.js static site
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# Copy dependencies list first
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ .

# We set NEXT_PUBLIC_API_URL to empty so the frontend dynamically queries the same host it is loaded from
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# Stage 2: Set up the Python FastAPI backend
FROM python:3.12-slim
WORKDIR /workspace

# Copy dependencies list and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source files
COPY backend/ ./backend/

# Copy the compiled Next.js static assets into backend/static
COPY --from=frontend-builder /frontend/out ./backend/static/

# Render default port
EXPOSE 8000
ENV PORT=8000

# Start FastAPI server
CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
