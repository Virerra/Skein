# Skein

Personal knowledge graph: paste AI chat transcripts, extract atomic claims,
chain contradicting claims into correction history instead of overwriting
them, then use the graph — not raw transcripts — as the RAG retrieval layer.

Full pipeline, stack rationale, and what's deliberately naive in the current
implementation: see README.md.

## Terminology — use exactly, don't substitute
- "claim" — never "note" or "message"
- "supersede" — never "replace" or "overwrite"
- "chain" — never "thread" (thread is reserved for the graph's visual edge motif)
- "cluster" — never "group" or "category"

## Voice
Technical, precise, a little dry. Declarative and causal ("nothing is
overwritten," not "don't worry, it's saved!"). No exclamation points, no
emoji. Sentence case everywhere except bracketed status tags ([ACTIVE],
[SUPERSEDED], [CORRECTION · CURRENT], [DISCARDED]) — the one deliberate
all-caps convention, reserved for machine state, not emphasis.

## Design direction — where this landed, and what's still open
The original design export leaned heavily into neumorphism and rendered
graph nodes as gradient marbles. That was flagged as a real tension: it
drifts from the "knot of thread" concept the name Skein is built on, and
from this same system's own stated "restrained, technical" voice.

As of this state of the repo, that tension was partly resolved by scoping
neumorphism to just the graph's knots, buttons, and cluster-filter rows —
cards, inputs, and panels stay flat (see README's "Visual identity"). That's
a reasonable compromise and can be treated as settled.

What's *not* settled: the knots themselves are still rendered as gradient
marbles (sheen + drop shadow + pit, see GraphCanvas.jsx), not as anything
that visually reads as thread or a knot of it. Whether that's the right
final call, versus a shape that still nods at the name, is an open product
decision — don't extend the marble treatment further (more gradients, more
chrome) without raising it first.

## How Sean works
Direct, opinionated takes over hedging — if something's a bad idea, say so
and why, don't just comply. New to coding: explain what you're doing and why
in plain terms, not jargon, but don't water down the actual decisions.
