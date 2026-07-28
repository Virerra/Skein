# Skein

A personal knowledge graph: paste chat transcripts, extract atomic
claims, and let contradictory claims chain into correction history
instead of overwriting each other.

This is a **first vertical slice**, not the full system from the
brief. It proves the pipeline end to end with the simplest thing that
could work at each stage — several pieces are naive on purpose, see
"What's naive on purpose" below.

## Running it

```bash
npm install
npm run dev
```

You'll need an Anthropic API key (BYOK — entered in the app, kept in
memory only, never persisted or sent anywhere but api.anthropic.com).

## What's here

- `src/lib/db.js` — IndexedDB storage. One `claims` object store.
- `src/lib/extraction.js` — calls Claude directly from the browser to
  pull atomic claims out of a pasted transcript.
- `src/lib/graphModel.js` — conflict detection + chain building.
- `src/lib/query.js` — retrieval for the query bar.
- `src/components/` — app-specific UI (ingest form, graph canvas,
  thread/chain detail panel).
- `src/design/` — components and tokens pulled directly from the
  Claude Design system export (`Skein_Design_System.zip`), unmodified.

## What's naive on purpose

- **Conflict detection** (`graphModel.js`) is same-topic-label,
  different-text. It'll misfire on any topic that legitimately holds
  multiple simultaneous active claims. Replace with real similarity
  scoring + an LLM judgment call once this starts mattering.
- **Retrieval** (`query.js`) is keyword overlap, not embeddings. Fine
  for proving the "walk the chain" UX, not real RAG yet.
- **Extraction** always goes to the Anthropic API (BYOK). The brief's
  default-to-local-model plan (WebLLM) is still the target, but it
  needs `Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy`
  response headers for multithreaded WASM, and GitHub Pages can't set
  custom headers. Needs either a single-threaded WebLLM fallback or a
  different static host before that path is real.

## Deploying

`vite.config.js` sets `base: '/skein/'` for a GitHub Pages project
site — update it if you name the repo something else. A GitHub Actions
workflow (`.github/workflows/deploy.yml`) builds and deploys `dist/`
to Pages on every push to `main`; enable Pages → GitHub Actions as the
source in the repo settings once it's pushed.
