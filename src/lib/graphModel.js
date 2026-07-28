// Conflict detection and chain-building.
//
// NAIVE FIRST PASS — this is the piece most worth replacing later.
// Right now "conflict" just means: same topic label, different text,
// and the existing claim for that topic is still "active". That's
// enough to prove out the correction-chain UI, but it will misfire
// on topics that legitimately hold multiple simultaneous active
// claims. A real version needs embedding similarity + an LLM judgment
// call on whether two claims actually contradict each other, not just
// share a topic.

export function applyNewClaims(existingClaims, newClaims) {
  const claims = [...existingClaims];

  for (const incoming of newClaims) {
    const activeSameTopic = claims.find(
      (c) => c.topic === incoming.topic && c.status === "active"
    );

    if (activeSameTopic && activeSameTopic.text !== incoming.text) {
      // Demote the old claim, chain the new one as a correction.
      activeSameTopic.status = "superseded";
      claims.push({ ...incoming, status: "correction", supersedes: activeSameTopic.id });
    } else if (!activeSameTopic) {
      claims.push(incoming);
    }
    // else: identical text already active for this topic — skip, avoid duplicate nodes.
  }

  return claims;
}

// Groups claims by topic into clusters, each with a claim count and
// a "head" (the current active/correction claim — whichever node
// retrieval should treat as the answer for that topic).
export function buildClusters(claims) {
  const byTopic = new Map();
  for (const c of claims) {
    if (!byTopic.has(c.topic)) byTopic.set(c.topic, []);
    byTopic.get(c.topic).push(c);
  }

  return Array.from(byTopic.entries()).map(([topic, topicClaims]) => {
    const sorted = [...topicClaims].sort((a, b) => a.timestamp - b.timestamp);
    const head = sorted.find((c) => c.status === "active" || c.status === "correction");
    return { topic, claims: sorted, count: sorted.length, head };
  });
}

// Walks the supersession chain backward from a claim to its origin,
// oldest first — this is what the Thread detail panel renders.
export function getChain(claims, claimId) {
  const byId = new Map(claims.map((c) => [c.id, c]));
  const chain = [];
  let current = byId.get(claimId);
  while (current) {
    chain.unshift(current);
    current = current.supersedes ? byId.get(current.supersedes) : null;
  }
  return chain;
}
