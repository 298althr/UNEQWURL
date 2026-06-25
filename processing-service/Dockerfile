# 298EQ Processing Service — Docker image
# Node 20 + ffmpeg + yt-dlp + Python 3 + librosa + libsonare (WASM)

FROM node:20-bookworm-slim

WORKDIR /app

# --- System dependencies ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- yt-dlp ---
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

# Ensure yt-dlp is up to date at build time
RUN yt-dlp -U || true

# --- Python librosa ---
RUN pip3 install --no-cache-dir --break-system-packages librosa numpy

# --- Node dependencies (full install for build) ---
COPY package.json package-lock.json* ./
RUN npm install

# --- App source ---
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune devDependencies to slim down the image
RUN npm prune --omit=dev

# --- Runtime ---
ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

CMD ["node", "dist/server.js"]
