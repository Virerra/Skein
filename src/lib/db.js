// Minimal IndexedDB wrapper for Skein's claim graph.
// Schema, deliberately simple for the first vertical slice:
//
// claim: {
//   id: string (uuid)
//   text: string            -- the atomic claim, in the source's own words
//   topic: string            -- naive topic label, e.g. "database"
//   timestamp: number         -- ms epoch, when the claim was made (source chat time)
//   sourceChat: string        -- name of the silo/chat this came from
//   status: "active" | "superseded" | "correction"
//   supersedes: string | null -- id of the claim this one replaces, if any
// }
//
// Nothing is ever deleted or overwritten by an extraction run. A new
// claim that conflicts with an existing one on the same topic gets
// status "correction" and supersedes: <old id>. The old claim's status
// flips from "active" to "superseded" — but the row itself stays.

const DB_NAME = "skein";
const DB_VERSION = 1;
const STORE = "claims";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("topic", "topic", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllClaims() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putClaim(claim) {
  return withStore("readwrite", (store) => store.put(claim));
}

export async function putClaims(claims) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    claims.forEach((c) => store.put(c));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  return withStore("readwrite", (store) => store.clear());
}
