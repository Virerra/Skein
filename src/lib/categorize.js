// Re-categorizes existing claims by asking the model to assign a
// consistent topic label per claim, across the whole set at once.
// Fixes drift from claims being extracted from different transcripts
// in isolation, where the same real subject can get inconsistently
// labeled ("database" in one transcript, "db setup" in another) and
// fragment into separate clusters that should really be one.
//
// NAIVE FIRST PASS -- sends every claim's full text in one request, no
// batching. Fine at personal-tool scale (tens to low hundreds of
// claims); would need chunking before it scales further than that.

import { runProvider } from "./providers/dispatch";

const CATEGORIZE_SYSTEM_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string}].

Assign each one a short, lowercase, 1-2 word topic label. Use the exact
same label for claims that are about the same real-world subject, even
if you're given different labels for them today -- consolidate
near-duplicates ("database" and "db setup" should become one label)
into a single consistent name across the whole set.

Respond with ONLY a JSON array, no prose, no markdown fences. One
element per input claim, same ids, in any order:
{"id": string, "topic": string}`;

export async function categorizeClaims({ claims, settings, apiKey, signal }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) throw new Error("No claims to categorize.");

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: CATEGORIZE_SYSTEM_PROMPT, settings, apiKey, signal });

  const byId = new Map(result.filter((r) => r?.id && r?.topic).map((r) => [r.id, r.topic.toLowerCase().trim()]));
  return claims.map((c) => (byId.has(c.id) ? { ...c, topic: byId.get(c.id) } : c));
}
