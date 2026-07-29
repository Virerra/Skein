// Extraction: turns a pasted transcript into a list of atomic claims.
//
// Thin dispatcher over pluggable providers (src/lib/providers/) -- each
// provider is responsible only for "transcript in, raw
// {text, topic, label}[] out"; the claim-shaping tail below
// (id/timestamp/status) is shared so every provider produces identical
// claim objects.

import { runProvider } from "./providers/dispatch";
import { relabelClaims } from "./relabel";
import { EXTRACTION_PROMPT } from "../../shared/prompts";

export async function extractClaims({ transcript, sourceChat, settings, apiKey, signal }) {
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const parsed = await runProvider({ content: transcript, systemPrompt: EXTRACTION_PROMPT, settings, apiKey, signal });

  const now = Date.now();
  let claims = parsed.map((c, i) => ({
    id: crypto.randomUUID(),
    text: c.text,
    topic: (c.topic || "general").toLowerCase().trim(),
    label: (c.label || "").trim(), // may be empty here -- filled in below, not immediately truncated
    timestamp: now + i, // preserves extraction order when source has no per-claim time
    sourceChat: sourceChat || "untitled chat",
    status: "active",
    supersedes: null,
  }));

  // If the model complied with everything except the label (a real,
  // observed failure mode, especially on smaller models asked to fill
  // three fields in one JSON response), follow up with a dedicated,
  // much simpler relabel call before resorting to truncated text. This
  // is what makes the raw-text fallback below an actual last resort
  // instead of the common case.
  const missingLabels = claims.filter((c) => !c.label);
  if (missingLabels.length > 0) {
    try {
      const relabeled = await relabelClaims({ claims: missingLabels, settings, apiKey, signal });
      const byId = new Map(relabeled.map((r) => [r.id, r.label]));
      claims = claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
    } catch {
      // Best-effort -- if the follow-up call itself fails, the
      // truncation fallback below still applies. Never worse than
      // before this existed, just an extra chance to do better.
    }
  }

  return claims.map((c) => ({
    ...c,
    label: c.label || (c.text.length > 28 ? c.text.slice(0, 28) + "…" : c.text),
  }));
}
