// Every provider asks the model for a raw JSON array and gets back
// plain text it has to parse itself. Two things reliably go wrong:
//
// 1. The model wraps the array in a ```json ... ``` fence anyway,
//    despite being told not to -- common enough across providers and
//    transcript content that it needs handling, not hoping around.
// 2. When parsing fails, a bare JSON.parse error tells you nothing
//    about what the model actually sent back, which makes the failure
//    undiagnosable from the UI. Surface a snippet of the raw text.

export function parseClaimsResponse(raw) {
  const text = (raw ?? "").trim();

  // Strip a leading/trailing ```json or ``` fence if present.
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
