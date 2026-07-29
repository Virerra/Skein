import { loadStore, saveStore } from "../lib/store.js";
import { findClaimByIdPrefix, shortId } from "../lib/graphModel.js";

export function runRestore(positional) {
  const [idPrefix] = positional;
  if (!idPrefix) throw new Error("Usage: skein restore <id> -- get the id from `skein discarded`");

  const store = loadStore();
  const claim = findClaimByIdPrefix(store.claims, idPrefix);

  if (claim.status !== "discarded") {
    console.log(`${shortId(claim.id)} isn't discarded.`);
    return;
  }

  claim.status = claim.previousStatus || "active";
  delete claim.previousStatus;
  saveStore(store);

  console.log(`Restored ${shortId(claim.id)}  ${claim.label}  [${claim.status}]`);
}
