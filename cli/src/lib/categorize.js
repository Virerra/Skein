// Prompt shared with the web app via ../../../shared/prompts.js.

import { runProvider } from "./providers/dispatch.js";
import { CATEGORIZE_PROMPT } from "../../../shared/prompts.js";

export async function categorizeClaims({ claims, provider, model, apiKey, baseUrl }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) throw new Error("No claims to categorize.");

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: CATEGORIZE_PROMPT, provider, model, apiKey, baseUrl });

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
