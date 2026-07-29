// A single JSON file, not SQLite. Two deliberate reasons: SQLite in
// Node means a native-compiled dependency (better-sqlite3 or similar),
// which is exactly the kind of install friction "straight to the
// point" is supposed to avoid -- and a plain JSON file is something a
// technical user can `cat` or `jq` directly, which fits this tool's
// audience better than a binary format would.
//
// Scoped to the current working directory (`.skein/store.json`), not a
// global `~/.skein` -- mirrors how git/npm/etc. scope their own state
// to "this project," which felt like the more useful default for a
// CLI than one global pool. Flag it if you'd rather have a global
// store; it's a small change.
//
// Shape: { claims: [...], embeddings: { [claimId]: number[] } }.
// Embeddings are kept separate from claims, not inlined onto each
// claim object -- an embedding vector is 1500+ floats, and inlining
// that into every claim would make `cat .skein/store.json` unreadable,
// defeating the whole point of choosing plain JSON in the first place.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORE_DIR = ".skein";
const STORE_FILE = join(STORE_DIR, "store.json");

function emptyStore() {
  return { claims: [], embeddings: {} };
}

export function loadStore() {
  if (!existsSync(STORE_FILE)) return emptyStore();
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf-8"));
  } catch (e) {
    throw new Error(`${STORE_FILE} exists but isn't valid JSON: ${e.message}`);
  }
}

export function saveStore(store) {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export function storePath() {
  return STORE_FILE;
}
