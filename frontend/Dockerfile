# Stage 1: Build Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
RUN npm run build

# Stage 2: Serve static files using Nginx
FROM nginx:alpine

# Copy static assets from build stage
COPY --from=builder /app/out /usr/share/nginx/html

# Create custom Nginx config to run on port 3000 and support clean routing
RUN echo ' \
server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ $uri.html /index.html; \
    } \
    error_page 404 /404.html; \
} \
' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
