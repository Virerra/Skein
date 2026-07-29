// Re-categorizes existing claims by asking the model to assign a
// consistent topic label AND a short display label per claim, across
// the whole set at once. Fixes two kinds of drift from claims being
// extracted from different transcripts in isolation: the same real
// subject getting inconsistently topic-labeled ("database" in one
// transcript, "db setup" in another) and fragmenting into clusters
// that should really be one, and claims that predate the label field
// (or got a weak one) still showing raw truncated text as their node
// name on the graph.
//
// NAIVE FIRST PASS -- sends every claim's full text in one request, no
// batching. Fine at personal-tool scale (tens to low hundreds of
// claims); would need chunking before it scales further than that.

import { runProvider } from "./providers/dispatch";
import { CATEGORIZE_PROMPT } from "../../shared/prompts";

export async function categorizeClaims({ claims, settings, apiKey, signal }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) throw new Error("No claims to categorize.");

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: CATEGORIZE_PROMPT, settings, apiKey, signal });

  const byId = new Map(
    result
      .filter((r) => r?.id && r?.topic)
      .map((r) => [r.id, { topic: r.topic.toLowerCase().trim(), label: (r.label || "").trim() }])
  );

  return claims.map((c) => {
    const update = byId.get(c.id);
    if (!update) return c;
    return { ...c, topic: update.topic, label: update.label || c.label };
  });
}
