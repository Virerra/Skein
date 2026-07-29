import { loadStore, saveStore } from "../lib/store.js";
import { resolveProviderConfig, resolveEmbedConfig } from "../lib/resolveProvider.js";
import { runQuery } from "../lib/query.js";

export async function runQueryCommand(positional, flags) {
  // Joining positional args with a space means both `skein query "why
  // postgres?"` and `skein query why postgres` work the same way --
  // more forgiving than requiring the question to be quoted.
  const question = positional.join(" ");
  if (!question.trim()) {
    throw new Error(
      'Usage: skein query "<question>" [--provider anthropic|openai] [--embed-key sk-...] [--embed-model id] [--embed-base-url url]'
    );
  }

  const { provider, apiKey, model, baseUrl } = resolveProviderConfig(flags);
  const embed = resolveEmbedConfig(flags);

  const store = loadStore();
  if (store.claims.length === 0) {
    console.log("No claims yet -- run `skein extract` first.");
    return;
  }

  process.stderr.write("Searching...\n");
  let result;
  try {
    result = await runQuery(store, question, { provider, model, apiKey, baseUrl, embed });
  } finally {
    // Backfilled embeddings are computed (and paid for) before
    // synthesis runs -- save them even if synthesis itself throws, or
    // a failed answer would silently cost the same embedding calls
    // again next time.
    saveStore(store);
  }

  if (!result.matched) {
    console.log("No claims to search yet.");
    return;
  }

  console.log(`\n${result.answer}\n`);
  console.log("Sources:");
  result.sources.forEach((c, i) => {
    const marker = result.citedIndices.includes(i + 1) ? "*" : " ";
    console.log(` ${marker}[${i + 1}] (${c.topic}) ${c.label}`);
  });
  console.log("");
}
