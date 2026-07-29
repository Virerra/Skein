// Embeddings, always via WebLLM locally -- deliberately decoupled from
// whichever provider is selected for chat/extraction/categorize.
// Anthropic has no embeddings API at all (not a gap in this app, a gap
// in their product -- they point people to a third party, Voyage AI).
// Rather than build a second BYOK path just for this one feature,
// embeddings run locally for everyone regardless of chat provider:
// free, no key, works identically whether you're on Anthropic,
// OpenAI-compatible, or WebLLM for everything else.

import { checkWebLLMSupport } from "./webllm";

// snowflake-arctic-embed-s: small, fast, real embedding model (not a
// chat model repurposed) -- confirmed present in WebLLM's own prebuilt
// config, not assumed. "-b32" is the batch-size variant, since a batch
// of atomic claims is exactly what gets embedded together after an
// extraction run.
export const EMBED_MODEL = "snowflake-arctic-embed-s-q0f32-MLC-b32";

let enginePromise = null;

function getEmbedEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      return webllm.CreateMLCEngine(EMBED_MODEL);
    })();
  }
  return enginePromise;
}

export async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];

  const support = checkWebLLMSupport();
  if (!support.hasWebGPU) {
    throw new Error("Semantic search needs WebGPU, which this browser doesn't expose. " + support.note);
  }

  let engine;
  try {
    engine = await getEmbedEngine();
  } catch (e) {
    enginePromise = null; // don't keep serving a broken init to the next attempt
    throw e;
  }

  let reply;
  try {
    reply = await engine.embeddings.create({ input: texts, model: EMBED_MODEL });
  } catch (e) {
    enginePromise = null; // a broken call likely means a broken engine instance
    throw e;
  }

  return reply.data
    .slice() // response order isn't guaranteed to match input order -- sort by the index WebLLM assigns each embedding
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
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
