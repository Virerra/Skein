import { loadStore } from "../lib/store.js";
import { buildClusters, getChain, shortId } from "../lib/graphModel.js";

function statusTag(c, isLast) {
  if (c.status === "discarded") return "DISCARDED";
  if (c.status === "superseded") return "SUPERSEDED";
  if (c.status === "correction") return isLast ? "CORRECTION · CURRENT" : "CORRECTION";
  return isLast ? "ACTIVE · CURRENT" : "ACTIVE";
}

export function runShow(positional) {
  const [query] = positional;
  if (!query) throw new Error("Usage: skein show <topic, label, or text substring>");

  const store = loadStore();
  const q = query.toLowerCase();

  const active = store.claims.filter((c) => c.status !== "discarded");
  const matchingTopics = new Set(
    active
      .filter((c) => c.topic === q || c.label.toLowerCase().includes(q) || c.text.toLowerCase().includes(q))
      .map((c) => c.topic)
  );

  if (matchingTopics.size === 0) {
    console.log(`No claim matching "${query}".`);
    return;
  }

  // Full claims here, not just active -- a chain's history needs its
  // superseded/discarded links to resolve correctly even though those
  // statuses were excluded from the match search above.
  const clusters = buildClusters(store.claims);

  matchingTopics.forEach((topic) => {
    const head = clusters.find((cl) => cl.topic === topic)?.head;
    if (!head) return;
    const chain = getChain(store.claims, head.id);

    console.log(`\n${topic}`);
    chain.forEach((c, i) => {
      console.log(`  ${shortId(c.id)}  [${statusTag(c, i === chain.length - 1)}] ${c.label}`);
      console.log(`    ${c.text}`);
      console.log(`    (${c.sourceChat}, ${new Date(c.timestamp).toLocaleString()})`);
    });
  });
  console.log("");
}
