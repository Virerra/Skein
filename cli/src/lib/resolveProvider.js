// Env vars use each provider's own standard name (ANTHROPIC_API_KEY,
// OPENAI_API_KEY), not a Skein-specific one -- these are the variables
// people already have set from using each provider's own SDK/CLI, and
// matching that expectation beats inventing a new one.

export function resolveProviderConfig(flags) {
  const provider = flags.provider || "anthropic";
  if (provider !== "anthropic" && provider !== "openai") {
    throw new Error(`Unknown provider "${provider}". Use "anthropic" or "openai".`);
  }

  const apiKey = flags.key || (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY);

  // openai can run keyless against a local server (Ollama, LM Studio),
  // so only anthropic strictly requires one here.
  if (!apiKey && provider === "anthropic") {
    throw new Error("No API key found. Set ANTHROPIC_API_KEY or pass --key.");
  }

  return {
    provider,
    apiKey,
    model: flags.model,
    baseUrl: flags["base-url"],
  };
}

// Separate from resolveProviderConfig above -- embeddings can only go
// through OpenAI-compatible regardless of which chat provider was
// picked (Anthropic has no embeddings API), so this always resolves
// against OPENAI_API_KEY / --embed-key, never --key / --provider.
export function resolveEmbedConfig(flags) {
  const apiKey = flags["embed-key"] || process.env.OPENAI_API_KEY;
  const baseUrl = flags["embed-base-url"];

  if (!apiKey && !baseUrl) {
    throw new Error(
      "No embeddings API key found. Set OPENAI_API_KEY or pass --embed-key " +
      "(or point --embed-base-url at a local server that doesn't need one)."
    );
  }

  return { apiKey, model: flags["embed-model"], baseUrl };
}
