# Skein — Project Brief

## One-liner
A personal knowledge graph that merges scattered AI chat history into a single, contradiction-aware source of truth — then uses that graph as the retrieval layer for RAG, instead of retrieving from raw transcripts.

## The problem
Repeated conversations on the same topic (with Claude, ChatGPT, or anything else) fragment across many separate chats. Ideas evolve across those chats — a simple question becomes a concept, the concept becomes a decision, the decision gets revised — but nothing connects them. The person ends up with a pile of chats they don't want to delete (the context is valuable) but don't want to keep open either (the clutter isn't). There's currently no way to consolidate that history without losing the evolution of thought that produced it.

## The core idea
Treat each chat not as a document to summarize, but as a source of **atomic claims** — decisions, facts, open questions — each timestamped and tagged by topic. Extract those claims, cluster them by topic across every source chat, and represent them as a graph rather than a list. When two claims on the same topic conflict, don't overwrite one with the other — chain them, so the newer claim explicitly **supersedes** the older one while the older one stays visible in history.

This turns ten redundant, half-remembered chats into one clean, navigable structure: a graph of what was decided, when, and why it changed.

## Pipeline

1. **Ingestion** — user exports or pastes a chat transcript, or (faster, lower-fidelity) gets the source AI to self-generate a structured summary via a general-purpose prompt, similar to how Claude's own "bring your work from another AI" onboarding flow works. Full transcript is preferred; self-summaries risk smoothing over the contradictions the system exists to catch.
2. **Extraction** — an LLM reads the transcript and pulls out atomic claims (decision, fact, open question), each tagged with topic and timestamp. This is a mechanical task, doesn't need a frontier model.
3. **Clustering** — claims are grouped into topic clusters regardless of which source chat they came from.
4. **Conflict detection & chaining** — within a cluster, contradicting claims aren't merged or deleted. Each new claim becomes a new node; if it contradicts an earlier one, it's linked as **superseding** it, preserving the full decision history as a traversable chain (see example below).
5. **Retrieval (RAG)** — instead of retrieving raw chat chunks, the retriever pulls from the graph's clean claim nodes. Queries can also traverse chains — "what are we using" returns the current node; "why did we change" walks the whole chain.

### Worked example (used throughout design)
- `10:14am` — Decided on **Postgres**, for query flexibility → *superseded*
- `1:40pm` — Switched to **MongoDB**, for schema-less storage → *superseded*
- `6:02pm` — Reverted to **Postgres**, Mongo made relational queries harder → *current / correction*

Nothing is overwritten. The correction supersedes Mongo, not the original Postgres claim — asking "why Postgres" surfaces the whole zigzag, not just the final answer.

## Why this matters for cost
Retrieving five clean, deduplicated claim nodes is far cheaper than retrieving five noisy raw-chat chunks. The graph also stays lean over time — new mentions of the same decision extend a chain rather than growing the corpus, unlike a raw vector store which just accumulates duplicates.

## Technical stack (decided)
- **Zero-infrastructure, fully client-side** — no backend, no server, no hosting cost. Same pattern as Sean's other shipped projects (LoopLens, Reality Check, Singularity, Parlance, Claude-Batch).
- **Front end:** React + Vite
- **Storage:** IndexedDB (built into the browser, free, holds the full graph — nodes and edges)
- **Graph rendering:** Cytoscape.js
- **Model access, two tiers:**
  - Default: a small local model running fully in-browser via **WebLLM** (e.g. Phi-3 or Llama, GPU-accelerated, no key, no install, no cost) — good enough for the mechanical extraction task.
  - Optional upgrade: **BYOK** for sharper extraction quality (e.g. Gemini Flash, GPT-4o mini), same pattern as Sean's other tools.
- **Hosting:** GitHub Pages
- **License:** MIT (consistent with prior projects)

## Design language

**Palette (final, chosen by Sean — Century Bold wordmark, off-center gold dot on the "i" as signature detail):**
| Token | Hex | Role |
|---|---|---|
| Background | `#353535` | base surface |
| Bronze | `#B2945B` | correction / selection accent |
| Gold (primary) | `#DECD87` | active claim / wordmark dot |
| Gold (pale) | `#E9DDAF` | glow / highlight state |
| Cream | `#FFF9F0` | primary text |

- Superseded/contradicted claims keep a **cool blue-grey** (`#56626C`) — deliberately not part of the warm palette, so "alive" vs "dead" claims are readable at a glance.
- **Typography:** Century Bold for the wordmark (web substitute: PT Serif Bold, pending real licensing in Claude Design); IBM Plex Sans for UI; IBM Plex Mono for timestamps, tags, and data.
- **Signature element:** wordmark uses a dotless "i" with a hand-placed, deliberately off-center gold dot — the one intentional imperfection, everything else restrained.
- **Graph visual language:**
  - Nodes rendered as small "knots" (concentric rings), not plain dots
  - Edges are curved "threads," not straight lines — solid + glowing for active connections, thin + dashed ("frayed") for superseded ones
  - Node size scales with degree/connectivity (higher-connectivity claims render larger)
  - Inline bracketed status tags on nodes (`[ACTIVE]`, `[SUPERSEDED]`, `[CORRECTION · CURRENT]`), inspired by Graphify's edge-confidence tagging (`EXTRACTED`/`INFERRED`)
  - Sidebar cluster filter with checkboxes + color swatches, also inspired by Graphify's Communities panel
  - Terminal-style query bar (`$ skein query "why postgres?" → 3 hops · chain · current: Postgres`) makes the RAG layer visually concrete

## Prior art / competitive context
**Graphify** (Graphify-Labs, YC-backed) does the same "graph over grep/RAG" philosophy, but scoped to codebases and docs rather than personal chat history. Skein's wedge is different: personal, chronological, contradiction-first, and about the evolution of a person's own thinking over time rather than a static codebase.

## Naming
**Skein** — chosen from a weaving-metaphor shortlist (Loom, Shuttle, Braid, Warp, Bobbin, Filament). Loom and Braid were both already in use as GitHub project names; Skein — a tangled thread you organize — was open and fit the contradiction-resolution theme best.

## Open questions / next steps
- Finalize extraction prompt design (what counts as an atomic claim vs. noise)
- Test WebLLM extraction quality against BYOK cheap-tier models to see how big the quality gap actually is
- Define the contradiction-detection logic precisely (topic similarity threshold, what counts as "superseding" vs. "unrelated")
- Design the retrieval/traversal UX in more detail (how a chain is presented when asked "why")
- Finalize typeface licensing and exact dot placement in Claude Design
- Decide whether the graph is single-project-scoped or spans everything, and how clustering handles unrelated topics at scale
