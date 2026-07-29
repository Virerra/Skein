// Anthropic Messages API. Same shape as the web app's version
// (src/lib/providers/anthropic.js) with one deliberate difference: no
// "anthropic-dangerous-direct-browser-access" header. That header
// exists to bypass a browser's CORS restriction on direct API calls
// from client-side JS -- Node has no such restriction, so including it
// here would be cargo-culting a fix for a problem that doesn't exist
// in this environment.

import { parseClaimsResponse } from "./parseClaimsResponse.js";

export async function extractWithAnthropic({ transcript, systemPrompt, apiKey, model }) {
  if (!apiKey) throw new Error("No Anthropic API key. Set ANTHROPIC_API_KEY or pass --key.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: transcript }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text ?? "[]";
  return parseClaimsResponse(raw);
}
