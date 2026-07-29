// Prompt shared with the web app via ../../../shared/prompts.js -- the
// claim-shaping tail below (id/timestamp/status, the relabel
// follow-up, the truncation fallback) is CLI-specific and stays here.

import { runProvider } from "./providers/dispatch.js";
import { relabelClaims } from "./relabel.js";
import { randomUUID } from "node:crypto";
import { EXTRACTION_PROMPT } from "../../../shared/prompts.js";

export async function extractClaims({ transcript, sourceChat, provider, model, apiKey, baseUrl }) {
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const parsed = await runProvider({ content: transcript, systemPrompt: EXTRACTION_PROMPT, provider, model, apiKey, baseUrl });

  const now = Date.now();
  let claims = parsed.map((c, i) => ({
    id: randomUUID(),
    text: c.text,
    topic: (c.topic || "general").toLowerCase().trim(),
    label: (c.label || "").trim(), // may be empty here -- filled below, not immediately truncated
    timestamp: now + i,
    sourceChat: sourceChat || "untitled",
    status: "active",
    supersedes: null,
  }));

  // Same reliability fix as the web app: if the model complied with
  // topic but dropped label (a compound-task failure mode, especially
  // on smaller/cheaper models), a dedicated single-purpose follow-up
  // call is far more likely to actually produce one than truncated
  // text ever will. This is what makes the fallback below an actual
  // last resort.
  const missingLabels = claims.filter((c) => !c.label);
  if (missingLabels.length > 0) {
    try {
      const relabeled = await relabelClaims({ claims: missingLabels, provider, model, apiKey, baseUrl });
      const byId = new Map(relabeled.map((r) => [r.id, r.label]));
      claims = claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
    } catch {
      // Best-effort -- falls through to truncation below.
    }
  }

  return claims.map((c) => ({
    ...c,
    label: c.label || (c.text.length > 28 ? c.text.slice(0, 28) + "…" : c.text),
  }));
}
