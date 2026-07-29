// Same as the web app's src/lib/relabel.js: a dedicated, single-
// purpose prompt for labels, separate from extraction/categorize's
// larger multi-field schemas. Given the CLI is the "only text, no
// graph" surface, a claim showing raw truncated text instead of a real
// name is a bigger problem here than in the web app, where color and
// clustering give some extra orientation even with a bad label.

import { runProvider } from "./providers/dispatch.js";

const RELABEL_SYSTEM_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string}].

For each one, assign a short display label: 2-4 words, title case, e.g.
"Postgres Over Mongo" -- a name for the claim, not a summary of it.

Respond with ONLY a JSON array, no prose, no markdown fences:
[{"id": string, "label": string}]`;

export async function relabelClaims({ claims, provider, model, apiKey, baseUrl }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) return [];

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: RELABEL_SYSTEM_PROMPT, provider, model, apiKey, baseUrl });

  return result
    .filter((r) => r?.id && r?.label)
    .map((r) => ({ id: r.id, label: r.label.trim() }));
}
