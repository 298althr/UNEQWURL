# UNEQWURL Sound Lab

**UNEQWURL** is a mobile-first web app for training your ear on equalization. Pick a track, tune five live EQ sliders while the music plays, submit your mix, and get an instant score.

The signature fifth control -- **UNEQWURL** -- is a peaking filter fixed at **298 Hz**, designed to shape low-mid warmth and punch without overlapping the standard low / mid / high bands.

---

## Features

### EQ Training Room
- Five live EQ sliders: **Low**, **Mid**, **High**, **Gain**, and **UNEQWURL** (298 Hz)
- Real-time audio processing in the browser
- Sliders start at a random mix each session -- train your ear, not your memory
- Instant scoring on submit -- a perfect mix scores **100**

### Track Library
- Upload your own tracks (music, podcasts, live recordings, streams)
- Stream and mix directly from YouTube
- Automatic genre, BPM, and musical key detection on every upload
- Per-category organization with cover art and metadata

### YouTube Integration
- Paste a YouTube URL to stream live and mix in real-time
- Import audio from YouTube into your permanent library
- Admin tools for managing shared YouTube imports

### Audio Analysis Engine
- Automatic spectral analysis on every uploaded track
- Genre detection across 22+ genre profiles
- BPM and musical key detection
- Reference track comparison for mastering-quality benchmarks

### Session History
- Track your progress over time with detailed session analytics
- A/B toggle counting to measure listening engagement
- Average EQ enhancement metrics per session

### Admin Panel
- User management and oversight
- Submission review and scoring
- Reference track management
- Class session creation for group learning

### Console Guide
- Built-in interactive documentation at `/docs/console-guide`
- Learn the EQ console, effects chain, and mixing workflow

---

## The Five Sliders

| Slider | Frequency | What it shapes |
|--------|-----------|----------------|
| **Low** | 100 Hz | Bass and sub-bass weight |
| **UNEQWURL** | 298 Hz | Low-mid warmth, kick/bass body, vocal chest tone |
| **Mid** | 1,000 Hz | Body and fullness -- vocals, snare, guitar warmth |
| **Gain** | 4,000 Hz | Presence and forward clarity |
| **High** | 8,000 Hz | Brightness, air, sparkle |

All sliders range from **-12 dB to +12 dB**. The UNEQWURL band steps in **0.5 dB** increments for precision.

---

## Tech Stack

- **Next.js 14** with TypeScript and Tailwind CSS
- **Web Audio API** for live EQ processing
- **PostgreSQL** database
- **Backblaze B2** for file storage
- **Express.js** processing service for audio analysis and YouTube handling

---

## Links

- [Live App](https://uneqwurl.vercel.app)
- [Console Guide](https://uneqwurl.vercel.app/docs/console-guide)
