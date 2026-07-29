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

Open Settings (gear icon) to configure a model provider before your
first extraction — see "Model providers" below. Then use "Add
transcript" to paste a chat transcript and extract claims from it.

## What's here

- `src/lib/db.js` — IndexedDB storage. One `claims` object store.
- `src/lib/extraction.js` — dispatcher that routes to whichever
  provider is configured in Settings; shares one claim-shaping step
  (id/timestamp/status) across all of them.
- `src/lib/providers/` — `anthropic.js`, `openaiCompatible.js` (also
  covers local models), `webllm.js` (experimental). See "Model
  providers" below.
- `src/lib/settings.js` — localStorage-backed provider/model/theme
  settings. The API key itself is never stored here — see "Model
  providers".
- `src/lib/graphModel.js` — conflict detection + chain building.
- `src/lib/query.js` — retrieval for the query bar.
- `src/lib/topicColor.js` — deterministic, collision-checked topic →
  hue assignment; theme-aware (see "Visual identity").
- `src/components/` — app-specific UI: `IngestPanel`/`TranscriptEditor`
  (ingest modal), `SettingsPanel` (provider + theme config),
  `GraphCanvas` (the graph itself), `ThreadPanel` (chain detail, claim
  edit/discard controls).
- `src/design/` — components and tokens originally pulled from the
  Claude Design system export (`Skein_Design_System.zip`). The
  neumorphic soft-shadow treatment from that export was mostly
  replaced with flat chrome, then brought back deliberately for
  buttons and cluster-filter rows only — see "Visual identity".

## Model providers

Settings (gear icon) lets you pick how extraction runs:

- **Anthropic (BYOK)** — your own Anthropic API key.
- **OpenAI-compatible (BYOK or local model)** — one adapter that
  covers OpenAI itself, Gemini's OpenAI-compatible endpoint, *and* any
  locally-running server that speaks the same shape (Ollama, LM
  Studio, vLLM, etc.) — point the base URL at your own server instead
  of a hosted one, no key required if your server doesn't need one.
- **WebLLM (free, in-browser, experimental)** — runs a small model
  entirely in your browser via WebGPU, no key, no server. Marked
  experimental because it needs the page to be cross-origin isolated
  (`Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` response
  headers) for reliable multi-threaded performance, and GitHub Pages
  can't set custom headers. Settings shows a live readout of whether
  your browser/host actually supports it before you rely on it.

Whichever provider you pick, the API key (if any) is kept in memory
only for the session — never written to localStorage or IndexedDB.
Only the non-secret choice of provider/model/base-URL/theme persists.

## Visual identity

The graph (`src/components/GraphCanvas.jsx`) is a hand-rolled
force-directed layout and SVG renderer, not Cytoscape (removed —
it's what dropped the production bundle from ~640KB to ~210KB).
Claims cluster spatially by **topic**, not by supersession: every pair
of same-topic claims gets a mild attractive spring in the physics sim.
There's no drawn line for supersession — conflict detection only ever
chains a claim against another claim in the *same* topic (see
`applyNewClaims` in `graphModel.js`), so a correction and what it
supersedes are always already pulled into the same cluster; a
dedicated edge would have been redundant, and a literal edge per
same-topic pair doesn't scale (a 5-claim topic is 10 lines as a
complete graph). History is read on the node instead: correction
status gets a thin bronze ring, superseded claims sink flush and flat
and shrink slightly — no separate "here's what came before" visual on
the node itself; click it, or query it, and the full chain is in
`ThreadPanel`.

Each topic's cluster is shown as a soft blob, not one circle sized to
its farthest node (an earlier version did that; it read as a shape
snapping bigger or smaller rather than actually following the
cluster). It's a proper metaball effect instead: one small blurred
circle per node in the topic, fed through a shared filter that pushes
blurred alpha through a steep threshold, so overlapping or nearby
circles fuse into one continuous shape while isolated edges fade out
below the threshold. The blob traces whatever shape the cluster
actually is — stretches, bends, branches — rather than approximating
it with one piece of geometry, and it eases (`cx`/`cy` transition on
each node-circle) rather than snapping when the layout resettles or a
node gets dragged. Neumorphism is scoped to the graph's knots, buttons,
and cluster-filter rows (raised at rest / pressed-in when active) —
everything else (cards, inputs, panels) stays flat.

Dark is the default theme; light is available from Settings. Both
share the same token names (`src/styles/colors.css`) — light mode
overrides the token *values*, not the components, via
`:root[data-theme="light"]`.

## Node editing

Selecting a claim's chain in the right-hand panel (`ThreadPanel`)
exposes **edit** (rewrite the text, or change its topic to
recategorize it) and **discard** per claim. Discard is a soft delete —
it sets `status: "discarded"`, which hides the claim from the graph,
cluster filter, and query results, but the row stays in IndexedDB and
still renders in a chain's history (tagged `[DISCARDED]`) if it was a
link in one. Deliberate: "nothing is ever deleted or overwritten" is
the product's whole premise, so true destructive delete isn't offered.

## Graph interactions

- **Zoom/pan** — scroll to zoom (toward the cursor), drag empty canvas
  space to pan, +/−/reset buttons bottom-right for discoverability.
  Dragging a node still repositions it; that's unaffected.
- **Categorize** (sidebar, next to the Clusters header) — sends every
  active claim's text to the model and asks it to assign a consistent
  topic label across the whole set, consolidating near-duplicates that
  arose from claims being extracted from different transcripts in
  isolation (`lib/categorize.js`). Naive first pass: one request, no
  batching -- fine at personal-tool scale, would need chunking beyond
  that. Reliability on WebLLM's small on-device models is meaningfully
  worse than on BYOK: extraction only has to read one transcript at a
  time, but categorize has to hold every claim in mind at once and stay
  consistent across the whole output, a much heavier ask for a 1-3B
  parameter model. `max_tokens` is set explicitly now (was previously
  unset and could truncate a response whose length scales with claim
  count), but that fixes a truncation *bug*, not the underlying
  capability gap -- if categorize keeps struggling on WebLLM, switching
  providers in Settings just for that action is the practical answer,
  not a prompt tweak.
- **Suggest relations** (button above the graph, next to Make
  relations) — the AI counterpart to manual connecting: sends every
  active claim to the model and asks specifically for connections that
  cross topic boundaries (same-topic relatedness is already what the
  halo shows, so that's excluded both by prompt and by a client-side
  filter as a backstop). Conservative by design -- the prompt asks for
  only clear connections, not exhaustive pairwise correlation, since
  suggestions are additive to the graph and easier to want more of than
  to clean up (`lib/relate.js`).
- **Make relations** (button above the graph) — the manual counterpart:
  arms a connect mode, click a node, click another, and a
  manually-declared relation is drawn between them, independent of
  topic or supersession. The first node stays armed so you can connect
  it to several others in a row; click it again to disarm. Click an
  existing relation line to delete it. Both paths write to the same
  store (IndexedDB `relations`, `lib/db.js`) as `{a, b}` pairs, rendered
  as thin dashed neutral-colored lines, deliberately not gold or
  topic-colored, so a connection never reads as a status or category
  signal.

Earlier versions of the graph drew a literal edge from a claim to
whatever it superseded. That's gone -- clustering is by topic now (see
"Visual identity" below), and correction history moved onto the node
itself (bronze ring, slightly larger radius) rather than a line back to
a predecessor. Nothing about supersession chains changed underneath;
`ThreadPanel` still shows the full chain when you click a claim.

## What's naive on purpose

- **Conflict detection** (`graphModel.js`) is same-topic-label,
  different-text. It'll misfire on any topic that legitimately holds
  multiple simultaneous active claims. Replace with real similarity
  scoring + an LLM judgment call once this starts mattering.
- **Retrieval** (`query.js`) is keyword overlap, not embeddings. Fine
  for proving the "walk the chain" UX, not real RAG yet.
- **Categorize** (above) is one request for the whole claim set, no
  chunking yet.

## Deploying

`vite.config.js` sets `base: '/Skein/'`, matching the exact case of
the repo name (`Virerra/Skein`) since GitHub Pages serves paths
case-sensitively. If you ever rename the repo, update this to match. A
GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and
deploys `dist/` to Pages on every push to `main`; enable Pages →
GitHub Actions as the source in the repo settings once it's pushed.

## License

MIT — see [LICENSE](LICENSE).
