// Strips a markdown code fence if the model wrapped its JSON answer in
// one anyway (common even when told not to), then parses. On failure,
// throws with a snippet of what actually came back instead of a bare,
// undiagnosable JSON.parse error -- mirrors the web app's version in
// src/lib/providers/parseClaimsResponse.js.

export function parseClaimsResponse(raw) {
  const text = (raw ?? "").trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch {
    const snippet = candidate.slice(0, 300);
    throw new Error(
      `Model did not return valid JSON. First 300 characters of what it sent back: ${snippet || "(empty response)"}`
    );
  }
}
