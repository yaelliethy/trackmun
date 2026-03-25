FROM node:20-slim

# Install necessary system dependencies
RUN apt-get update && \
    apt-get install -y git python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

# Set working directory
WORKDIR /app

# The actual source code and node_modules will be mounted via docker-compose
CMD ["sh", "-c", "pnpm install && pnpm dev"]
