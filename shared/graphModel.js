// Shared with the CLI via ../cli/src/lib/graphModel.js -- the same
// rationale as shared/prompts.js: this is the actual conflict-detection
// and chain-building behavior, and it needs to behave identically on
// both sides, not just similarly. Zero provider/environment-specific
// code lives here on purpose.
//
// applyNewClaims takes an optional async checkContradiction callback
// instead of importing a provider call directly. That keeps this file
// pure and trivially testable (inject a fake checker, no network
// needed) while still letting real callers wire up an LLM-backed check.
// Each side's own graphModel.js supplies its own checker, built from its
// own provider layer (see CONFLICT_CHECK_PROMPT in shared/prompts.js) --
// the web app passes a `settings` object through, the CLI passes flat
// provider/model params, same split as everywhere else the two differ.

export async function applyNewClaims(existingClaims, newClaims, checkContradiction) {
  const claims = [...existingClaims];

  for (const incoming of newClaims) {
    const activeSameTopic = claims.find(
      (c) => c.topic === incoming.topic && c.status === "active"
    );

    if (activeSameTopic && activeSameTopic.text !== incoming.text) {
      // Same topic, different text used to mean "automatic correction,"
      // full stop -- the naive heuristic this function has always been
      // documented as having. That conflates "shares a topic" with
      // "contradicts," which breaks for claims that differ in scope,
      // not truth. When a checker is provided, ask it before assuming a
      // contradiction. No checker, or the check itself throws -- fall
      // back to the original behavior (treat as contradiction) rather
      // than silently doing something new and unverified the moment the
      // check breaks.
      const contradicts = checkContradiction
        ? await checkContradiction({ existingText: activeSameTopic.text, incomingText: incoming.text })
        : true;

      if (contradicts) {
        activeSameTopic.status = "superseded";
        claims.push({ ...incoming, status: "correction", supersedes: activeSameTopic.id });
      } else {
        // Genuinely different scope -- both stay active, nothing gets
        // marked corrected. buildClusters below still only surfaces one
        // active claim per topic as the "head" (first match wins), so
        // retrieval/graph display may only show one of the two until
        // that's extended to support real coexisting claims per topic.
        // Known, smaller follow-up -- strictly better than the
        // alternative this replaces, which was silently marking a claim
        // "corrected" when nothing about it was actually wrong.
        claims.push(incoming);
      }
    } else if (!activeSameTopic) {
      claims.push(incoming);
    }
    // else: identical text already active for this topic — skip, avoid duplicate nodes.
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
