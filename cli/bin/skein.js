#!/usr/bin/env node

import { runExtract } from "../src/commands/extract.js";
import { runCategorize } from "../src/commands/categorize.js";
import { runRelabel } from "../src/commands/relabel.js";
import { runAll } from "../src/commands/all.js";
import { runList } from "../src/commands/list.js";
import { runShow } from "../src/commands/show.js";
import { runQueryCommand } from "../src/commands/query.js";
import { runDiscard } from "../src/commands/discard.js";
import { runRestore } from "../src/commands/restore.js";
import { runDelete } from "../src/commands/delete.js";
import { runDiscarded } from "../src/commands/discarded.js";
import { parseArgs } from "../src/lib/args.js";

const HELP = `Skein CLI -- paste a transcript, get atomic claims, no graph required.

Usage:
  skein extract <file>       Extract claims from a transcript file
  skein categorize           Re-label topics across all claims
  skein relabel              Refresh node names across all claims (not topics)
  skein all <file>           extract, then categorize, in one go
  skein list                 List all claims, grouped by topic (shows ids)
  skein show <query>         Show a full chain by topic, label, or text match
  skein query "<question>"   Ask a question, answered from your own claims
  skein discard <id>         Soft-remove a claim (recoverable)
  skein restore <id>         Bring a discarded claim back
  skein discarded            List discarded claims and their ids
  skein delete <id> --yes    Permanently remove a claim (not recoverable)

Ids are short (8 chars), shown by \`list\`/\`show\`/\`discarded\`. Enough
characters to be unambiguous is enough to type -- \`skein discard a1b2\`
works the same as the full id, same convention as git/docker.

Flags (extract / categorize / relabel / all / query -- chat provider):
  --source "name"            Silo name for extract (defaults to the filename)
  --provider anthropic|openai   Default: anthropic
  --model <id>                Default: provider's cheapest/fastest
  --key <api-key>             Or set ANTHROPIC_API_KEY / OPENAI_API_KEY
  --base-url <url>            openai provider against a local server (Ollama, etc.)

Flags (query -- embeddings, always OpenAI-compatible regardless of --provider above):
  --embed-key <api-key>        Or set OPENAI_API_KEY
  --embed-model <id>           Default: text-embedding-3-small
  --embed-base-url <url>       Against a local server instead of OpenAI

Store: .skein/store.json in the current directory.`;

const COMMANDS = {
  extract: runExtract,
  categorize: runCategorize,
  relabel: runRelabel,
  all: runAll,
  list: runList,
  show: runShow,
  query: runQueryCommand,
  discard: runDiscard,
  restore: runRestore,
  delete: runDelete,
  discarded: runDiscarded,
};

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h" || !COMMANDS[command]) {
    console.log(HELP);
    process.exit(command && !["--help", "-h"].includes(command) ? 1 : 0);
  }

  const { positional, flags } = parseArgs(rest);

  try {
    await COMMANDS[command](positional, flags);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
