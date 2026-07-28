// Extraction: turns a pasted transcript into a list of atomic claims.
//
// This is the BYOK path (user supplies their own Anthropic API key,
// held only in memory for the session, never persisted). The WebLLM
// in-browser path is a separate module to be added once the
// COOP/COEP header question is resolved for GitHub Pages hosting.

const EXTRACTION_SYSTEM_PROMPT = `You extract atomic claims from a pasted AI chat transcript.

A claim is one of:
- a decision ("we're using Postgres")
- a stated fact ("context windows are measured in tokens")
- an open question ("still need to decide on auth")

Rules:
- Each claim must be a single, self-contained sentence in the user's own
  words (not the assistant's phrasing, unless the user explicitly agreed).
- Assign a short lowercase topic label (1-2 words, e.g. "database",
  "auth", "deployment") so claims on the same subject can be clustered
  later, even across different transcripts.
- Do not invent claims that aren't actually stated. Skip greetings,
  meta-commentary, and anything too vague to be a discrete claim.
- Respond with ONLY a JSON array, no prose, no markdown fences. Each
  element: {"text": string, "topic": string}`;

export async function extractClaims({ transcript, apiKey, sourceChat }) {
  if (!apiKey) throw new Error("No API key provided.");
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Extraction request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text ?? "[]";

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error("Model did not return valid JSON. Raw output: " + raw.slice(0, 300));
  }

  const now = Date.now();
  return parsed.map((c, i) => ({
    id: crypto.randomUUID(),
    text: c.text,
    topic: (c.topic || "general").toLowerCase().trim(),
    timestamp: now + i, // preserves extraction order when source has no per-claim time
    sourceChat: sourceChat || "untitled chat",
    status: "active",
    supersedes: null,
  }));
}
