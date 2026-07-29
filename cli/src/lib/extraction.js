// Same prompt and claim shape as the web app's src/lib/extraction.js.
// Kept as a separate copy rather than a shared import -- see the CLI
// README for why (short version: avoiding a cross-package ESM
// resolution dependency between two independently-runnable tools).
// If you change the extraction prompt in one place, change it in both.

import { runProvider } from "./providers/dispatch.js";
import { relabelClaims } from "./relabel.js";
import { randomUUID } from "node:crypto";

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
  of it.
- Do not invent claims that aren't actually stated. Skip greetings,
  meta-commentary, and anything too vague to be a discrete claim.
- Respond with ONLY a JSON array, no prose, no markdown fences. Each
  element: {"text": string, "topic": string, "label": string}`;

export async function extractClaims({ transcript, sourceChat, provider, model, apiKey, baseUrl }) {
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const parsed = await runProvider({ content: transcript, systemPrompt: EXTRACTION_SYSTEM_PROMPT, provider, model, apiKey, baseUrl });

  const now = Date.now();
  let claims = parsed.map((c, i) => ({
    id: randomUUID(),
    text: c.text,
    topic: (c.topic || "general").toLowerCase().trim(),
    label: (c.label || "").trim(), // may be empty here -- filled below, not immediately truncated
    timestamp: now + i,
    sourceChat: sourceChat || "untitled",
    status: "active",
    supersedes: null,
  }));

  // Same reliability fix as the web app: if the model complied with
  // topic but dropped label (a compound-task failure mode, especially
  // on smaller/cheaper models), a dedicated single-purpose follow-up
  // call is far more likely to actually produce one than truncated
  // text ever will. This is what makes the fallback below an actual
  // last resort.
  const missingLabels = claims.filter((c) => !c.label);
  if (missingLabels.length > 0) {
    try {
      const relabeled = await relabelClaims({ claims: missingLabels, provider, model, apiKey, baseUrl });
      const byId = new Map(relabeled.map((r) => [r.id, r.label]));
      claims = claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
    } catch {
      // Best-effort -- falls through to truncation below.
    }
  }

  return claims.map((c) => ({
    ...c,
    label: c.label || (c.text.length > 28 ? c.text.slice(0, 28) + "…" : c.text),
  }));
}
