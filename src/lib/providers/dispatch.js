// Shared "system prompt + content in, parsed JSON array out" dispatch
// across the three providers. Both extraction and categorization need
// exactly this shape, just with different prompts and payloads.

import { extractWithAnthropic } from "./anthropic";
import { extractWithOpenAICompatible } from "./openaiCompatible";
import { extractWithWebLLM } from "./webllm";

export async function runProvider({ content, systemPrompt, settings, apiKey, signal }) {
  const provider = settings?.provider || "anthropic";
  const model = settings?.models?.[provider];

  try {
    if (provider === "anthropic") {
      return await extractWithAnthropic({ transcript: content, systemPrompt, apiKey, model, signal });
    }
    if (provider === "openai-compatible") {
      return await extractWithOpenAICompatible({ transcript: content, systemPrompt, apiKey, model, baseUrl: settings?.baseUrl, signal });
    }
    if (provider === "webllm") {
      return await extractWithWebLLM({ transcript: content, systemPrompt, model, signal });
    }
    throw new Error(`Unknown provider: ${provider}`);
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Cancelled.");
    throw e;
  }
}
