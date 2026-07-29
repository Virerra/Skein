import { loadStore } from "../lib/store.js";
import { buildClusters, shortId } from "../lib/graphModel.js";

export function runList() {
  const store = loadStore();
  const active = store.claims.filter((c) => c.status !== "discarded");

  if (active.length === 0) {
    console.log("No claims yet -- run `skein extract` first.");
    return;
  }

  const clusters = buildClusters(active).sort((a, b) => a.topic.localeCompare(b.topic));

  clusters.forEach((cluster) => {
    console.log(`\n${cluster.topic} (${cluster.count})`);
    cluster.claims.forEach((c) => {
      const tag = c.status === "superseded" ? "superseded" : c.status === "correction" ? "correction" : "active";
      console.log(`  ${shortId(c.id)}  [${tag}] ${c.label}`);
    });
  });
  console.log("");
}
