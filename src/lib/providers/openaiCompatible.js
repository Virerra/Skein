// Generic OpenAI Chat Completions-shaped provider. Covers OpenAI itself,
// Gemini's OpenAI-compatible endpoint, and any locally-running server
// that speaks the same shape (Ollama, LM Studio, vLLM, etc.) -- "local
// model" is just this same adapter pointed at a custom base URL with no
// or an optional key, not a separate code path.

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export async function extractWithOpenAICompatible({ transcript, systemPrompt, apiKey, model, baseUrl, signal }) {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Request to ${base} failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  return JSON.parse(raw.trim());
}
