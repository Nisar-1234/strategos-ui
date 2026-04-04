# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## WARNING: This is NOT the Next.js you know

This project uses **Next.js 16** with **React 19**. APIs, conventions, and file structure differ from earlier versions. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. Do not assume behavior from training data.

---

## Commands

```bash
npm install
npm run dev          # dev server on :3000
npm run build        # production build — must pass before deploying
npm run lint         # ESLint
npm run test         # vitest single run
npm run test:watch   # vitest watch mode

# Run a single test file
npx vitest run src/__tests__/components/kpi-card.test.tsx
# Run tests matching a pattern
npx vitest run -t "renders"
```

---

## Architecture

### Routing

App Router with a route group `(app)/` that applies `AppShell` layout (220px fixed sidebar + main content area). All protected pages live under `src/app/(app)/`.

```
src/app/
├── layout.tsx                  Root layout (DM Sans + DM Mono fonts, CSS vars)
├── page.tsx                    Redirects to /dashboard
└── (app)/
    ├── layout.tsx              Wraps children in AppShell
    ├── dashboard/page.tsx
    ├── predictions/page.tsx
    ├── signals/
    │   ├── monitor/page.tsx    Signal feed + layer distribution
    │   ├── command/page.tsx
    │   └── markets/page.tsx
    ├── analysis/
    │   ├── ai-chat/page.tsx    Chat with Claude via /api/v1/chat
    │   ├── game-theory/page.tsx
    │   └── trend-analysis/page.tsx
    ├── live/
    │   ├── map/page.tsx
    │   └── news/page.tsx
    └── config/
        ├── api-keys/page.tsx
        ├── data-sources/page.tsx
        ├── llm-settings/page.tsx
        ├── settings/page.tsx
        └── skills/page.tsx
```

### Data fetching pattern

All pages are `"use client"` and use `useApiData` hook from `src/hooks/use-api-data.ts`:

```typescript
const { data, live, loading, refresh } = useApiData({
  fetcher: () => api.signals({ limit: 100 }),
  fallback: [] as ApiSignal[],
  pollInterval: 30_000,   // 0 = no polling
});
```

`live` is `true` when data came from the real API; pages show a LIVE/CONNECTING badge based on this.
When the API is unreachable, `fallback` is used (pages remain functional with mock-like state).

### API client

`src/lib/api.ts` exports:
- `api` object — all API calls (typed return values)
- `apiFetch<T>` — base fetch wrapper, throws on non-2xx
- `mapApiSignal` — transforms `ApiSignal` → enriched signal with `layerName`, `badgeClass`, `timeAgo`, etc.
- `LAYER_META` (internal) — display metadata for L1–L10

`NEXT_PUBLIC_API_URL` env var sets the API base URL. Falls back to `http://localhost:8000` in dev, empty string in production — which breaks all API calls. **This var is baked into the bundle at build time.** `.env.production.local` (gitignored) holds it for local builds:

```
NEXT_PUBLIC_API_URL=https://5yv5gp1p12.execute-api.us-east-1.amazonaws.com
```

`/api/v1/health` returns `layers` keyed exactly as stored in DB: `L1`, `L2` … `L10`. Do not use human-readable names like `L1_editorial` when looking up health layer status.

### Export system

`src/lib/export/` — generates downloadable files client-side only.

```
types.ts      ExportPayload + ExportTable interfaces
index.ts      exportData(payload, format) dispatcher — dynamic imports per format
excel.ts      SheetJS (xlsx) — summary + per-table sheets
pdf.ts        jsPDF + jspdf-autotable — landscape A4, branded header
pptx.ts       pptxgenjs — title + stats + table slides
csv.ts        RFC-compliant CSV with stats header block
text.ts       exportMarkdown() + exportTxt() — padded tables
```

**useMemo TDZ rule**: In `"use client"` components, `const` declarations using `useMemo` are subject to JavaScript's Temporal Dead Zone during SSR. If a `useMemo` factory references another `const` that is declared later in the same component body, it causes `ReferenceError: Cannot access '...' before initialization` at build time. **Always declare referenced variables before the useMemos that use them.**

**SSR critical**: `xlsx`, `jspdf`, and `pptxgenjs` use browser globals. Never import them at module level. Always load via `ExportButtonClient` which uses `next/dynamic` with `ssr: false`:

```typescript
// In pages, always import from ExportButtonClient (not ExportButton directly):
import { ExportButton } from "@/components/export/ExportButtonClient";
import type { ExportPayload } from "@/lib/export/types";
```

This project uses **Turbopack** — `/* webpackIgnore: true */` comments have **no effect**. Do not add them.

### Design system — non-negotiable

- **Zero emoji** everywhere — UI, error states, empty states, AI responses
- **Zero shadows** — depth via background color (`bg-surface` vs `bg-card`) and border contrast only
- **Icons:** `@heroicons/react/24/outline` only — no Lucide, no filled variants
- **Fonts:** DM Sans (all text), DM Mono (IDs, scores, timestamps)
- **Spacing:** 8px grid
- **Border radius:** `rounded-[10px]` cards / `rounded` badges (6px) / `rounded-sm` code (4px)
- **Colors:** `text-navy` (`#0F172A`), `text-brand` / `bg-brand` (`#1B4FD8`), plus `text-muted`, `bg-surface`, `bg-card`, `border-border` — all CSS vars defined in `app/layout.tsx`

### State management

**Zustand** for global conflict context and layer toggles. **Socket.IO client** for real-time signal pushes from the backend (Redis pub/sub keyed by `conflict_id`).

---

## Deployment

**Amplify (manual zip deploy)** — Amplify app is `WEB` platform (static hosting, not SSR). NOT git-connected. Branch is `main`. `next.config.ts` has `output: "export"` and `trailingSlash: true` which are required.

Deploy process:

```bash
npm run build   # generates out/ directory (static HTML)

# Zip with forward slashes (MUST use Node/JSZip — PowerShell Compress-Archive
# creates backslash paths that Amplify's Linux servers can't resolve)
node -e "
const JSZip = require('jszip'), fs = require('fs'), path = require('path');
const zip = new JSZip();
function addDir(d, zp) {
  for (const e of fs.readdirSync(d)) {
    const full = path.join(d, e), p = zp ? zp+'/'+e : e;
    fs.statSync(full).isDirectory() ? addDir(full, p) : zip.file(p, fs.readFileSync(full));
  }
}
addDir('./out', '');
zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}).then(b=>{fs.writeFileSync('deploy.zip',b);console.log('done',b.length);});
"

# create-deployment must be called ONCE — parse both jobId and zipUploadUrl from one call
RESULT=$(MSYS_NO_PATHCONV=1 aws amplify create-deployment --app-id drvv157cwdx9a --branch-name main --region us-east-1 --output json)
JOB=$(echo $RESULT | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).jobId))")
URL=$(echo $RESULT | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).zipUploadUrl))")
curl -X PUT -T deploy.zip "$URL"
MSYS_NO_PATHCONV=1 aws amplify start-deployment --app-id drvv157cwdx9a --branch-name main --job-id $JOB --region us-east-1

# If a deployment is stuck as PENDING, cancel it first:
# MSYS_NO_PATHCONV=1 aws amplify stop-job --app-id drvv157cwdx9a --branch-name main --job-id <id> --region us-east-1
```

Required Amplify env var: `NEXT_PUBLIC_API_URL=https://5yv5gp1p12.execute-api.us-east-1.amazonaws.com`

---

## Tests

Vitest + React Testing Library. Tests live in `src/__tests__/`. Setup file: `src/__tests__/setup.ts` (imports `@testing-library/jest-dom`). Test environment: `happy-dom`.

Components are tested by rendering with mock props and asserting on rendered output. No network calls in tests — `apiFetch` should be mocked via `vi.mock`.
