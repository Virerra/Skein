// Extraction: turns a pasted transcript into a list of atomic claims.
//
// Thin dispatcher over pluggable providers (src/lib/providers/) -- each
// provider is responsible only for "transcript in, raw {text, topic}[]
// out"; the claim-shaping tail below (id/timestamp/status) is shared so
// every provider produces identical claim objects.

import { extractWithAnthropic } from "./providers/anthropic";
import { extractWithOpenAICompatible } from "./providers/openaiCompatible";
import { extractWithWebLLM } from "./providers/webllm";

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

export async function extractClaims({ transcript, sourceChat, settings, apiKey, signal }) {
  if (!transcript?.trim()) throw new Error("Transcript is empty.");

  const provider = settings?.provider || "anthropic";
  const model = settings?.model;
  let parsed;

  try {
    if (provider === "anthropic") {
      parsed = await extractWithAnthropic({ transcript, systemPrompt: EXTRACTION_SYSTEM_PROMPT, apiKey, model, signal });
    } else if (provider === "openai-compatible") {
      parsed = await extractWithOpenAICompatible({
        transcript,
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        apiKey,
        model,
        baseUrl: settings?.baseUrl,
        signal,
      });
    } else if (provider === "webllm") {
      parsed = await extractWithWebLLM({ transcript, systemPrompt: EXTRACTION_SYSTEM_PROMPT, model, signal });
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Extraction cancelled.");
    }
    if (e instanceof SyntaxError) {
      throw new Error("Model did not return valid JSON.");
    }
    throw e;
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
