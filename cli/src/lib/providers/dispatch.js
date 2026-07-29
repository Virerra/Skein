// Dispatch across providers -- deliberately just two, not three. The
// web app's third provider (WebLLM) is a browser-only, WebGPU-backed
// local model; there's no equivalent free local path being offered
// here. BYOK only, matching who this CLI is actually for.

import { extractWithAnthropic } from "./anthropic.js";
import { extractWithOpenAICompatible } from "./openaiCompatible.js";

export async function runProvider({ content, systemPrompt, provider, model, apiKey, baseUrl }) {
  if (provider === "anthropic") {
    return extractWithAnthropic({ transcript: content, systemPrompt, apiKey, model });
  }
  if (provider === "openai") {
    return extractWithOpenAICompatible({ transcript: content, systemPrompt, apiKey, model, baseUrl });
  }
  throw new Error(`Unknown provider: ${provider}. Use "anthropic" or "openai".`);
}
