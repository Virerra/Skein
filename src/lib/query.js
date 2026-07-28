// Retrieval over the claim graph.
//
// NAIVE FIRST PASS — this is keyword overlap, not embedding-based RAG.
// It's enough to make the query bar real and prove the "walk the
// chain" behavior end to end. Swap the matching step for an embedding
// similarity search once there's a reason to (i.e. once keyword
// matching starts missing obvious matches in testing).

import { getChain } from "./graphModel";

function score(claim, queryWords) {
  const text = claim.text.toLowerCase();
  return queryWords.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0);
}

export function runQuery(claims, queryText) {
  const queryWords = queryText
    .toLowerCase()
    .replace(/[?"']/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = claims
    .map((c) => ({ claim: c, score: score(c, queryWords) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: false, chain: [], summary: "no matching claims" };
  }

  const best = scored[0].claim;
  const chain = getChain(claims, best.id);
  const current = chain[chain.length - 1];

  return {
    matched: true,
    chain,
    summary: `${chain.length} hop${chain.length === 1 ? "" : "s"} · chain · current: ${current.text}`,
  };
}
