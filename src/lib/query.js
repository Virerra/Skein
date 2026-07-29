// Retrieval + synthesis (real RAG), replacing the original keyword-
// overlap placeholder.
//
// Two separate model calls, two separate provider choices:
// - Embedding (query text, and any claim that doesn't have a stored
//   vector yet) always goes through WebLLM locally, decoupled from
//   whatever chat provider is selected -- see providers/embed.js for
//   why (Anthropic has no embeddings API at all).
// - Synthesizing the actual answer goes through whichever chat
//   provider is selected in Settings, same as extraction/categorize.

import { embedTexts, cosineSimilarity } from "./providers/embed";
import { getAllEmbeddings, putEmbeddings } from "./db";
import { buildClusters } from "./graphModel";
import { runProvider } from "./providers/dispatch";
import { SYNTHESIS_PROMPT } from "../../shared/prompts";

const TOP_K = 6;

export async function runQuery(claims, queryText, { settings, apiKey, signal } = {}) {
  const active = claims.filter((c) => c.status !== "discarded");
  if (!queryText.trim() || active.length === 0) {
    return { matched: false, answer: null, sources: [] };
  }

  const stored = await getAllEmbeddings();
  const vectorById = new Map(stored.map((e) => [e.id, e.vector]));

  // Backfill -- any active claim without a stored embedding yet (older
  // claims from before this feature existed, or a rare failed embed at
  // extraction time) gets embedded now instead of needing a separate
  // reindex step. Costs the first query after new data shows up a
  // little extra time; every query after that reads straight from
  // storage.
  const missing = active.filter((c) => !vectorById.has(c.id));
  if (missing.length > 0) {
    const vectors = await embedTexts(missing.map((c) => c.text));
    const fresh = missing.map((c, i) => ({ id: c.id, vector: vectors[i] }));
    await putEmbeddings(fresh);
    fresh.forEach((r) => vectorById.set(r.id, r.vector));
  }

  const [queryVector] = await embedTexts([queryText]);

  const scored = active
    .map((c) => ({ claim: c, score: cosineSimilarity(queryVector, vectorById.get(c.id)) }))
    .sort((a, b) => b.score - a.score);

  // One claim per topic in the context set, resolved to that topic's
  // CURRENT head -- semantic similarity has no idea what a correction
  // is. A query can't be allowed to answer from a superseded claim
  // just because its old wording happened to match more closely than
  // whatever replaced it.
  const clusterByTopic = new Map(buildClusters(claims).map((cl) => [cl.topic, cl]));
  const seenTopics = new Set();
  const sources = [];
  for (const { claim } of scored) {
    if (sources.length >= TOP_K) break;
    if (seenTopics.has(claim.topic)) continue;
    seenTopics.add(claim.topic);
    sources.push(clusterByTopic.get(claim.topic)?.head ?? claim);
  }

  const contextText = sources.map((c, i) => `[${i + 1}] (${c.topic}) ${c.text}`).join("\n");
  const userContent = `Question: ${queryText}\n\nClaims:\n${contextText}`;

  const result = await runProvider({ content: userContent, systemPrompt: SYNTHESIS_PROMPT, settings, apiKey, signal });

  const rawIndices = Array.isArray(result?.citedIndices) ? result.citedIndices : [];
  // 1-indexed, matching the [n] markers the model was given and (should
  // have) echoed in its answer -- validated against the real source
  // count rather than trusted blindly.
  const citedIndices = rawIndices.filter((i) => Number.isInteger(i) && i >= 1 && i <= sources.length);

  return {
    matched: true,
    answer: typeof result?.answer === "string" ? result.answer : "",
    sources, // full retrieved list, in the exact order [n] markers in the answer refer to -- never filtered or renumbered, so citation numbers always line up
    citedIndices: citedIndices.length > 0 ? citedIndices : sources.map((_, i) => i + 1), // model didn't cite cleanly -- treat everything retrieved as relevant rather than showing nothing
  };
}
