// The default, whole-pipeline command -- extract, then categorize, in
// one shot. Deliberately doesn't include relate: relations only affect
// how the web app's graph draws connections between clusters right
// now, they don't feed retrieval or anything else functional, so they
// have nothing to contribute to a tool with no graph to draw.

import { runExtract } from "./extract.js";
import { runCategorize } from "./categorize.js";

export async function runAll(positional, flags) {
  await runExtract(positional, flags);
  await runCategorize(positional, flags);
}
