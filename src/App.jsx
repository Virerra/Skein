import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllClaims, putClaim, putClaims, deleteClaims, getAllRelations, putRelation, deleteRelation, deleteRelations, putEmbeddings } from "./lib/db";
import { extractClaims } from "./lib/extraction";
import { categorizeClaims } from "./lib/categorize";
import { relabelClaims } from "./lib/relabel";
import { suggestRelations } from "./lib/relate";
import { embedTexts } from "./lib/providers/embed";
import { applyNewClaims, buildClusters, getChain } from "./lib/graphModel";
import { runQuery } from "./lib/query";
import { loadSettings, saveSettings, applyTheme } from "./lib/settings";
import { loadRememberedApiKey, saveRememberedApiKey, getRememberPreference, setRememberPreference } from "./lib/keyStorage";
import { getWorkspaces, getActiveWorkspaceId, setActiveWorkspaceId, createWorkspace, renameWorkspace, deleteWorkspace } from "./lib/workspace";

import { GraphCanvas } from "./components/GraphCanvas";
import { Wordmark } from "./components/Wordmark";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";
import { IngestPanel } from "./components/IngestPanel";
import { DraftsModal } from "./components/DraftsModal";
import { DiscardedModal } from "./components/DiscardedModal";
import { QueryAnswerPanel } from "./components/QueryAnswerPanel";
import { NodeMiniWindow } from "./components/NodeMiniWindow";
import { SettingsPanel } from "./components/SettingsPanel";
import { ClusterFilter } from "./design/graph/ClusterFilter";
import { QueryBar } from "./design/graph/QueryBar";
import { Button } from "./design/core/Button";
import { Modal } from "./design/core/Modal";
import { assignTopicColors } from "./lib/topicColor";

export default function App() {
  const [claims, setClaims] = useState([]);
  const [relations, setRelations] = useState([]);
  const [workspaces, setWorkspaces] = useState(getWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(getActiveWorkspaceId);
  const [relateMode, setRelateMode] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [relabeling, setRelabeling] = useState(false);
  const [suggestingRelations, setSuggestingRelations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(null); // null = all
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [miniWindowAnchor, setMiniWindowAnchor] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState(null); // full {matched, answer, sources, citedIndices} from runQuery, not a one-line summary
  const [queryBusy, setQueryBusy] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [discardedOpen, setDiscardedOpen] = useState(false);
  const [pendingDraftId, setPendingDraftId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [apiKey, setApiKey] = useState(loadRememberedApiKey);
  const [rememberApiKey, setRememberApiKeyState] = useState(getRememberPreference);
  const abortControllerRef = useRef(null);
  const graphRef = useRef(null);
  const [pendingFocusId, setPendingFocusId] = useState(null);

  useEffect(() => {
    Promise.all([getAllClaims(), getAllRelations()])
      .then(([c, r]) => {
        setClaims(c);
        setRelations(r);
      })
      .catch((e) => setError(e.message));
    // Deliberately re-runs on workspace switch, not just on mount --
    // db.js reads the active workspace at call time (see openDB), so
    // getAllClaims()/getAllRelations() here are already pointed at
    // whichever database is now current; this just needs to actually
    // fire again to pull it in.
  }, [activeWorkspaceId]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Shared by switch and delete-of-the-active-workspace -- anything
  // that only makes sense in the context of a specific workspace's
  // graph (a selection, an open query answer, a topic filter) carrying
  // over from a different graph would be actively confusing, not a
  // convenience.
  function resetWorkspaceScopedUI() {
    setSelectedClaimId(null);
    setMiniWindowAnchor(null);
    setSelectedTopics(null);
    setQueryText("");
    setQueryResult(null);
    setQueryError(null);
    setError(null);
    setRelateMode(false);
  }

  function handleSwitchWorkspace(id) {
    if (id === activeWorkspaceId) return;
    setActiveWorkspaceId(id);
    setActiveWorkspaceIdState(id);
    resetWorkspaceScopedUI();
  }

  function handleCreateWorkspace(name) {
    const workspace = createWorkspace(name);
    setWorkspaces(getWorkspaces());
    handleSwitchWorkspace(workspace.id);
  }

  function handleRenameWorkspace(id, name) {
    renameWorkspace(id, name);
    setWorkspaces(getWorkspaces());
  }

  async function handleDeleteWorkspace(id) {
    const wasActive = id === activeWorkspaceId;
    try {
      await deleteWorkspace(id);
      setWorkspaces(getWorkspaces());
      if (wasActive) {
        setActiveWorkspaceIdState(getActiveWorkspaceId());
        resetWorkspaceScopedUI();
      }
    } catch (e) {
      setError(e.message);
    }
  }

  function handleSettingsChange(next) {
    setSettings(next);
    saveSettings(next);
  }

  function handleApiKeyChange(key) {
    setApiKey(key);
    saveRememberedApiKey(key); // no-op internally unless rememberApiKey is on
  }

  function handleRememberChange(remember) {
    setRememberApiKeyState(remember);
    setRememberPreference(remember);
    if (remember) saveRememberedApiKey(apiKey); // capture whatever's currently typed in, not just future changes
  }

  // Discarded claims are hidden from the graph, cluster filter, and
  // query, but the row stays in IndexedDB and still shows up (tagged
  // [DISCARDED]) inside a chain's history via ThreadPanel below --
  // "delete" here means hidden and reversible, not destroyed.
  const activeClaims = useMemo(() => claims.filter((c) => c.status !== "discarded"), [claims]);
  const discardedClaims = useMemo(() => claims.filter((c) => c.status === "discarded"), [claims]);

  const clusters = useMemo(() => buildClusters(activeClaims), [activeClaims]);

  const topicColors = useMemo(
    () => assignTopicColors(clusters.map((cl) => cl.topic), settings.theme),
    [clusters, settings.theme]
  );

  const clusterFilterData = useMemo(
    () =>
      clusters.map((cl) => ({
        id: cl.topic,
        name: cl.topic,
        color: topicColors.get(cl.topic),
        count: cl.count,
      })),
    [clusters, topicColors]
  );

  // Newly-appearing topics default to visible -- whether they showed up
  // from a fresh extraction or from recategorizing an existing claim.
  // Topics the user has already toggled off stay off.
  useEffect(() => {
    setSelectedTopics((prev) => {
      const topics = clusters.map((c) => c.topic);
      if (prev === null) return topics;
      const newOnes = topics.filter((t) => !prev.includes(t));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    });
  }, [clusters]);

  const visibleClaims = useMemo(() => {
    if (!selectedTopics) return activeClaims;
    return activeClaims.filter((c) => selectedTopics.includes(c.topic));
  }, [activeClaims, selectedTopics]);

  // Waits for a claim to actually be visible (its topic might need
  // revealing first via handleLocate below) before asking GraphCanvas
  // to center on it -- calling focusNode before the node has ever been
  // positioned would silently do nothing.
  useEffect(() => {
    if (!pendingFocusId) return;
    if (visibleClaims.some((c) => c.id === pendingFocusId)) {
      const ok = graphRef.current?.focusNode(pendingFocusId);
      if (ok) setPendingFocusId(null);
    }
  }, [pendingFocusId, visibleClaims]);

  function handleLocate() {
    if (!selectedClaimId) return;
    const claim = claims.find((c) => c.id === selectedClaimId);
    if (!claim) return;
    setSelectedTopics((prev) => (prev && !prev.includes(claim.topic) ? [...prev, claim.topic] : prev));
    setPendingFocusId(selectedClaimId);
  }

  // Chain history uses the full, unfiltered claim list so a discarded
  // claim that was a link in a chain still appears in its history.
  const selectedChain = useMemo(() => {
    if (!selectedClaimId) return null;
    return getChain(claims, selectedClaimId);
  }, [claims, selectedClaimId]);

  async function handleExtract({ sourceChat, transcript }) {
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const newClaims = await extractClaims({ transcript, sourceChat, settings, apiKey, signal: controller.signal });
      const merged = applyNewClaims(claims, newClaims);
      await putClaims(merged);
      setClaims(merged);
      setIngestOpen(false);

      // Best-effort -- embeds new claims now so the first query after
      // this doesn't have to wait on it. If this fails for any reason
      // (WebGPU unavailable, etc.), runQuery's own lazy backfill picks
      // up anything still missing the next time a query needs it.
      embedTexts(newClaims.map((c) => c.text))
        .then((vectors) => putEmbeddings(newClaims.map((c, i) => ({ id: c.id, vector: vectors[i] }))))
        .catch(() => {});

      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancelExtract() {
    abortControllerRef.current?.abort();
  }

  async function handleEditClaim(id, updates) {
    const claim = claims.find((c) => c.id === id);
    if (!claim) return;
    const updated = { ...claim, ...updates };
    await putClaim(updated);
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // The stored embedding reflects the old text -- stale the moment
    // it changes. Best-effort, same fallback as extraction: query.js's
    // lazy backfill catches it if this fails.
    if (updates.text && updates.text !== claim.text) {
      embedTexts([updated.text])
        .then(([vector]) => putEmbeddings([{ id, vector }]))
        .catch(() => {});
    }
  }

  async function handleDiscardClaim(id) {
    const claim = claims.find((c) => c.id === id);
    if (!claim || claim.status === "discarded") return;
    await handleEditClaim(id, { status: "discarded", previousStatus: claim.status });
  }

  // Discards every non-discarded claim in a topic at once -- the
  // sidebar's per-cluster trash icon. Same previousStatus preservation
  // as a single discard, just applied to the whole set in one write.
  async function handleDiscardCluster(topic) {
    const affected = claims.filter((c) => c.topic === topic && c.status !== "discarded");
    if (affected.length === 0) return;
    if (
      !window.confirm(
        `Discard all ${affected.length} claim${affected.length === 1 ? "" : "s"} in "${topic}"? They'll move to Discarded, where you can restore or permanently delete them.`
      )
    ) {
      return;
    }
    const updated = claims.map((c) =>
      c.topic === topic && c.status !== "discarded" ? { ...c, status: "discarded", previousStatus: c.status } : c
    );
    await putClaims(updated);
    setClaims(updated);
  }

  // Restores to whatever status was saved at discard time -- not
  // hardcoded to "active". A claim that was "correction" or already
  // "superseded" when discarded goes back to exactly that, not to a
  // status it never actually had.
  //
  // Known edge case, left unhandled deliberately: if a claim was
  // discarded while active, and a *new* extraction ran on that same
  // topic in the meantime, restoring the old one can produce two
  // simultaneously "active" claims for one topic -- something normal
  // extraction flow never produces on its own. Rare enough (needs that
  // exact sequence) that building around it now would be exactly the
  // speculative-completeness trap worth avoiding; revisit if it
  // actually happens.
  async function handleRestoreClaims(ids) {
    const idSet = new Set(ids);
    const updated = claims.map((c) => {
      if (!idSet.has(c.id)) return c;
      const { previousStatus, ...rest } = c;
      return { ...rest, status: previousStatus || "active" };
    });
    await putClaims(updated);
    setClaims(updated);
  }

  // The one real delete in the app -- everywhere else, "gone" means
  // "discarded," recoverable. This removes the row from IndexedDB
  // outright, plus any relations pointing at it (dangling relations
  // otherwise sit unused forever -- harmless, but not clean). Positions
  // and embeddings for a deleted id are left as-is: genuinely inert
  // once the claim itself is gone, and adding delete paths for two
  // more stores wasn't worth it for storage that'll never be read
  // again anyway.
  async function handlePermanentlyDeleteClaims(ids) {
    const idSet = new Set(ids);
    await deleteClaims(ids);
    setClaims((prev) => prev.filter((c) => !idSet.has(c.id)));

    const orphanedRelations = relations.filter((r) => idSet.has(r.a) || idSet.has(r.b));
    if (orphanedRelations.length > 0) {
      await deleteRelations(orphanedRelations.map((r) => r.id));
      setRelations((prev) => prev.filter((r) => !idSet.has(r.a) && !idSet.has(r.b)));
    }

    if (selectedClaimId && idSet.has(selectedClaimId)) {
      handleCloseMiniWindow();
    }
  }

  function handleQueryChange(e) {
    setQueryText(e.target.value);
  }

  async function handleQuerySubmit() {
    if (!queryText.trim() || queryBusy) return;
    setQueryBusy(true);
    setQueryError(null);
    try {
      const result = await runQuery(activeClaims, queryText, { settings, apiKey });
      setQueryResult(result);
      if (result.matched && result.sources.length > 0) {
        setSelectedClaimId(null); // a fresh query supersedes whatever node mini-window was open
        setMiniWindowAnchor(null);
      }
    } catch (e) {
      setQueryError(e.message);
      setQueryResult(null);
    } finally {
      setQueryBusy(false);
    }
  }

  async function handleCategorize() {
    if (activeClaims.length === 0) return;
    setCategorizing(true);
    setError(null);
    try {
      const updated = await categorizeClaims({ claims, settings, apiKey });
      await putClaims(updated);
      setClaims(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setCategorizing(false);
    }
  }

  // Separate from Categorize on purpose -- refreshes only labels, never
  // touches topic. The direct fix for claims stuck showing raw
  // truncated text as their node name: older claims from before the
  // label field existed, or ones where the model silently dropped it.
  async function handleRelabel() {
    if (activeClaims.length === 0) return;
    setRelabeling(true);
    setError(null);
    try {
      const relabeled = await relabelClaims({ claims, settings, apiKey });
      const byId = new Map(relabeled.map((r) => [r.id, r.label]));
      const updated = claims.map((c) => (byId.has(c.id) ? { ...c, label: byId.get(c.id) } : c));
      await putClaims(updated);
      setClaims(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setRelabeling(false);
    }
  }

  function relationKey(aId, bId) {
    return [aId, bId].sort().join("::");
  }

  async function handleCreateRelation(aId, bId) {
    if (aId === bId) return;
    const key = relationKey(aId, bId);
    if (relations.some((r) => relationKey(r.a, r.b) === key)) return;
    const relation = { id: crypto.randomUUID(), a: aId, b: bId, createdAt: Date.now() };
    await putRelation(relation);
    setRelations((prev) => [...prev, relation]);
  }

  async function handleDeleteRelation(id) {
    await deleteRelation(id);
    setRelations((prev) => prev.filter((r) => r.id !== id));
  }

  // Separate from handleCreateRelation, not a loop calling it -- that
  // would dedupe against stale state on every iteration (setRelations
  // hasn't committed yet mid-loop), letting the model's own duplicate
  // or mirrored (a,b) vs (b,a) suggestions slip past the check. This
  // builds one dedup set up front and writes the whole batch at once.
  async function handleSuggestRelations() {
    if (activeClaims.length < 2) return;
    setSuggestingRelations(true);
    setError(null);
    try {
      const pairs = await suggestRelations({ claims: activeClaims, settings, apiKey });
      const seen = new Set(relations.map((r) => relationKey(r.a, r.b)));
      const fresh = [];
      for (const { a, b } of pairs) {
        const key = relationKey(a, b);
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push({ id: crypto.randomUUID(), a, b, createdAt: Date.now() });
      }
      if (fresh.length > 0) {
        await Promise.all(fresh.map(putRelation));
        setRelations((prev) => [...prev, ...fresh]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSuggestingRelations(false);
    }
  }

  function handleSelectClaim(id, anchor) {
    setSelectedClaimId(id);
    setMiniWindowAnchor(anchor || null);
  }

  function handleOpenSource(id) {
    setSelectedClaimId(id);
    setMiniWindowAnchor(null); // opened from the side panel, not a graph click -- no position to anchor near, so it centers
  }

  function handleCloseMiniWindow() {
    setSelectedClaimId(null);
    setMiniWindowAnchor(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", height: "100vh", background: "var(--surface-base)" }}>
      <aside style={{ padding: "20px 16px", borderRight: "1px solid var(--border-default)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Wordmark />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            style={{
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              fontSize: "15px",
              lineHeight: 1,
            }}
          >
            ⚙
          </button>
        </div>

        <div style={{ marginTop: "14px", marginBottom: "16px" }}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
            onSwitch={handleSwitchWorkspace}
            onCreate={handleCreateWorkspace}
            onRename={handleRenameWorkspace}
            onDelete={handleDeleteWorkspace}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => { setError(null); setPendingDraftId(null); setIngestOpen(true); }}>Add transcript</Button>
          <Button variant="ghost" onClick={() => setDraftsOpen(true)}>Drafts</Button>
        </div>

        <div style={{ marginTop: "8px" }}>
          <Button variant="ghost" onClick={() => setDiscardedOpen(true)}>
            Discarded{discardedClaims.length > 0 ? ` (${discardedClaims.length})` : ""}
          </Button>
        </div>

        {clusterFilterData.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Clusters
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleRelabel}
                  disabled={relabeling}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: relabeling ? "var(--text-muted)" : "var(--accent-primary)",
                    font: "var(--text-mono-sm)",
                    cursor: relabeling ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  {relabeling ? "Relabeling…" : "Relabel"}
                </button>
                <button
                  onClick={handleCategorize}
                  disabled={categorizing}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: categorizing ? "var(--text-muted)" : "var(--accent-primary)",
                    font: "var(--text-mono-sm)",
                    cursor: categorizing ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  {categorizing ? "Categorizing…" : "Categorize"}
                </button>
              </div>
            </div>
            <ClusterFilter
              clusters={clusterFilterData}
              selected={selectedTopics || []}
              onToggle={(topic) =>
                setSelectedTopics((prev) =>
                  prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                )
              }
              onDiscardCluster={handleDiscardCluster}
            />
          </div>
        )}
      </aside>

      <main style={{ position: "relative", padding: "16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "8px" }}>
          <Button variant="ghost" size="sm" onClick={handleSuggestRelations} disabled={suggestingRelations}>
            {suggestingRelations ? "Finding connections…" : "Suggest relations"}
          </Button>
          <Button variant={relateMode ? "correction" : "ghost"} size="sm" onClick={() => setRelateMode((v) => !v)}>
            {relateMode ? "Done connecting" : "Make relations"}
          </Button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {visibleClaims.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              no claims yet — paste a transcript to get started
            </div>
          ) : (
            <GraphCanvas
              key={activeWorkspaceId}
              ref={graphRef}
              claims={visibleClaims}
              onSelectClaim={handleSelectClaim}
              selectedId={selectedClaimId}
              topicColors={topicColors}
              relations={relations}
              relateMode={relateMode}
              onCreateRelation={handleCreateRelation}
              onDeleteRelation={handleDeleteRelation}
            />
          )}
        </div>
        <div style={{ marginTop: "12px" }}>
          <QueryBar value={queryText} onChange={handleQueryChange} onSubmit={handleQuerySubmit} busy={queryBusy} />
        </div>
      </main>

      <aside style={{ padding: "20px 18px", borderLeft: "1px solid var(--border-default)", overflowY: "auto" }}>
        <QueryAnswerPanel
          queryText={queryText}
          busy={queryBusy}
          error={queryError}
          result={queryResult}
          onOpenSource={handleOpenSource}
        />
      </aside>

      <NodeMiniWindow
        chain={selectedChain}
        topic={selectedChain?.[0]?.topic}
        anchor={miniWindowAnchor}
        onClose={handleCloseMiniWindow}
        onEdit={handleEditClaim}
        onDiscard={handleDiscardClaim}
        onLocate={handleLocate}
      />

      <Modal
        open={ingestOpen}
        onClose={() => {
          if (busy) handleCancelExtract();
          setIngestOpen(false);
        }}
        title="Add chat transcript"
      >
        <IngestPanel onExtract={handleExtract} onCancel={handleCancelExtract} busy={busy} error={error} initialDraftId={pendingDraftId} />
      </Modal>

      <DraftsModal
        open={draftsOpen}
        onClose={() => setDraftsOpen(false)}
        onOpenDraft={(id) => {
          setDraftsOpen(false);
          setError(null);
          setPendingDraftId(id);
          setIngestOpen(true);
        }}
      />

      <DiscardedModal
        open={discardedOpen}
        onClose={() => setDiscardedOpen(false)}
        discardedClaims={discardedClaims}
        onRestore={handleRestoreClaims}
        onPermanentlyDelete={handlePermanentlyDeleteClaims}
      />

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          rememberApiKey={rememberApiKey}
          onRememberApiKeyChange={handleRememberChange}
        />
      </Modal>
    </div>
  );
}
