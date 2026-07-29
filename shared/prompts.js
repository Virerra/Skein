// Prompt content shared between the web app (src/lib/) and the CLI
// (cli/src/lib/). This is the actual drift-prone, worth-sharing part.
//
// Deliberately NOT sharing the provider-dispatch/transport layer here.
// That's legitimately different between the two: the web app supports
// three providers including a browser-only local model (WebLLM), the
// CLI is BYOK-only across two, with different config shapes
// (`{settings, apiKey}` vs. flat `{provider, model, apiKey, baseUrl}`).
// Unifying that would mean papering over a real difference rather than
// removing a fake one.
//
// One thing worth knowing: these prompts used to differ by one
// sentence each, in extraction and categorize -- the web app's
// mentioned "the graph node" a label appears on, phrasing that doesn't
// make sense from the CLI, which has no graph. That wasn't actually
// environment-specific advice, though, just narrow wording for
// something equally true of the CLI's `list`/`show` output: a label
// has to read standalone, without the full claim text next to it,
// wherever it's the only thing shown. Reworded once, generically, and
// that's what made the whole string shareable verbatim -- no
// per-environment composition needed, because the underlying rule was
// never actually different.

export const EXTRACTION_PROMPT = `You extract atomic claims from a pasted AI chat transcript.

A claim is one of:
- a decision ("we're using Postgres")
- a stated fact ("context windows are measured in tokens")
- an open question ("still need to decide on auth")

Rules:
- Each claim must be a single, self-contained sentence in the user's own
  words (not the assistant's phrasing, unless the user explicitly agreed).
- Assign a short lowercase topic label (1-2 words, e.g. "database",
  "auth", "deployment") so claims on the same subject can be clustered
  later, even across different transcripts.
- Assign a short display label (2-4 words, title case, e.g. "Postgres
  Over Mongo", "Auth Deadline") -- a name for the claim, not a summary
  of it. This is what shows wherever the claim is listed by itself, so
  it needs to read on its own without the full claim text next to it.
- Do not invent claims that aren't actually stated. Skip greetings,
  meta-commentary, and anything too vague to be a discrete claim.
- Respond with ONLY a JSON array, no prose, no markdown fences. Each
  element: {"text": string, "topic": string, "label": string}`;

export const CATEGORIZE_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string}].

For each claim:
- Assign a short, lowercase, 1-2 word topic. Use the exact same topic
  for claims that are about the same real-world subject, even if
  they're given different topics today -- consolidate near-duplicates
  ("database" and "db setup" should become one) into a single
  consistent name across the whole set.
- Assign a short display label (2-4 words, title case, e.g. "Postgres
  Over Mongo") -- a name for the claim, not a summary. This is what
  shows wherever the claim is listed by itself, so keep it readable on
  its own.

Respond with ONLY a JSON array, no prose, no markdown fences. One
element per input claim, same ids, in any order:
{"id": string, "topic": string, "label": string}`;

export const RELABEL_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string}].

For each one, assign a short display label: 2-4 words, title case, e.g.
"Postgres Over Mongo" -- a name for the claim, not a summary of it.

Respond with ONLY a JSON array, no prose, no markdown fences:
[{"id": string, "label": string}]`;

export const SYNTHESIS_PROMPT = `You answer a question using ONLY the numbered
claims provided below, each tagged with its topic.

Rules:
- Base your answer only on the given claims. If they don't contain enough to
  answer, say that plainly instead of guessing or using outside knowledge.
- Cite claims inline with their number in brackets, e.g. [1], wherever you
  draw on one.
- 2-4 sentences, unless the question genuinely needs more room.

Respond with ONLY a JSON object, no prose, no markdown fences:
{"answer": string, "citedIndices": number[]}`;
