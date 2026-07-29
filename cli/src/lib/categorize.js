// Same prompt as the web app's src/lib/categorize.js -- see the note
// at the top of extraction.js about why this is a copy, not a shared
// import.

import { runProvider } from "./providers/dispatch.js";

const CATEGORIZE_SYSTEM_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string}].

For each claim:
- Assign a short, lowercase, 1-2 word topic. Use the exact same topic
  for claims that are about the same real-world subject, even if
  they're given different topics today -- consolidate near-duplicates
  ("database" and "db setup" should become one) into a single
  consistent name across the whole set.
- Assign a short display label (2-4 words, title case, e.g. "Postgres
  Over Mongo") -- a name for the claim, not a summary.

Respond with ONLY a JSON array, no prose, no markdown fences. One
element per input claim, same ids, in any order:
{"id": string, "topic": string, "label": string}`;

export async function categorizeClaims({ claims, provider, model, apiKey, baseUrl }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) throw new Error("No claims to categorize.");

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: CATEGORIZE_SYSTEM_PROMPT, provider, model, apiKey, baseUrl });

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
