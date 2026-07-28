import React, { useEffect, useMemo, useState } from "react";
import { getAllClaims, putClaims } from "./lib/db";
import { extractClaims } from "./lib/extraction";
import { applyNewClaims, buildClusters, getChain } from "./lib/graphModel";
import { runQuery } from "./lib/query";

import { GraphCanvas } from "./components/GraphCanvas";
import { IngestPanel } from "./components/IngestPanel";
import { ThreadPanel } from "./components/ThreadPanel";
import { ClusterFilter } from "./design/graph/ClusterFilter";
import { QueryBar } from "./design/graph/QueryBar";

const TOPIC_COLORS = ["#DECD87", "#B2945B", "#7A8CA3", "#9BA87A", "#B08BA0"];

export default function App() {
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(null); // null = all
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState(null);

  useEffect(() => {
    getAllClaims().then(setClaims).catch((e) => setError(e.message));
  }, []);

  const clusters = useMemo(() => buildClusters(claims), [claims]);

  const clusterFilterData = useMemo(
    () =>
      clusters.map((cl, i) => ({
        id: cl.topic,
        name: cl.topic,
        color: TOPIC_COLORS[i % TOPIC_COLORS.length],
        count: cl.count,
      })),
    [clusters]
  );

  useEffect(() => {
    if (selectedTopics === null && clusters.length > 0) {
      setSelectedTopics(clusters.map((c) => c.topic));
    }
  }, [clusters, selectedTopics]);

  const visibleClaims = useMemo(() => {
    if (!selectedTopics) return claims;
    return claims.filter((c) => selectedTopics.includes(c.topic));
  }, [claims, selectedTopics]);

  const selectedChain = useMemo(() => {
    if (!selectedClaimId) return null;
    return getChain(claims, selectedClaimId);
  }, [claims, selectedClaimId]);

  async function handleExtract({ apiKey, sourceChat, transcript }) {
    setBusy(true);
    setError(null);
    try {
      const newClaims = await extractClaims({ transcript, apiKey, sourceChat });
      const merged = applyNewClaims(claims, newClaims);
      await putClaims(merged);
      setClaims(merged);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleQuery(e) {
    const val = e.target.value;
    setQueryText(val);
    if (!val.trim()) {
      setQueryResult(null);
      return;
    }
    const result = runQuery(claims, val);
    setQueryResult(result.summary);
    if (result.matched) {
      setSelectedClaimId(result.chain[result.chain.length - 1].id);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", height: "100vh", background: "var(--surface-base)" }}>
      <aside style={{ padding: "20px 16px", borderRight: "1px solid var(--border-default)", overflowY: "auto" }}>
        <div style={{ font: "var(--text-heading)", fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "18px" }}>
          Ske<span style={{ color: "var(--color-gold)" }}>ı</span>n
        </div>

        <IngestPanel onExtract={handleExtract} busy={busy} />
        {error && (
          <div style={{ marginTop: "10px", color: "#c97b6b", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{error}</div>
        )}

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
            <GraphCanvas claims={visibleClaims} onSelectClaim={setSelectedClaimId} selectedId={selectedClaimId} />
          )}
        </div>
        <div style={{ marginTop: "12px" }}>
          <QueryBar value={queryText} onChange={handleQuery} result={queryResult} />
        </div>
      </main>

      <aside style={{ padding: "20px 18px", borderLeft: "1px solid var(--border-default)", overflowY: "auto" }}>
        <ThreadPanel chain={selectedChain} topic={selectedChain?.[0]?.topic} />
      </aside>
    </div>
  );
}
