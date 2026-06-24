# 298EQ Processing Service

Standalone Express.js service for YouTube download/stream + audio analysis.
Runs in Docker — deployed on **Railway**.

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + dependency status |
| `/youtube/stream` | POST | Extract stream URL + metadata via yt-dlp |
| `/youtube/download` | POST | Download audio, upload to B2, insert DB, trigger analysis |
| `/analyze` | POST | Run full analysis pipeline on a track by ID |

## Deploy to Railway

### Option A: Railway CLI (fastest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# From this folder
cd processing-service
railway login
railway init          # Create new project
railway up            # Deploy (auto-detects Dockerfile)
```

### Option B: Railway Dashboard (GitHub)

1. Push this folder to a GitHub repo (or the monorepo root)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set **Root Directory** to `processing-service` (if deploying from monorepo)
4. Railway auto-detects the `Dockerfile` and `railway.json`
5. Set environment variables (see below)

### Environment Variables (set in Railway dashboard)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/dbname` |
| `B2_APPLICATION_KEY_ID` | Yes | (from Backblaze B2) |
| `B2_APPLICATION_KEY` | Yes | (from Backblaze B2) |
| `B2_BUCKET_NAME` | Yes | `298eq` |
| `B2_BUCKET_ID` | No | (auto-resolved) |
| `B2_DOWNLOAD_URL` | No | `https://f003.backblazeb2.com/file/298eq` |
| `CORS_ORIGINS` | No | `https://your-app.vercel.app` |

### After Deployment

1. Railway gives you a public URL (e.g., `https://298eq-processing.up.railway.app`)
2. Set `PROCESSING_SERVICE_URL` in your **Vercel** project env vars to that URL
3. Test: `curl https://298eq-processing.up.railway.app/health`

## Local Development

```bash
cd processing-service
npm install
npm run dev    # tsx watch, port 3100
```

Requires system deps: `ffmpeg`, `python3`, `librosa`, `yt-dlp`.

## Docker Build (local)

```bash
docker build -t 298eq-processing .
docker run -p 3100:3100 --env-file .env 298eq-processing
```
