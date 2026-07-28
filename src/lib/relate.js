// Suggests relations between claims via the model, as an alternative
// to manually clicking pairs together in the graph. Deliberately asks
// for cross-topic connections specifically -- same-topic relatedness
// is already what the halo/clustering shows, so an AI-found relation
// is most valuable when it crosses a topic boundary and reveals a
// connection that wouldn't otherwise be visible.
//
// NAIVE FIRST PASS -- one request for the whole claim set, same
// caveat as categorize.js. Also asks the model to be conservative
// (only clear connections, not exhaustive pairwise correlation) since
// this is additive to the graph and low-precision suggestions are more
// annoying to clean up than useful.

import { runProvider } from "./providers/dispatch";

const RELATE_SYSTEM_PROMPT = `You are given a JSON array of claims: [{"id": string, "text": string, "topic": string}].

Find pairs of claims that are meaningfully connected ACROSS DIFFERENT
topics -- for example, a decision in one topic that has a direct
consequence for a claim in another topic. Do not pair claims that
already share the same topic; that relatedness is already shown
elsewhere. Be conservative: only return pairs where the connection is
clear and worth surfacing, not every pair that's loosely related.

Respond with ONLY a JSON array, no prose, no markdown fences. Each
element: {"a": string, "b": string} using the given ids. Return an
empty array if nothing crosses that bar.`;

export async function suggestRelations({ claims, settings, apiKey, signal }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length < 2) return [];

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text, topic: c.topic })));
  const result = await runProvider({ content: payload, systemPrompt: RELATE_SYSTEM_PROMPT, settings, apiKey, signal });

  const validIds = new Set(candidates.map((c) => c.id));
  const topicOf = new Map(candidates.map((c) => [c.id, c.topic]));

  return result
    .filter((r) => r?.a && r?.b && r.a !== r.b && validIds.has(r.a) && validIds.has(r.b))
    .filter((r) => topicOf.get(r.a) !== topicOf.get(r.b)); // defensive -- same-topic slip-throughs are redundant with the halo
}
