import { loadStore, saveStore } from "../lib/store.js";
import { findClaimByIdPrefix, shortId } from "../lib/graphModel.js";

export function runDiscard(positional) {
  const [idPrefix] = positional;
  if (!idPrefix) throw new Error("Usage: skein discard <id> -- get the id from `skein list` or `skein show`");

  const store = loadStore();
  const claim = findClaimByIdPrefix(store.claims, idPrefix);

  if (claim.status === "discarded") {
    console.log(`${shortId(claim.id)} is already discarded.`);
    return;
  }

  claim.previousStatus = claim.status;
  claim.status = "discarded";
  saveStore(store);

  console.log(`Discarded ${shortId(claim.id)}  ${claim.label}`);
  console.log(`Restore with: skein restore ${shortId(claim.id)}`);
}
