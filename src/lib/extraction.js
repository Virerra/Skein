// Extraction: turns a pasted transcript into a list of atomic claims.
//
// Thin dispatcher over pluggable providers (src/lib/providers/) -- each
// provider is responsible only for "transcript in, raw
// {text, topic, label}[] out"; the claim-shaping tail below
// (id/timestamp/status) is shared so every provider produces identical
// claim objects.

import { runProvider } from "./providers/dispatch";
import { relabelClaims } from "./relabel";

const EXTRACTION_SYSTEM_PROMPT = `You extract atomic claims from a pasted AI chat transcript.

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
  of it. This is what shows on the graph node itself, so it needs to
  read on its own without the full claim text next to it.
- Do not invent claims that aren't actually stated. Skip greetings,
  meta-commentary, and anything too vague to be a discrete claim.
- Respond with ONLY a JSON array, no prose, no markdown fences. Each
  element: {"text": string, "topic": string, "label": string}`;

export async function extractClaims({ transcript, sourceChat, settings, apiKey, signal }) {
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const parsed = await runProvider({ content: transcript, systemPrompt: EXTRACTION_SYSTEM_PROMPT, settings, apiKey, signal });

  const now = Date.now();
  let claims = parsed.map((c, i) => ({
    id: crypto.randomUUID(),
    text: c.text,
    topic: (c.topic || "general").toLowerCase().trim(),
    label: (c.label || "").trim(), // may be empty here -- filled in below, not immediately truncated
    timestamp: now + i, // preserves extraction order when source has no per-claim time
    sourceChat: sourceChat || "untitled chat",
    status: "active",
    supersedes: null,
  }));

  // If the model complied with everything except the label (a real,
  // observed failure mode, especially on smaller models asked to fill
  // three fields in one JSON response), follow up with a dedicated,
  // much simpler relabel call before resorting to truncated text. This
  // is what makes the raw-text fallback below an actual last resort
  // instead of the common case.
  const missingLabels = claims.filter((c) => !c.label);
  if (missingLabels.length > 0) {
    try {
      const relabeled = await relabelClaims({ claims: missingLabels, settings, apiKey, signal });
      const byId = new Map(relabeled.map((r) => [r.id, r.label]));
      claims = claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
    } catch {
      // Best-effort -- if the follow-up call itself fails, the
      // truncation fallback below still applies. Never worse than
      // before this existed, just an extra chance to do better.
    }
  }

  return claims.map((c) => ({
    ...c,
    label: c.label || (c.text.length > 28 ? c.text.slice(0, 28) + "…" : c.text),
  }));
}
