// Drafts: transcripts saved before extraction, so a failed extraction
// attempt, an accidentally-closed modal, or a page reload never means
// retyping a whole pasted transcript. localStorage, not IndexedDB --
// this is a handful of short-lived text blobs, not graph data, and
// doesn't need a schema migration to add.

const STORAGE_KEY = "skein-drafts";

export function getDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft) {
  const drafts = getDrafts();
  const idx = drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) drafts[idx] = draft;
  else drafts.unshift(draft);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function deleteDraft(id) {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}
