// Relabeling, split out as its own action rather than only living
// inside extraction/categorize's larger prompts. Two reasons:
//
// 1. Reliability. "Extract claims, assign a topic, assign a label" is
//    a compound task; a weaker model can comply with two of three
//    fields and silently drop the label, and the only visible symptom
//    is a node showing raw truncated claim text instead of a name --
//    exactly the "still no naming system" complaint this exists to
//    fix. Asking for JUST a label, given text that's already settled,
//    is a much simpler task and far more likely to actually come back.
// 2. Control. Categorize already touches every claim's topic; forcing
//    someone to run that bigger, more disruptive operation just to fix
//    names (not touching topics at all) was the wrong coupling.

import { runProvider } from "./providers/dispatch";
import { RELABEL_PROMPT } from "../../shared/prompts";

export async function relabelClaims({ claims, settings, apiKey, signal }) {
  const candidates = claims.filter((c) => c.status !== "discarded");
  if (candidates.length === 0) return [];

  const payload = JSON.stringify(candidates.map((c) => ({ id: c.id, text: c.text })));
  const result = await runProvider({ content: payload, systemPrompt: RELABEL_PROMPT, settings, apiKey, signal });

  return result
    .filter((r) => r?.id && r?.label)
    .map((r) => ({ id: r.id, label: r.label.trim() }));
}
