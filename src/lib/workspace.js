// A workspace is a completely separate IndexedDB database, not a
// filter flag on shared data. Two reasons this is the right model,
// not just a convenient one:
//
// 1. Trivial, safe reset. "Start a fresh graph for testing" becomes
//    indexedDB.deleteDatabase() on one workspace's own database --
//    there's no query filter anywhere that could accidentally touch
//    another workspace's rows, because there's no shared table for a
//    bug to leak across in the first place.
// 2. It matches the actual mental model. A workspace isn't "some of my
//    claims," it's a different graph entirely -- different claims,
//    different relations, different positions, different embeddings.
//    Separate databases are what that actually *is*, not an
//    approximation of it.
//
// Workspace metadata (the list of workspaces, which one is active)
// lives in localStorage, not inside any workspace's own database --
// has to, since the whole point is that a workspace's data is
// isolated, so something outside all of them has to track which one
// you're looking at.

const WORKSPACES_KEY = "skein-workspaces";
const ACTIVE_KEY = "skein-active-workspace";

// "default" is the one workspace that existed before this feature did.
// It deliberately maps to the original bare "skein" database name, not
// "skein-default" -- anyone upgrading with real data already in that
// database keeps it exactly where it is, silently becomes their "Main"
// workspace, and nothing needs to migrate.
const DEFAULT_WORKSPACE = { id: "default", name: "Main", createdAt: 0 };

export function getWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return [DEFAULT_WORKSPACE];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_WORKSPACE];
  } catch {
    return [DEFAULT_WORKSPACE];
  }
}

function saveWorkspaces(workspaces) {
  try {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  } catch {
    // storage unavailable -- fails open, same as everywhere else this
    // app touches localStorage
  }
}

export function getActiveWorkspaceId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || "default";
  } catch {
    return "default";
  }
}

export function setActiveWorkspaceId(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // see above
  }
}

export function dbNameForWorkspace(id) {
  return id === "default" ? "skein" : `skein-${id}`;
}

export function createWorkspace(name) {
  const workspace = { id: crypto.randomUUID(), name: name.trim() || "Untitled", createdAt: Date.now() };
  saveWorkspaces([...getWorkspaces(), workspace]);
  return workspace;
}

export function renameWorkspace(id, name) {
  saveWorkspaces(getWorkspaces().map((w) => (w.id === id ? { ...w, name: name.trim() || w.name } : w)));
}

// Removes the workspace from the list and drops its IndexedDB database
// outright -- this is the one place in the whole app where "delete"
// means delete with zero recovery path, not a discard. Refuses to
// remove the last remaining workspace; there always has to be
// somewhere to land.
export async function deleteWorkspace(id) {
  const workspaces = getWorkspaces();
  if (workspaces.length <= 1) {
    throw new Error("Can't delete the only workspace.");
  }

  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbNameForWorkspace(id));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    // Another tab/connection still has it open -- don't hang the UI
    // waiting; it'll actually clear once that connection closes.
    req.onblocked = () => resolve();
  });

  saveWorkspaces(workspaces.filter((w) => w.id !== id));

  if (getActiveWorkspaceId() === id) {
    const remaining = getWorkspaces();
    setActiveWorkspaceId(remaining[0].id);
  }
}
