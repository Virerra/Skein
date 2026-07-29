// Same naive-on-purpose conflict detection as the web app's
// src/lib/graphModel.js: same topic, different text, existing claim
// for that topic still active -> chain it as a correction instead of
// two competing active claims. See that file's comment for the caveat
// (misfires on topics that legitimately hold multiple active claims at
// once).

export function applyNewClaims(existingClaims, newClaims) {
  const claims = [...existingClaims];

  for (const incoming of newClaims) {
    const activeSameTopic = claims.find((c) => c.topic === incoming.topic && c.status === "active");

    if (activeSameTopic && activeSameTopic.text !== incoming.text) {
      activeSameTopic.status = "superseded";
      claims.push({ ...incoming, status: "correction", supersedes: activeSameTopic.id });
    } else if (!activeSameTopic) {
      claims.push(incoming);
    }
  }

  return claims;
}

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
