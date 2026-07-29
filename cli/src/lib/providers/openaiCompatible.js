// Generic OpenAI Chat Completions-shaped provider. Covers OpenAI
// itself and any locally-running server that speaks the same shape
// (Ollama, LM Studio, vLLM). Identical to the web app's version
// (src/lib/providers/openaiCompatible.js) -- nothing here was
// browser-specific to begin with.

import { parseClaimsResponse } from "./parseClaimsResponse.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export async function extractWithOpenAICompatible({ transcript, systemPrompt, apiKey, model, baseUrl }) {
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
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Request to ${base} failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  return parseClaimsResponse(raw);
}

// New: neither this CLI nor the web app had a BYOK embeddings path
// before this -- the web app always embeds locally via WebLLM, which
// has no equivalent in plain Node, so this is what query needs to
// exist at all here. Real OpenAI /embeddings endpoint shape; also
// works against a local server that implements the same route.
export async function embedWithOpenAICompatible({ texts, apiKey, model, baseUrl }) {
  if (!texts || texts.length === 0) return [];
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");

  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model: model || "text-embedding-3-small", input: texts }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Embeddings request to ${base} failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  // Response order isn't guaranteed to match input order -- sort by
  // the index the API assigns each embedding, same defensive handling
  // as the web app's WebLLM embedder.
  return data.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
