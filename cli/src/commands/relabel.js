import { relabelClaims } from "../lib/relabel.js";
import { loadStore, saveStore, storePath } from "../lib/store.js";
import { resolveProviderConfig } from "../lib/resolveProvider.js";

export async function runRelabel(positional, flags) {
  const { provider, apiKey, model, baseUrl } = resolveProviderConfig(flags);
  const store = loadStore();

  if (store.claims.length === 0) {
    console.log("No claims yet -- run `skein extract` first.");
    return;
  }

  process.stderr.write(`Relabeling ${store.claims.length} claim${store.claims.length === 1 ? "" : "s"}...\n`);
  const relabeled = await relabelClaims({ claims: store.claims, provider, model, apiKey, baseUrl });
  const byId = new Map(relabeled.map((r) => [r.id, r.label]));
  store.claims = store.claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
  saveStore(store);

  console.log(`Relabeled ${byId.size} claim${byId.size === 1 ? "" : "s"} -> ${storePath()}`);
}
