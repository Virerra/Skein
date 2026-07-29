import { loadStore, saveStore } from "../lib/store.js";
import { findClaimByIdPrefix, shortId } from "../lib/graphModel.js";

// The one real delete in the CLI, same as the web app's Discarded
// view: an actual removal, not a status flag. Gated behind --yes
// rather than an interactive confirmation prompt -- this CLI is meant
// to be scriptable, and a prompt that blocks on stdin is exactly the
// kind of thing that silently hangs a script or a piped invocation.
// Requiring the flag explicitly is the scriptable equivalent of
// "are you sure."
export function runDelete(positional, flags) {
  const [idPrefix] = positional;
  if (!idPrefix) throw new Error("Usage: skein delete <id> --yes -- get the id from `skein list` or `skein discarded`");

  const store = loadStore();
  const claim = findClaimByIdPrefix(store.claims, idPrefix);

  if (!flags.yes && !flags.y) {
    console.log(`About to permanently delete:\n  ${shortId(claim.id)}  [${claim.status}] ${claim.label}\n  "${claim.text}"`);
    console.log("\nThis can't be undone. Re-run with --yes to confirm.");
    process.exitCode = 1;
    return;
  }

  store.claims = store.claims.filter((c) => c.id !== claim.id);

  // No relation cleanup here -- unlike the web app, this CLI has no
  // `relate` command at all (a deliberate scope call: relations only
  // affect how the web app's graph draws connections, and there's no
  // graph here to draw), so there's nothing to clean up.
  //
  // Embedding for this id is left in place, same as the web app:
  // genuinely inert once the claim itself is gone, not worth a delete
  // path for storage that'll never be read again.
  saveStore(store);

  console.log(`Permanently deleted ${shortId(claim.id)}  ${claim.label}`);
}
