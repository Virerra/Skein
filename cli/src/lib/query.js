// Retrieval + synthesis, same shape as the web app's src/lib/query.js:
// embedding-based retrieval, chain-aware (never answers from a
// superseded claim just because its old wording matched closer than
// whatever replaced it), synthesis through whichever chat provider is
// selected, asked to cite retrieved claims inline as [1], [2].
//
// One structural difference from the web app: embeddings live in
// store.embeddings (a plain object keyed by claim id) rather than a
// separate IndexedDB store, and this function mutates that object
// directly as a backfill side effect -- the caller (commands/query.js)
// is responsible for saving the store afterward so newly-computed
// embeddings actually persist.

import { embedTexts, cosineSimilarity } from "./embed.js";
import { buildClusters } from "./graphModel.js";
import { runProvider } from "./providers/dispatch.js";

const TOP_K = 6;

const SYNTHESIS_SYSTEM_PROMPT = `You answer a question using ONLY the numbered
claims provided below, each tagged with its topic.

Rules:
- Base your answer only on the given claims. If they don't contain enough to
  answer, say that plainly instead of guessing or using outside knowledge.
- Cite claims inline with their number in brackets, e.g. [1], wherever you
  draw on one.
- 2-4 sentences, unless the question genuinely needs more room.

Respond with ONLY a JSON object, no prose, no markdown fences:
{"answer": string, "citedIndices": number[]}`;

export async function runQuery(store, queryText, { provider, model, apiKey, baseUrl, embed }) {
  const active = store.claims.filter((c) => c.status !== "discarded");
  if (!queryText.trim() || active.length === 0) {
    return { matched: false, answer: null, sources: [] };
  }

  store.embeddings = store.embeddings || {};

  // Backfill -- any active claim without a stored embedding yet gets
  // one now rather than needing a separate reindex step. Mutates
  // store.embeddings directly; commands/query.js saves the store after
  // this returns.
  const missing = active.filter((c) => !store.embeddings[c.id]);
  if (missing.length > 0) {
    process.stderr.write(`Embedding ${missing.length} claim${missing.length === 1 ? "" : "s"} for the first time...\n`);
    const vectors = await embedTexts(missing.map((c) => c.text), embed);
    missing.forEach((c, i) => {
      store.embeddings[c.id] = vectors[i];
    });
  }

  const [queryVector] = await embedTexts([queryText], embed);

  const scored = active
    .map((c) => ({ claim: c, score: cosineSimilarity(queryVector, store.embeddings[c.id]) }))
    .sort((a, b) => b.score - a.score);

  // One claim per topic in context, resolved to that topic's CURRENT
  // head -- semantic similarity has no idea what a correction is.
  const clusterByTopic = new Map(buildClusters(store.claims).map((cl) => [cl.topic, cl]));
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

  const result = await runProvider({ content: userContent, systemPrompt: SYNTHESIS_SYSTEM_PROMPT, provider, model, apiKey, baseUrl });

  const rawIndices = Array.isArray(result?.citedIndices) ? result.citedIndices : [];
  const citedIndices = rawIndices.filter((i) => Number.isInteger(i) && i >= 1 && i <= sources.length);

  return {
    matched: true,
    answer: typeof result?.answer === "string" ? result.answer : "",
    sources,
    citedIndices: citedIndices.length > 0 ? citedIndices : sources.map((_, i) => i + 1),
  };
}
