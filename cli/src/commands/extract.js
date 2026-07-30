import { readFileSync } from "node:fs";
import { extractClaims } from "../lib/extraction.js";
import { applyNewClaims } from "../lib/graphModel.js";
import { loadStore, saveStore, storePath } from "../lib/store.js";
import { resolveProviderConfig } from "../lib/resolveProvider.js";

export async function runExtract(positional, flags) {
  const [file] = positional;
  if (!file) {
    throw new Error(
      'Usage: skein extract <file> [--source "name"] [--provider anthropic|openai] [--model id] [--key sk-...]'
    );
  }

  const transcript = readFileSync(file, "utf-8");
  const { provider, apiKey, model, baseUrl } = resolveProviderConfig(flags);

  process.stderr.write(`Extracting from ${file}...\n`);
  const newClaims = await extractClaims({
    transcript,
    sourceChat: flags.source || file,
    provider,
    model,
    apiKey,
    baseUrl,
  });

  const store = loadStore();
  store.claims = await applyNewClaims(store.claims, newClaims, provider, model, apiKey, baseUrl);
  saveStore(store);

  console.log(`Extracted ${newClaims.length} claim${newClaims.length === 1 ? "" : "s"} -> ${storePath()}`);
  newClaims.forEach((c) => console.log(`  [${c.topic}] ${c.label}`));

  return newClaims;
}
