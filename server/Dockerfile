# Multi-stage production Dockerfile for CivicFix Backend API Service
FROM node:20-slim AS base
WORKDIR /app

# Install native dependencies required for Argon2 compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --workspace=server --omit=dev

# Copy server application source code
COPY server/ ./server/

WORKDIR /app/server

# Expose HTTP port
EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Run as non-privileged node user for container security
USER node

# Start production server
CMD ["node", "src/server.js"]

