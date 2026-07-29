import { categorizeClaims } from "../lib/categorize.js";
import { loadStore, saveStore, storePath } from "../lib/store.js";
import { resolveProviderConfig } from "../lib/resolveProvider.js";

export async function runCategorize(positional, flags) {
  const { provider, apiKey, model, baseUrl } = resolveProviderConfig(flags);
  const store = loadStore();

  if (store.claims.length === 0) {
    console.log("No claims yet -- run `skein extract` first.");
    return;
  }

  process.stderr.write(`Categorizing ${store.claims.length} claim${store.claims.length === 1 ? "" : "s"}...\n`);
  store.claims = await categorizeClaims({ claims: store.claims, provider, model, apiKey, baseUrl });
  saveStore(store);

  console.log(`Categorized -> ${storePath()}`);
}
