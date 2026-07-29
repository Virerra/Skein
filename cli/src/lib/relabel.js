// Dedicated, single-purpose prompt for labels, separate from
// extraction/categorize's larger multi-field schemas. Given the CLI is
// the "only text, no graph" surface, a claim showing raw truncated
// text instead of a real name is a bigger problem here than in the web
// app, where color and clustering give some extra orientation even
// with a bad label. Prompt shared with the web app via
// ../../../shared/prompts.js.

import { runProvider } from "./providers/dispatch.js";
import { RELABEL_PROMPT } from "../../../shared/prompts.js";

export async function relabelClaims({ claims, provider, model, apiKey, baseUrl }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) return [];

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: RELABEL_PROMPT, provider, model, apiKey, baseUrl });

  return result
    .filter((r) => r?.id && r?.label)
    .map((r) => ({ id: r.id, label: r.label.trim() }));
}
