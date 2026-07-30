// Re-exports the shared claim-graph logic (../../shared/graphModel.js)
// with a real LLM-backed contradiction checker wired in for
// applyNewClaims -- see that file for the actual conflict-detection and
// chain-building behavior. Same logic the CLI runs, not a copy of it;
// only the provider call underneath the checker differs.

import {
  applyNewClaims as applyNewClaimsShared,
  buildClusters,
  getChain,
} from "../../shared/graphModel";
import { runProvider } from "./providers/dispatch";
import { CONFLICT_CHECK_PROMPT } from "../../shared/prompts";

async function checkContradiction({ existingText, incomingText }, settings, apiKey, signal) {
  const content = `A (earlier): "${existingText}"\nB (later): "${incomingText}"`;
  try {
    const result = await runProvider({ content, systemPrompt: CONFLICT_CHECK_PROMPT, settings, apiKey, signal });
    return typeof result?.contradicts === "boolean" ? result.contradicts : true;
  } catch {
    // Check itself failed -- fall back to the original naive behavior
    // (treat as contradiction) rather than silently skipping the check.
    return true;
  }
}

export async function applyNewClaims(existingClaims, newClaims, settings, apiKey, signal) {
  return applyNewClaimsShared(existingClaims, newClaims, (pair) =>
    checkContradiction(pair, settings, apiKey, signal)
  );
}

export { buildClusters, getChain };
