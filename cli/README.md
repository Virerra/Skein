# Skein CLI

The same extraction/categorization pipeline as the Skein web app, no
graph, no browser — paste a transcript, get atomic claims. Built for
someone who wants to be fast and doesn't need to see anything.

## Install

```bash
cd skein-cli
npm link   # makes `skein` available globally, or just run node bin/skein.js directly
```

## Usage

```bash
export ANTHROPIC_API_KEY=sk-...
export OPENAI_API_KEY=sk-...       # only needed for query -- see below

skein extract transcript.txt --source "Database thread"
skein categorize
skein all transcript.txt          # extract + categorize in one go
skein list
skein show database               # matches by topic, label, or text substring
skein query "why did we pick postgres?"
```

`query` needs its own key even if you're using `--provider anthropic`
for everything else: Anthropic has no embeddings API at all, so
retrieval always goes through OpenAI's `/embeddings` endpoint
regardless of which provider is answering the actual question.
`--embed-key` / `OPENAI_API_KEY` for that, `--embed-base-url` if you'd
rather point it at a local server that implements the same route.

Store lives at `.skein/store.json` in whatever directory you run this
from — scoped per-project, not global, same convention as `.git`. It's
plain JSON; `cat` or `jq` it directly if you want to look under the
hood. Embeddings are kept in a separate `embeddings` object in that
same file, not inlined onto each claim — a vector is 1500+ floats, and
inlining it into every claim would make the file unreadable.

## What's deliberately different from the web app

- **BYOK only, two providers** (`--provider anthropic|openai`), no
  WebLLM equivalent. WebLLM is a browser-only, WebGPU-backed local
  model — there's no free local path being offered here, and given who
  this tool is for, that's a reasonable trade, not a compromise.
- **JSON file, not SQLite.** SQLite in Node means a native-compiled
  dependency (`better-sqlite3` or similar) — exactly the kind of
  install friction "straight to the point" is supposed to avoid. A
  plain JSON file is also something you can inspect directly, which
  fits this tool's audience better than a binary format would.
- **No `relate` command.** Relations only affect how the web app's
  graph *draws* connections between clusters right now — they don't
  feed retrieval or anything else functional, so they'd have nothing
  to do here. If retrieval ever expands through the relations graph
  (an open question on the web app side), this is worth revisiting.
- **`query` needs a second key.** See above — this is a real
  consequence of Anthropic not offering embeddings, not a CLI-specific
  design choice; the web app works around it by always embedding
  locally via WebLLM, which doesn't exist in plain Node.

## Prompts are copies, not shared imports

`src/lib/extraction.js`, `src/lib/categorize.js`, and `src/lib/query.js`
mirror the web app's versions exactly, but they're separate files, not
a shared import across the two packages. That's a real tradeoff: change
a prompt in one place and it won't automatically apply to the other.
The alternative (importing directly from the web app's `src/lib/`) was
available — those files have zero browser-specific dependencies once
the WebLLM provider is excluded — but Node's ESM resolver requires
explicit file extensions on relative imports where Vite doesn't, so it
wasn't a drop-in path anyway. If prompt drift between the two ever
becomes a real problem, that's the fix worth doing properly rather than
working around here.
