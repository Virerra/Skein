# Skein CLI

The same extraction/categorization pipeline as the Skein web app, no
graph, no browser — paste a transcript, get atomic claims. Built for
someone who wants to be fast and doesn't need to see anything.

Lives at `Skein/cli/` in the main repo, not standalone — it imports
prompt content from `../shared/prompts.js` (see "Prompts are shared"
below), so unlike earlier in this project, it can't just be copied out
and dropped anywhere on its own anymore. Moving it would mean bringing
`shared/` along too.

## Install

```bash
cd Skein/cli
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

## Managing individual claims

`list`, `show`, and `discarded` all print a short id (8 characters)
next to every claim. Enough characters to be unambiguous is enough to
type — same convention as `git`/`docker` — the CLI tells you plainly if
a prefix matches more than one claim, rather than guessing which you
meant.

```bash
skein discard a1b2c3d4          # soft-remove -- recoverable
skein restore a1b2c3d4          # brings it back to whatever status it had
skein discarded                 # lists everything currently discarded
skein delete a1b2c3d4 --yes     # permanent -- the one real hard-delete
```

`delete` refuses to run without `--yes` and prints exactly what it's
about to remove first — no interactive confirmation prompt, since this
CLI is meant to be scriptable and a prompt that blocks on stdin is
exactly the kind of thing that silently hangs a piped invocation or a
script. The flag *is* the confirmation.

## Fixing node names

If a claim is showing raw truncated text instead of a real name (older
claims from before labels existed, or a case where the model dropped
the field), two options:

```bash
skein relabel   # refreshes labels only, doesn't touch topics
```

Extraction also self-corrects for this now: if a model returns a topic
but drops the label, a dedicated single-purpose follow-up call fills it
in before ever falling back to truncated text. Naming quality matters
more here than in the web app — there's no graph, no color, no
clustering to fall back on for orientation, a bad name is the whole
problem when text is literally the only interface.

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

## Prompts are shared, the provider layer isn't

`../shared/prompts.js` (one level up from this folder, at the repo
root) holds the actual prompt content — extraction, categorize,
relabel, and query synthesis — imported by both this CLI's `src/lib/`
files and the web app's. Not copies kept manually in sync anymore:
both sides import the literal same file, so a prompt change made once
applies everywhere automatically.

What's deliberately *not* shared is the provider-dispatch/transport
layer (`src/lib/providers/`) — that's genuinely different between the
two, not just historically duplicated. The web app supports three
providers including a browser-only local model (WebLLM) and passes a
`settings` object; this CLI is BYOK-only across two providers with flat
`{provider, model, apiKey, baseUrl}` params. Unifying that would mean
papering over a real difference, not removing a fake one.
