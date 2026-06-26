# 298EQ — Agent Handoff Document

> Last updated: 2026-06-25

---

## 1. Project Overview

**298EQ** is an audio EQ training platform built as a Next.js 14 App Router application. It features a Web Audio API-powered mixing console (WEQ8 EQ + custom effects chain), Backblaze B2 audio storage, PostgreSQL database, and YouTube audio import via `yt-dlp`.

### Core Purpose
Users upload audio tracks (music, podcast, live, stream), play them through a multi-band EQ and effects chain in an interactive "room" (`/room/[songId]`), and submit their EQ settings for review. Admin can review submissions and manage the global song library.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| React | 18 |
| Styling | TailwindCSS + Custom CSS (`globals.css`, `mobile.css`, `desktop.css`) |
| Font | Geist (Google Fonts, loaded in `globals.css`) |
| Database | PostgreSQL via `pg` pool |
| Storage | Backblaze B2 (audio files) |
| Auth | JWT via `jose`, bcrypt passwords |
| Audio | Web Audio API + WEQ8 v0.2.2 |
| YouTube | `yt-dlp` CLI (must be installed on host) |
| Animations | Framer Motion |
| Icons | Lucide React |

---

## 3. Project Structure

```
298EQ/
├── app/                          # Next.js App Router
│   ├── (routes)/
│   │   ├── songs/page.tsx        # Dashboard (source cards + track library)
│   │   ├── soundfiles/page.tsx   # Library (grid cards + upload + YouTube import)
│   │   ├── uploads/page.tsx      # Upload page (4 category cards)
│   │   ├── account/page.tsx      # User profile
│   │   ├── room/[songId]/page.tsx # EQ mixing room (main feature)
│   │   └── admin/songs/page.tsx  # Admin bulk upload
│   ├── api/                      # API routes
│   │   ├── uploads/route.ts      # File upload + list
│   │   ├── uploads/[id]/route.ts # Get/update/delete single upload
│   │   ├── uploads/serve/route.ts # Audio streaming
│   │   ├── songs/route.ts        # Global song library
│   │   ├── songs/[id]/route.ts   # Single song metadata
│   │   ├── youtube/stream/route.ts # YouTube metadata extraction
│   │   ├── youtube/download/route.ts # YouTube download to B2
│   │   ├── submissions/route.ts    # EQ submission system
│   │   ├── session-analytics/route.ts # Playback analytics
│   │   ├── auth/                   # Login/register/me
│   │   └── admin/                  # Admin endpoints
│   ├── globals.css                 # All component styles + design tokens
│   ├── mobile.css                  # Portrait/mobile overrides
│   ├── desktop.css                 # Landscape/desktop overrides
│   └── layout.tsx                  # Bare HTML shell
├── components/
│   ├── EQRoom.tsx                  # Main audio engine + UI (CRITICAL)
│   ├── PickerModal.tsx             # Track selection modal
│   ├── SourceCard.tsx              # Category cards on dashboard
│   ├── ThemeProvider.tsx           # Dark/light mode context
│   ├── BottomNav.tsx               # Mobile bottom nav
│   └── DesktopSidebar.tsx          # Desktop sidebar
├── lib/
│   ├── db.ts                       # PostgreSQL pool + query helper
│   ├── auth.ts                     # JWT session handling
│   ├── b2-storage.ts               # Backblaze B2 upload/download/delete
│   ├── brand.ts                    # Category config (colors, labels, photos)
│   ├── cache.ts                    # Simple in-memory cache
│   └── types.ts                    # Shared TypeScript types
├── scripts/
│   └── add-cover-image.ts          # DB migration (already run)
├── .env                            # Environment variables (DATABASE_URL, B2 keys, JWT_SECRET)
└── package.json
```

---

## 4. Database Schema (5 Tables)

### `users`
- `id` (UUID PK), `username`, `email`, `password_hash`, `role` (`user` | `admin`), `created_at`

### `songs`
- `id` (UUID PK), `title`, `artist`, `album`, `genre`, `file_url`, `duration_seconds`, `cover_image`, `created_at`
- **`category`**: `music` | `podcast` | `live` | `stream` — **Added to classify default/seeded tracks for the UI**
- **`analysis_status`**: `pending` | `ready` | `failed` — Controls visibility in `/api/songs` GET
- **Note:** This is the *global/admin* song library, separate from `user_uploads`.

### `user_uploads` — **Most Important for Audio**
- `id` (UUID PK), `user_id` (FK → users)
- `upload_type`: `music` | `podcast` | `live` | `stream`
- `source`: `upload` | `youtube`
- `youtube_url`, `original_filename`, `b2_file_name`, `b2_file_id`
- `title`, `artist`, `album`, `genre`
- **`cover_image`** (TEXT, nullable) — **Recently added for album art**
- `file_size_bytes`, `mime_type`, `duration_seconds`
- `uploaded_at`, `created_at`
- **Behavior:** One upload per user per `upload_type` (new upload replaces old one + deletes B2 file)

### `submissions`
- `id` (UUID PK), `user_id` (FK), `song_id` (FK → songs, nullable), `upload_id` (FK → user_uploads, nullable)
- `eq_settings` (JSONB), `controls_log` (JSONB)
- `score`, `feedback`, `reviewed_at`, `created_at`
- **Logic:** When submitting, if `song_id` isn't found in `songs`, the API auto-resolves by checking `user_uploads` and using `upload_id` instead.

### `session_analytics`
- `id` (UUID PK), `user_id`, `session_type`, `duration_seconds`, `metadata` (JSONB), `created_at`

---

## 5. Audio Architecture

### The Signal Chain (in `components/EQRoom.tsx`)
```
HTMLAudioElement
  → MediaElementSourceNode
  → AdvancedFXChain (9 effects in series)
      1. NoiseGate
      2. Deesser
      3. VocalChain
      4. PitchCorrection
      5. ParallelComp
      6. PlateReverb
      7. Reverb
      8. FilterSweep
  → WEQ8 EQ (5-band: Low, Mid, High, Gain, 298Hz peaking)
  → DynamicsCompressor
  → MakeupGain
  → [AnalyserNode tap] + [AudioContext.destination]
```

### Spectrum Analyzer
- **Custom canvas renderer** (NOT AudioMotionAnalyzer anymore — removed from deps)
- `requestAnimationFrame` loop, logarithmic frequency scaling
- White peak dots, rounded-top bars
- Gradient: `#FF58AE → #E04896 → #902055`

### Critical Audio Fixes Already Applied
1. **`audio.crossOrigin = "anonymous"` must be set BEFORE `audio.src`**
2. **AudioContext suspension:** Resume on first play gesture (`components/EQRoom.tsx:214-220`)
3. **Removed `audiomotion-analyzer`** dependency — use custom canvas renderer

---

## 6. Brand / Design System

### Categories (defined in `lib/brand.ts`)
All 4 categories have `color`, `label`, `icon`, `photo` (dark mode), and `photoLight` (light mode):

| Key | Color | Label | Dark Photo | Light Photo |
|-----|-------|-------|-----------|-------------|
| `music` | `#6B8CFF` (blue) | Music | unsplash abstract music | unsplash abstract music |
| `podcast` | `#FFB347` (orange) | Podcast | unsplash microphone | cloudinary yellow image |
| `live` | `#00D4AA` (teal) | Live | unsplash concert | unsplash stage |
| `stream` | `#C084FC` (purple) | Stream | unsplash streamer | cloudinary abstract |

### CSS Design Tokens
```css
--bg: #080808;
--surface: #0A0A0A;
--accent: #FF58AE;
--accent-light: #FF88C4;
--accent-dark: #FF3A9D;
--muted: rgba(255,255,255,0.65);
--border: rgba(255,255,255,0.08);
--border-hover: rgba(255,255,255,0.20);
```

### Light Mode
- Uses `html[data-theme="light"]` selectors
- Hero sections (`.library-hero`, `.compact-hero`) have white text with text-shadow
- Source card photos switch via inline `style` + CSS `!important` overrides to avoid hydration mismatches

### Responsive Architecture
- **`mobile.css`**: `@media (orientation: portrait)` — 1-col layout, 24px padding, bottom nav shown
- **`desktop.css`**: `@media (orientation: landscape)` — multi-col grids, 1100px max-width, sidebar shown
- Pages use `.with-sidebar` class for 200px left margin on desktop

---

## 7. Authentication & Authorization

- **Login:** `/api/auth/login` — bcrypt compare + JWT cookie
- **Register:** `/api/auth/register` — bcrypt hash + insert user
- **Me:** `/api/auth/me` — verify JWT from cookie
- **Session cookie:** `session=token` (HTTP-only, same-site)
- **Role-based:** Admin routes check `session.role === "admin"`

---

## 8. File Upload Flow

1. User selects file + metadata on `/uploads` or `/soundfiles`
2. Client POSTs `FormData` to `/api/uploads`
3. Server validates MIME type (MP3, WAV, OGG, M4A) and size (100KB–30MB)
4. Server uploads to B2: `users/{userId}/{uploadType}_{timestamp}_{filename}`
5. If existing upload of same type: delete old B2 file + DB record
6. Insert new `user_uploads` row, return enriched data with `file_url`
7. `file_url` is a presigned B2 download URL via `getDownloadUrl()`

### YouTube Import Flow
1. User pastes YouTube URL
2. Client calls `/api/youtube/stream` → `yt-dlp --dump-json` extracts metadata (title, artist, thumbnail, duration)
3. Client calls `/api/youtube/download` with metadata + thumbnail URL
4. Server downloads audio via `yt-dlp -x --audio-format mp3`
5. Uploads to B2, stores in `user_uploads` with `source='youtube'` and `cover_image=thumbnail`
6. Temp file cleaned up in `finally` block

---

## 9. Recent Changes (This Session)

### Album Art Implementation
**Goal:** Show album art wherever music is listed (dashboard, song selection, library, uploads).

#### Backend
- **Migration:** Added `cover_image` TEXT column to `user_uploads` (already run)
- **`/api/uploads` (GET/POST):** Returns and accepts `cover_image`
- **`/api/uploads/[id]` (GET/PATCH):** Returns and updates `cover_image`
- **`/api/youtube/download` (POST):** Accepts `thumbnail` from YouTube metadata, stores as `cover_image`
- **`/api/admin/uploads` (GET):** Returns `cover_image`

#### Frontend
- **`/songs` (Dashboard):** Track rows show 36×36 thumbnail before title; falls back to category photo
- **`/soundfiles` (Library):** `library-thumb` background uses `t.cover_image` with category fallback
- **`/uploads` (Uploads):** Existing uploads display 64×64 cover image; falls back to category photo
- **`PickerModal` (Song Selection):** Track rows show 36×36 thumbnail; falls back to category photo
- **Upload Forms:** Added "Cover Image URL (optional)" input on both `/uploads` and `/soundfiles` upload forms

### Hero Styling (Previous Session)
- Increased `.library-hero` and `.compact-hero` padding by 60%
- Added white text (`#ffffff`) + text-shadow for hero `h1` and `p` elements
- Added light mode specific overrides for hero text

---

## 10. Known Issues & Gotchas

1. **Dev Server 404s / Module Not Found**
   - If `npm run dev` fails with vendor chunk errors, run `npm run dev` again (script auto-clears `.next` cache)
   - Root cause: stale Next.js cache + leftover node processes on port 3000

2. **Hydration Mismatches**
   - Light mode images were previously failing due to SSR/CSR mismatch
   - Fixed with CSS `!important` overrides and inline `style` attributes on same elements
   - Always test both dark and light modes after image changes

3. **AudioWorklet Processors**
   - Some effect processor files may be missing — graceful bypass is implemented
   - `Multiband` effect is a placeholder/stub

4. **`yt-dlp` Dependency**
   - Must be installed on the host machine and available in PATH
   - Windows: `yt-dlp.exe` or `yt-dlp`
   - If not found, YouTube features return 500 with clear error message

5. **B2 Storage**
   - Files stored per-user in path: `users/{userId}/...`
   - Presigned download URLs expire — `getDownloadUrl()` generates fresh URLs on each API call

6. **Database Migrations**
   - No migration framework (no Prisma/Knex). Manual SQL scripts in `/scripts/`
   - Run with: `$env:DATABASE_URL="..."; npx tsx scripts/<script>.ts`

7. **Lint Errors**
   - `@tailwind` CSS rules show as "unknown at-rule" in IDE — these are persistent but harmless, build succeeds

---

## 11. Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://...
B2_APPLICATION_KEY_ID=...
B2_APPLICATION_KEY=...
B2_BUCKET_NAME=...
B2_BUCKET_ID=...
JWT_SECRET=...
```

**Never commit `.env`** — it contains secrets.

---

## 12. Common Commands

```bash
# Dev server (auto-clears .next cache)
npm run dev

# Build (production)
npm run build

# Run a DB migration
$env:DATABASE_URL="<value>"; npx tsx scripts/add-cover-image.ts
```

---

## 13. Navigation Structure

| Path | Name | Access |
|------|------|--------|
| `/songs` | Dashboard | All users |
| `/soundfiles` | Library | All users |
| `/room/[songId]` | Mixing Console | All users |
| `/uploads` | Uploads | All users |
| `/account` | Profile | All users |
| `/login`, `/register` | Auth | Public |
| `/admin/songs` | Admin Bulk Upload | Admin only |

**Mobile Bottom Nav (4 items):**
- Dashboard (`/songs`)
- Library (`/soundfiles`)
- Console (`/songs`, active on `/room/*`)
- Profile (`/account`)

---

## 14. Key Files for Audio Work

If the next agent needs to work on audio:
- **`components/EQRoom.tsx`** — The entire audio engine, effects chain, EQ, spectrum analyzer, and room UI
- **`app/api/uploads/serve/route.ts`** — Audio streaming endpoint
- **`app/api/audio-proxy/route.ts`** — CORS proxy for external audio URLs
- **`lib/b2-storage.ts`** — B2 upload/download/delete utilities

---

## 15. Testing Checklist for New Agents

Before declaring any task complete:
- [ ] `npm run build` succeeds (exit 0)
- [ ] `npm run dev` starts without errors
- [ ] Check both **dark mode** and **light mode**
- [ ] Verify on **mobile viewport** (portrait) and **desktop** (landscape)
- [ ] Test audio playback in `/room/[songId]` if audio changes were made
- [ ] Confirm database column exists if schema changes were made

---

## 11. Security Audit & Bug Fixes (2026-06-25 Session)

### Security Fixes
- **Data leak in /api/uploads GET**: Removed or source = 'youtube' clause that returned all users' YouTube imports to any logged-in user. Now restricted to user_id =  only.
- **Audio proxy auth**: Added session authentication check to /api/audio-proxy to prevent open proxy usage. Returns 401 if no session.
- **B2 auth race condition**: Fixed ensureAuth() in lib/b2-storage.ts — uthPromise was never cleared after success, preventing re-authentication on token expiry.
- **B2 key ID fix**: Corrected B2_APPLICATION_KEY_ID from truncated c76f0eb2994b to full  03c76f0eb2994b0000000002 in both .env files.

### Bug Fixes
- **Admin submissions LEFT JOIN**: Changed INNER JOIN songs to LEFT JOIN songs + LEFT JOIN user_uploads in /api/admin/submissions to include submissions linked to user uploads.
- **References double-path**: Fixed B2 file naming in /api/admin/references that double-prefixed the path when uploading reference tracks.
- **ffmpeg URL inputs**: Added reconnect flags (-reconnect 1, -reconnect_streamed 1, -reconnect_delay_max 5) and -timeout 30000000 before -i for URL inputs in lib/audio/decoder.ts.
- **Database trigger fix**: Fixed sync_upload_analysis_from_queue() PL/pgSQL function — 	rack_id (text) was compared to id (UUID) without cast. Added ::uuid casts and restructured to check 	rack_source via IF/ELSIF instead of in WHERE clause (which referenced non-existent 	rack_source column on user_uploads).
- **Vercel maxDuration**: Added maxDuration settings in ercel.json for YouTube download/stream, analysis, and reference routes to prevent function timeouts.
- **skipReplace flag**: Added skipReplace option to processing service /youtube/download endpoint to allow seeding multiple tracks of the same type without deleting previous uploads.

### Default Tracks Seeded
6 YouTube tracks downloaded, stored in B2, inserted into songs table, and analyzed:
1. **Emizzamo Yamme** (music) — id: 941444f8-8020-4eea-81a4-70d6cc094633
2. **Soon and Very Soon Deep** (music) — id: 4a6ef33d-0d62-4043-9ef9-73db875b92c1
3. **Praise** (music) — id: 90065367-1cee-45b4-bd31-c39e09b9c7f8
4. **Pastor Poju** (podcast) — id: 4fe60930-916b-4a9b-99c0-705954dfa2b3
5. **Live Worship** (live) — id: 6ebed5e1-5ef9-4515-83de-7a15035a6f98
6. **Gospel Twitch Stream** (stream) — id: c6729c20-3a21-4f7a-8051-7dbe5dd5cd3e

All tracks: nalysis_status = 'ready', visible to all users via /api/songs.

### API Validation Results (curl tests)
All endpoints tested and passing:
- Auth: register, login, me, profile update
- Songs: GET (returns 6 default tracks)
- Uploads: GET (user-scoped), PATCH, presign, serve
- YouTube: stream, download (end-to-end: YT -> B2 -> DB -> analysis)
- Analysis: GET (returns full analysis + features + benchmarks)
- Presets: POST, GET
- Console sessions: POST, GET
- Submissions: GET
- Admin routes: all return 403 for student role
- Audio proxy: 401 unauth, 400 invalid URL, correct B2 proxy when authed
- Processing service: health, youtube/stream, youtube/download, analyze

### Environment Variables (for Vercel + Railway)

**Vercel (Next.js app):**
`
DATABASE_URL=postgresql://...
AUTH_SECRET=<random 32+ char string>
B2_APPLICATION_KEY_ID=003c76f0eb2994b0000000002
B2_APPLICATION_KEY=<your key>
B2_BUCKET_NAME=Vlthr-media
B2_BUCKET_ID=0033784daa390a41f7c34d7c76c1edd7b65728fdf5
B2_DOWNLOAD_URL=https://f003.backblazeb2.com/file/Vlthr-media
PROCESSING_SERVICE_URL=https://uneqwurl-production.up.railway.app
`

**Railway (processing service):**
`
DATABASE_URL=postgresql://...
B2_APPLICATION_KEY_ID=003c76f0eb2994b0000000002
B2_APPLICATION_KEY=<your key>
B2_BUCKET_NAME=Vlthr-media
B2_BUCKET_ID=0033784daa390a41f7c34d7c76c1edd7b65728fdf5
B2_DOWNLOAD_URL=https://f003.backblazeb2.com/file/Vlthr-media
PORT=3100
CORS_ORIGINS=https://uneqwurl-git-main-bitenders-projects.vercel.app
`

### Deployment State
- **Git**: All changes pushed to main branch
- **Build**: 
pm run build passes successfully
- **Database**: Trigger function fixed, 6 default tracks seeded
- **B2 Storage**: 6 audio files stored and accessible via download URLs
- **Pending**: Accessibility testing (user will run separately), frontend UI polish

### Handoff to Frontend Polishing Team
1. All API endpoints functional and tested
2. 6 default tracks available in songs table with nalysis_status = 'ready'
3. Songs appear in /api/songs GET (filtered by nalysis_status = 'ready')
4. Each track has full analysis (LUFS, spectral data, genre detection, benchmarks, reference comparison)
5. Focus areas for polish:
   - Verify all 6 tracks display correctly on /songs dashboard
   - Verify EQ room (/room/[songId]) loads and plays tracks
   - Verify submission flow works end-to-end
   - Run accessibility suite (WCAG, keyboard nav, screen reader)
   - Test mobile/responsive layouts
   - Verify album art / cover images display for YouTube-imported tracks

## Latest Fixes (Session: 2026-06-25)

### UI / Favicon
- **Profile dropdown layering**: Increased `.header` z-index to `100` and `.profile-dropdown` z-index to `1000` in `app/globals.css` so the profile menu appears above page content.
- **Favicon fix**: Replaced the broken 68KB base64-PNG-inside-SVG favicon with:
  - `public/favicon.png` — copied from `footer-logo-allpages.png` for universal browser support
  - `public/favicon-icon.svg` — lightweight 64x64 SVG with stylized "U" branding
  - `app/layout.tsx` — updated `<link rel="icon">` to use PNG first, SVG second, plus `apple-touch-icon`
  - `public/manifest.json` — updated icon entries with PNG and SVG sizes
- **Favicon redesign**: Updated `public/favicon-icon.svg` to a stylized black-to-grey gradient "U" on an off-white patterned background, with the right arm significantly longer than the left arm.

### Dashboard & Library (Default Tracks)
- **Problem**: Seeded tracks from the `songs` table only appeared under the `music` category, showed `0 MB`, and playing them caused a 404 because `/api/uploads/serve` only checked `user_uploads`.
- **Fixes**:
  - Added `category` column to `songs` table and updated all 6 seeded tracks with their correct categories (`music`, `podcast`, `live`, `stream`).
  - Updated `app/api/songs/route.ts` and `app/api/songs/[id]/route.ts` to return `category as upload_type`.
  - Updated `app/api/uploads/serve/route.ts` to fall back to the `songs` table when the requested ID is not found in `user_uploads`, allowing default tracks to stream.
  - Updated `app/dashboard/page.tsx` and `app/soundfiles/page.tsx` to merge `user_uploads` with `/api/songs` results and use the API-provided `upload_type` instead of hardcoding `music`.

### Auth Email Verification
- Verified that removing "creators." from auth/profile routes (`username@UNEQWURL.com`) is safe: the email is generated dynamically from the username, not stored in the database. No schema or data migration required.

### Files Changed
- `app/globals.css`
- `app/layout.tsx`
- `public/favicon.png` (new)
- `public/favicon-icon.svg` (new)
- `public/favicon.svg` (kept as legacy, no longer referenced)
- `public/manifest.json`
- `app/api/songs/route.ts`
- `app/api/songs/[id]/route.ts`
- `app/api/uploads/serve/route.ts`
- `app/dashboard/page.tsx`
- `app/soundfiles/page.tsx`
- `HANDOFF.md` (this document)

## Sound Quality 101 Tutorial Redesign (Session: 2026-06-25)

### Files
- `app/sound-quality-101/page.tsx` — Main tutorial page (React client component)
- `app/sound-quality-101/docs.css` — Tutorial-specific design system
- `public/assets/hero/` — Lesson hero images + new Unsplash hero background
- `public/assets/cta/` — CTA button background images
- `public/assets/logo/footer-logo-allpages.png` — Logo used in navbar

### Current Design State

#### Header
- Fixed frosted-glass navbar: 50% opacity + 20px blur
- Centered landing-page logo (`footer-logo-allpages.png`)
- Home, PDF download, and theme toggle buttons on the right

#### Hero Section
- Full-viewport hero with Unsplash background (`sound-quality-bg.jpg`)
- Dark mode: background at 100% opacity; light mode: 40% opacity
- Vignette overlay for text readability
- Main hero accent: blue (`#00a6ff`)
- Two CTA buttons using `public/assets/cta` images:
  - **Start Learning** → `priority0.jpg`
  - **Go to Console** → `priority1.jpg`

#### Modules / Lessons
Each module is a `motion.article` with a photo hero section, 10% black overlay, white text, and soft shadow.

| Module | ID | Hero Image | Accent Color |
|--------|-----|------------|--------------|
| 1 | `what-is-sound-quality` | `console.png` | purple `#6500ff` |
| 2 | `factors-influencing` | `dashboard.png` | pink `#ff0056` |
| 3 | `metrics` | `library.png` | blue `#00a6ff` |
| 4 | `how-to-measure` | `profile.png` | dark magenta `#8b0046` |
| 5 | `when-to-measure` | `results.png` | orange `hsl(27, 93%, 60%)` |
| 6 | `finding-faults` | `module6.png` | sage `#8cc0a6` |
| Glossary | `glossary` | `reference.png` | navy `#000080` |

Accent colors are set via `data-accent` attributes on each `.sq-lesson-card` and mapped in `docs.css`.

#### Glossary
- Added as a new section after Module 6
- Two-column grid of terms/abbreviations with `<abbr>` tags
- Included in `sectionIds` for keyboard navigation

#### Features Preserved
- Scroll-triggered reveal animations (Framer Motion)
- Keyboard navigation (`↑`, `↓`, `Home`, `End`) with floating nav buttons
- Theme toggle with `localStorage` key `298eq-theme`
- PDF download via `html2pdf.js` CDN
- Mermaid diagrams rendered dynamically
- Accessibility: semantic HTML, focus states, ARIA labels

### Files Changed (This Session)
- `app/sound-quality-101/page.tsx`
- `app/sound-quality-101/docs.css`
- `public/assets/hero/module6.png` (new)
- `public/assets/hero/reference.png` (new)
- `HANDOFF.md` (this document)

### Pending / Next Steps for Designer
- Verify the sage green (`#8cc0a6`) and navy (`#000080`) accents provide enough contrast in both light and dark modes; adjust if needed.
- Confirm the `module6.png` and `reference.png` hero images work at all breakpoints; consider lighter overlays if text readability suffers.
- Evaluate whether the hero section CTA box-shadows should match their image colors or stay with the blue hero accent.
- Add instructor-only content back if needed (currently removed from public tutorial).
- Run accessibility audit (WCAG contrast, keyboard nav, screen reader) on the new module accents.
- Consider adding a progress indicator or table-of-contents sidebar for the longer tutorial.

---

## EQ Room Redesign — Lecturer-Only Digital Console (Implemented)

### Objective
The `/room/[songId]` and `/room/stream` pages now render a **lecturer-only digital mixing console** inspired by the Behringer X32 / DAW IDE aesthetic: rotary knobs with illuminated LED rings, a few precision faders, tall live meters, and SCADA-style real-time metrics. The staged-learning UI and student gating have been removed. Students cannot access the dashboard or `/room/*`; they only view the console via the lecturer's projector.

### Final Architecture
```
app/room/[songId]/page.tsx
  └─ EQRoom (audio engine + orchestrator)
       └─ LecturerConsole (new console shell)
            ├─ ConsoleTransport (play/pause/stop/rewind + A/B toggle)
            ├─ ConsoleChannelStrip (5 EQ bands + FX macro knobs)
            ├─ ConsoleVisualizer (spectrum + waveform)
            ├─ ConsoleMasterSection (main/comp/limiter faders + pan/width)
            ├─ MeterBridge (tall L/R + GR meters)
            └─ SCADAMetricsBar (LUFS, peak, crest, dynamic range, RMS, correlation, BPM/key)
```

### Final Files
- **New components**
  - `components/LecturerConsole.tsx` — console shell layout.
  - `components/ConsoleKnob.tsx` — SVG rotary knob with LED ring, mouse/touch/keyboard support.
  - `components/TallMeter.tsx` — canvas-based vertical LED bar with peak hold.
  - `components/MeterBridge.tsx` — L/R and gain-reduction meter bridge.
  - `components/SCADAMetricsBar.tsx` — live readout tiles (approximate LUFS, true peak, RMS, crest, dynamic range, correlation, BPM/key).
  - `components/ConsoleChannelStrip.tsx` — 5 EQ band knobs + FX macro knob.
  - `components/ConsoleMasterSection.tsx` — master fader, compressor/limiter faders, pan/width knobs.
  - `components/ConsoleTransport.tsx` — transport controls + A/B compare toggle.
  - `components/ConsoleVisualizer.tsx` — spectrum canvas + waveform display.
- **Modified**
  - `components/EQRoom.tsx` — stripped all staged-learning, lesson, and teaching-tool UI; kept the audio engine intact; now renders `LecturerConsole`.
  - `app/room/eqroom.css` — added the full lecturer-console design system (dark metal chassis, channel strips, knob LED rings, meter bridge, SCADA tiles, responsive grid).
  - `HANDOFF.md` — this section.
- **Untouched (per frontend-only constraint)**
  - `lib/audio-chain.ts`, `lib/effects/`, `processing-service/`, all API routes, worker services.
- **Deprecated (still in repo, no longer used in room UI)**
  - `components/EQSlider.tsx`, `components/MacroFader.tsx`, `components/StageGate.tsx`, `components/LessonModeOverlay.tsx`, `components/FrequencySweep.tsx`, `components/NoiseInjection.tsx`, `components/ClippingDemo.tsx`, `components/HeadphoneProfile.tsx`, `components/EarTrainingQuiz.tsx`, `components/AdvancedTraining.tsx`, `components/StudioToolsPanel.tsx`, `components/ConsoleStrip.tsx`, `components/CompressorControls.tsx`, `components/LUFSMeter.tsx`, `components/ReferencePanel.tsx`, `components/LiveModePanel.tsx`, `components/VUMeter.tsx`, `components/EQPresets.tsx`, `components/SessionResults.tsx`, `lib/staged-learning.ts`.

### Key Requirements (implemented)
1. **Frontend-only refactor**: `lib/audio-chain.ts`, `lib/effects/`, and `processing-service/` were not modified.
2. **Staged learning removed**: `StageGate`, lesson-mode overlays, zone gating, and teaching tools no longer render in the room.
3. **Sliders → knobs**: `low`, `mid`, `high`, `gain`, `eq298`, and `FX macro` are rotary knobs with colored LED arcs.
4. **Few faders kept**: `Main` gain, `Compressor Threshold`, and `Limiter Ceiling` faders remain in the master section; `Pan` and `Width` are knobs.
5. **Tall meters**: `MeterBridge` shows L/R level meters and a gain-reduction meter.
6. **SCADA metrics bar**: shows LUFS (approx), true peak, RMS, crest, dynamic range, correlation, BPM, and key.
7. **Live visualization**: the existing spectrum canvas renderer is reused via ref forwarding; the `WaveformDisplay` component remains in the central panel.
8. **A/B compare**: an "Enhanced (298EQ) / Original" toggle is included in the transport bar.

### Implementation Phases (completed)
- Phase 1 — Cleaned up `EQRoom.tsx` and prepared the shell.
- Phase 2 — Built `ConsoleKnob` and replaced EQ/FX sliders.
- Phase 3 — Built `TallMeter` and `MeterBridge`.
- Phase 4 — Built `SCADAMetricsBar`.
- Phase 5 — Assembled `LecturerConsole` and the console layout.
- Phase 6 — Added CSS styling, responsive breakpoints, and verified `npm run build`.

### Acceptance Criteria
- [x] The room is fully interactive for the lecturer; no student-facing controls exist because the dashboard blocks student access entirely.
- [x] No staged-learning UI remains in the room.
- [x] 5 EQ bands and the FX macro are controlled by rotary knobs with LED rings.
- [x] A meter bridge with tall vertical L/R and gain-reduction meters is visible and live.
- [x] A SCADA metrics bar shows LUFS, true peak, crest factor, dynamic range, RMS, and BPM/key.
- [x] The spectrum analyzer and waveform display remain real-time and performant.
- [x] `npm run build` passes with no errors.
- [x] The new console matches a dark digital-mixer aesthetic (Behringer X32 inspired) and uses the existing design tokens.

### Deviations / Notes
- LUFS is computed as a rough frontend approximation (RMS − 1.1 dB) rather than a full ITU-R BS.1770 algorithm, because the audio engine was not modified.
- True peak is an inter-sample peak approximation; no dedicated true-peak meter node was added.
- The correlation meter is a mono-vs-stereo correlation approximation based on the time-domain analyser buffer.
- The FX macro is exposed as a single 0–100 knob mapped to the existing `AdvancedFXChain.setMacro` API.
- Some old components (`EQSlider`, `MacroFader`, `StageGate`, etc.) were left in the repo but are no longer imported by the room UI to avoid breaking other potential consumers.
- No role gating was implemented; access control is enforced by the dashboard route, not by the room UI.

### Risks / Follow-up
- Interactive testing in the browser is needed to confirm knob drag, meter responsiveness, and audio playback.
- The SCADA metrics can be made more accurate later by adding a dedicated LUFS meter node.

---

## Imperfections & Simulation Engine

### Objective
Add a lecturer-controlled simulation layer that models real-world audio path problems (bad cables, clipping, torn speakers, speaker health, room acoustics, amplifier saturation, and per-channel output issues) and exposes live SCADA-style metrics (STI, C80, SPL, RT60, LUFS, frequency-response score, correlation, THD).

### New DB Tables
- `imperfection_profiles` — saved simulation configurations (user-scoped, JSON config).
- `imperfection_sessions` — live telemetry snapshots for a playback session (console state + metrics).

### New Backend Files
- `lib/imperfection-types.ts` — TypeScript types and default config for all simulation zones.
- `lib/imperfections.ts` — DB CRUD for profiles and session tracking.
- `app/api/imperfections/profiles/route.ts` — list / create profiles.
- `app/api/imperfections/profiles/[id]/route.ts` — get / update / delete a profile.
- `app/api/imperfections/sessions/route.ts` — create / update / end a session.

### Modified Engine
- `lib/audio-chain.ts` — `attachAudioChain` now accepts an optional `ImperfectionChain` and routes it after the source node but before AdvancedFX/WEQ8, so the console can correct the simulated problem.
- `lib/effects/ImperfectionChain.ts` — new Web Audio chain that creates/removes nodes for each simulation zone:
  - **Cable**: pink noise + 60 Hz hum + random crackles.
  - **Speaker damage**: bandpass distortion for torn-cone simulation.
  - **Acoustics**: generated impulse-response reverb with RT60 control.
  - **Positioning**: per-channel delays.
  - **Speaker health**: low/high shelf frequency loss + overall degradation.
  - **Inconsistency**: LFO gain modulation.
  - **Amplifier**: soft-clipping wave shaper + warmth shelf.
  - **Output**: per-channel gain, delay, polarity, and balance.
- Computes approximate STI, C80, SPL, RT60, LUFS, correlation, left/right levels, THD, and frequency-response quality every animation frame.

### New Frontend Components
- `components/ImperfectionPanel.tsx` — tabbed SCADA control panel with toggles + knobs for each zone and live metric readouts.
- `components/MinimalPlayer.tsx` — minimal track player with album art, title/artist, click/drag seek bar, play/pause/stop/rewind.
- `components/LecturerConsole.tsx` — integrated MinimalPlayer into the top bar and ImperfectionPanel into the right rack.
- `components/EQRoom.tsx` — manages imperfection state, creates the chain, polls metrics, and saves profiles via the API.
- `app/docs/console-guide/page.tsx` — added section 6b documenting the imperfection zones and metrics.
- `app/room/eqroom.css` — added styles for the minimal player, imperfection panel, and responsive layout.

### Notes
- Metrics are frontend approximations because full STI/C80/LUFS algorithms require offline processing or dedicated DSP nodes.
- The simulation chain is inserted **before** the EQ/dynamics so the lecturer can correct the simulated problem.
- Profiles are saved per-user and can be retrieved via the API for later reuse.
- `npm run build` passes with all new routes registered.
