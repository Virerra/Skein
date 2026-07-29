// IndexedDB wrapper for Skein's claim graph.
//
// claim: {
//   id: string (uuid)
//   text: string               -- the atomic claim, in the source's own words
//   topic: string               -- topic label, e.g. "database"
//   timestamp: number            -- ms epoch, when the claim was made (source chat time)
//   sourceChat: string           -- name of the silo/chat this came from
//   status: "active" | "superseded" | "correction" | "discarded"
//   supersedes: string | null    -- id of the claim this one replaces, if any
// }
//
// Nothing is ever deleted or overwritten by an extraction run. A new
// claim that conflicts with an existing one on the same topic gets
// status "correction" and supersedes: <old id>. The old claim's status
// flips from "active" to "superseded" — but the row itself stays.
//
// relation: {
//   id: string (uuid)
//   a: string, b: string  -- claim ids, undirected (a/b order isn't meaningful)
//   createdAt: number
// }
//
// A relation is a manually-declared "these are connected" link between
// two claims, independent of topic clustering and independent of
// supersession -- e.g. tying a claim in one topic to a claim in
// another that the topic labels alone don't capture.
//
// position: { id: string, x: number, y: number }
//
// Where a node currently sits on the canvas -- separate from claims
// because it's a view concern, not part of what a claim *is*, and
// because drag gestures update far too often (every pointermove) to
// write through the claims store without visible jank. Only written at
// the end of a drag, and after a full layout recompute.

const DB_NAME = "skein";
const DB_VERSION = 3;
const CLAIMS_STORE = "claims";
const RELATIONS_STORE = "relations";
const POSITIONS_STORE = "positions";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CLAIMS_STORE)) {
        const store = db.createObjectStore(CLAIMS_STORE, { keyPath: "id" });
        store.createIndex("topic", "topic", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains(RELATIONS_STORE)) {
        db.createObjectStore(RELATIONS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(POSITIONS_STORE)) {
        db.createObjectStore(POSITIONS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putOne(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putMany(storeName, records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    records.forEach((r) => store.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteOne(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const getAllClaims = () => getAll(CLAIMS_STORE);
export const putClaim = (claim) => putOne(CLAIMS_STORE, claim);
export const putClaims = (claims) => putMany(CLAIMS_STORE, claims);
export const clearAll = () => clearStore(CLAIMS_STORE);

export const getAllRelations = () => getAll(RELATIONS_STORE);
export const putRelation = (relation) => putOne(RELATIONS_STORE, relation);
export const deleteRelation = (id) => deleteOne(RELATIONS_STORE, id);

export const getAllPositions = () => getAll(POSITIONS_STORE);
export const putPositions = (positions) => putMany(POSITIONS_STORE, positions);
