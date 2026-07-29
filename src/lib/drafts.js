// Drafts: transcripts saved before extraction, so a failed extraction
// attempt, an accidentally-closed modal, or a page reload never means
// retyping a whole pasted transcript. localStorage, not IndexedDB --
// this is a handful of short-lived text blobs, not graph data, and
// doesn't need a schema migration to add.
//
// Scoped per-workspace, same as everything else -- a draft belongs to
// whichever graph it's about to get extracted into. Without this, a
// draft written while testing in one workspace would still show up
// (and extract into) whatever workspace happens to be active later,
// which defeats the isolation workspaces exist for in the first place.

import { getActiveWorkspaceId } from "./workspace";

function storageKey() {
  return `skein-drafts-${getActiveWorkspaceId()}`;
}

export function getDrafts() {
  try {
    const raw = localStorage.getItem(storageKey());
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
  localStorage.setItem(storageKey(), JSON.stringify(drafts));
}

export function deleteDraft(id) {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(storageKey(), JSON.stringify(drafts));
}
