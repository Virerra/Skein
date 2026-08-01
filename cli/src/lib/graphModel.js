// Re-exports the shared claim-graph logic (../../../shared/graphModel.js)
// with a real LLM-backed contradiction checker wired in for
// applyNewClaims -- same logic the web app runs, not a copy of it; only
// the provider call underneath the checker differs (flat provider/model
// params here instead of a settings object). shortId/findClaimByIdPrefix
// below are CLI-only -- the web app has no equivalent need for them.

import {
  applyNewClaims as applyNewClaimsShared,
  buildClusters,
  getChain,
} from "../../../shared/graphModel.js";
import { runProvider } from "./providers/dispatch.js";
import { CONFLICT_CHECK_PROMPT } from "../../../shared/prompts.js";

async function checkContradiction({ existingText, incomingText }, provider, model, apiKey, baseUrl) {
  const content = `A (earlier): "${existingText}"\nB (later): "${incomingText}"`;
  try {
    const result = await runProvider({ content, systemPrompt: CONFLICT_CHECK_PROMPT, provider, model, apiKey, baseUrl });
    const verdict = result?.verdict;
    if (verdict === "contradicts") return true;
    if (verdict === "compatible" || verdict === "uncertain") return false;
    // Anything else -- missing field, a value outside the three
    // expected ones -- means the model didn't actually answer the
    // question asked. Same failure class as the catch below: fail
    // toward the safe default (treat as contradiction) rather than
    // silently resolving an unrecognized response to "don't correct."
    return true;
  } catch {
    // Check itself failed -- fall back to the original naive behavior
    // (treat as contradiction) rather than silently skipping the check.
    return true;
  }
}

export async function applyNewClaims(existingClaims, newClaims, provider, model, apiKey, baseUrl) {
  return applyNewClaimsShared(existingClaims, newClaims, (pair) =>
    checkContradiction(pair, provider, model, apiKey, baseUrl)
  );
}

export { buildClusters, getChain };

// Full ids are UUIDs -- unwieldy to type or paste for a single-claim
// operation like discard/restore/delete. Short id is what actually
// gets shown and typed; git/docker-style prefix matching means you
// only need enough characters to be unambiguous, not the whole thing.
export function shortId(id) {
  return id.slice(0, 8);
}

export function findClaimByIdPrefix(claims, prefix) {
  const p = prefix.toLowerCase();
  const matches = claims.filter((c) => c.id.toLowerCase().startsWith(p));

  if (matches.length === 0) {
    throw new Error(`No claim with id starting "${prefix}". Run \`skein list\` to see ids.`);
  }
  if (matches.length > 1) {
    const shown = matches.slice(0, 5).map((c) => `  ${shortId(c.id)}  ${c.label}`).join("\n");
    throw new Error(`"${prefix}" matches ${matches.length} claims, ambiguous -- use more characters:\n${shown}`);
  }
  return matches[0];
}
