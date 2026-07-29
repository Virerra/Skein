// Embeddings, BYOK via OpenAI-compatible only. Anthropic has no
// embeddings API at all (true on the web app side too -- see that
// project's providers/embed.js), and there's no WebLLM-equivalent free
// local option in plain Node. Same OpenAI-compatible adapter as chat
// (providers/openaiCompatible.js): real OpenAI, or any locally-running
// server that implements the same /embeddings shape.

import { embedWithOpenAICompatible } from "./providers/openaiCompatible.js";

export async function embedTexts(texts, { apiKey, model, baseUrl } = {}) {
  return embedWithOpenAICompatible({ texts, apiKey, model, baseUrl });
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
