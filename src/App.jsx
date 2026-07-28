import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllClaims, putClaim, putClaims } from "./lib/db";
import { extractClaims } from "./lib/extraction";
import { applyNewClaims, buildClusters, getChain } from "./lib/graphModel";
import { runQuery } from "./lib/query";
import { loadSettings, saveSettings, applyTheme } from "./lib/settings";

import { GraphCanvas } from "./components/GraphCanvas";
import { Wordmark } from "./components/Wordmark";
import { IngestPanel } from "./components/IngestPanel";
import { DraftsModal } from "./components/DraftsModal";
import { ThreadPanel } from "./components/ThreadPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ClusterFilter } from "./design/graph/ClusterFilter";
import { QueryBar } from "./design/graph/QueryBar";
import { Button } from "./design/core/Button";
import { Modal } from "./design/core/Modal";
import { assignTopicColors } from "./lib/topicColor";

export default function App() {
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(null); // null = all
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [pendingDraftId, setPendingDraftId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [apiKey, setApiKey] = useState("");
  const abortControllerRef = useRef(null);

  useEffect(() => {
    getAllClaims().then(setClaims).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  function handleSettingsChange(next) {
    setSettings(next);
    saveSettings(next);
  }

  // Discarded claims are hidden from the graph, cluster filter, and
  // query, but the row stays in IndexedDB and still shows up (tagged
  // [DISCARDED]) inside a chain's history via ThreadPanel below --
  // "delete" here means hidden and reversible, not destroyed.
  const activeClaims = useMemo(() => claims.filter((c) => c.status !== "discarded"), [claims]);

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
  }

  async function handleDiscardClaim(id) {
    await handleEditClaim(id, { status: "discarded" });
  }

  function handleQuery(e) {
    const val = e.target.value;
    setQueryText(val);
    if (!val.trim()) {
      setQueryResult(null);
      return;
    }
    const result = runQuery(activeClaims, val);
    setQueryResult(result.summary);
    if (result.matched) {
      setSelectedClaimId(result.chain[result.chain.length - 1].id);
    }
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

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => { setError(null); setPendingDraftId(null); setIngestOpen(true); }}>Add transcript</Button>
          <Button variant="ghost" onClick={() => setDraftsOpen(true)}>Drafts</Button>
        </div>

        {clusterFilterData.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase" }}>
              Clusters
            </div>
            <ClusterFilter
              clusters={clusterFilterData}
              selected={selectedTopics || []}
              onToggle={(topic) =>
                setSelectedTopics((prev) =>
                  prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                )
              }
            />
          </div>
        )}
      </aside>

      <main style={{ position: "relative", padding: "16px", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          {visibleClaims.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              no claims yet — paste a transcript to get started
            </div>
          ) : (
            <GraphCanvas claims={visibleClaims} onSelectClaim={setSelectedClaimId} selectedId={selectedClaimId} topicColors={topicColors} />
          )}
        </div>
        <div style={{ marginTop: "12px" }}>
          <QueryBar value={queryText} onChange={handleQuery} result={queryResult} />
        </div>
      </main>

      <aside style={{ padding: "20px 18px", borderLeft: "1px solid var(--border-default)", overflowY: "auto" }}>
        <ThreadPanel
          chain={selectedChain}
          topic={selectedChain?.[0]?.topic}
          onEdit={handleEditClaim}
          onDiscard={handleDiscardClaim}
        />
      </aside>

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

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} apiKey={apiKey} onApiKeyChange={setApiKey} />
      </Modal>
    </div>
  );
}
