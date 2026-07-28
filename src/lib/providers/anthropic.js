// Anthropic Messages API provider. Returns the raw parsed claim array
// ({text, topic}[]) -- extraction.js handles turning that into full
// claim objects (id/timestamp/status), shared across every provider.

export async function extractWithAnthropic({ transcript, systemPrompt, apiKey, model, signal }) {
  if (!apiKey) throw new Error("No Anthropic API key provided.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: transcript }],
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text ?? "[]";
  return JSON.parse(raw.trim());
}
