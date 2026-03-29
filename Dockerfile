FROM node:20-slim

# Install necessary system dependencies
RUN apt-get update && \
    apt-get install -y git python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# The actual source code will be mounted via docker-compose for development
CMD ["pnpm", "dev"]
