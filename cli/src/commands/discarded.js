import { loadStore } from "../lib/store.js";
import { shortId } from "../lib/graphModel.js";

export function runDiscarded() {
  const store = loadStore();
  const discarded = store.claims.filter((c) => c.status === "discarded");

  if (discarded.length === 0) {
    console.log("Nothing discarded.");
    return;
  }

  console.log(`${discarded.length} discarded claim${discarded.length === 1 ? "" : "s"}:\n`);
  discarded.forEach((c) => {
    console.log(`  ${shortId(c.id)}  (${c.topic}) ${c.label}`);
  });
  console.log("\nRestore with: skein restore <id>");
  console.log("Delete permanently with: skein delete <id> --yes");
}
