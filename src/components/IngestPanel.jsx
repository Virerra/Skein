import React, { useEffect, useRef, useState } from "react";
import { Button } from "../design/core/Button";
import { TranscriptEditor } from "./TranscriptEditor";
import { getDrafts, saveDraft, deleteDraft } from "../lib/drafts";

export function IngestPanel({ onExtract, onCancel, busy, error }) {
  const [drafts, setDrafts] = useState(() => getDrafts());
  const [draftId, setDraftId] = useState(null);
  const [sourceChat, setSourceChat] = useState("");
  const [transcript, setTranscript] = useState("");
  const saveTimer = useRef(null);
  // Bumped only when the user explicitly loads a different draft or
  // starts fresh -- NOT by the auto-save effect below, which silently
  // assigns a draft its first id in the background. If the editor were
  // keyed on draftId directly, that first auto-save would remount it
  // mid-typing (new id -> new key -> React tears down and rebuilds the
  // contentEditable node) and kick focus out right after someone
  // pastes a large transcript.
  const [editorKey, setEditorKey] = useState(0);

  // Debounced auto-save -- nothing typed here is lost to a failed
  // extraction, a closed modal, or a reloaded page. A draft is created
  // lazily on the first real keystroke, not before, so an untouched
  // ingest form doesn't clutter the drafts list with empty entries.
  useEffect(() => {
    if (!sourceChat.trim() && !transcript.trim()) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const id = draftId || crypto.randomUUID();
      if (!draftId) setDraftId(id);
      saveDraft({ id, sourceChat, transcript, updatedAt: Date.now() });
      setDrafts(getDrafts());
    }, 600);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceChat, transcript]);

  function loadDraft(d) {
    setDraftId(d.id);
    setSourceChat(d.sourceChat);
    setTranscript(d.transcript);
    setEditorKey((k) => k + 1);
  }

  function startNew() {
    setDraftId(null);
    setSourceChat("");
    setTranscript("");
    setEditorKey((k) => k + 1);
  }

  function removeDraft(id, e) {
    e.stopPropagation();
    deleteDraft(id);
    setDrafts(getDrafts());
    if (draftId === id) startNew();
  }

  // onExtract resolves true/false (App.jsx) rather than throwing, so
  // this can tell the difference between "worked, clean up the draft"
  // and "failed, leave the draft exactly as it is" without duplicating
  // App's own error handling here.
  async function handleExtractClick() {
    const succeeded = await onExtract({ sourceChat, transcript });
    if (succeeded && draftId) {
      deleteDraft(draftId);
      setDrafts(getDrafts());
      startNew();
    }
  }

  const otherDrafts = drafts.filter((d) => d.id !== draftId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {otherDrafts.length > 0 && (
        <div>
          <div style={labelStyle}>Saved drafts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
            {otherDrafts.map((d) => (
              <div key={d.id} onClick={() => loadDraft(d)} style={draftRowStyle}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.sourceChat || "untitled"} — {new Date(d.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button onClick={(e) => removeDraft(d.id, e)} style={draftDeleteStyle} aria-label="Delete draft">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        placeholder="Silo name, e.g. Database decision thread"
        value={sourceChat}
        onChange={(e) => setSourceChat(e.target.value)}
        disabled={busy}
        style={inputStyle}
      />
      <TranscriptEditor
        key={editorKey}
        initialValue={transcript}
        onChange={setTranscript}
        placeholder="Paste the full transcript here"
      />

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: "flex", gap: "8px" }}>
        <Button variant="primary" disabled={busy || !transcript.trim()} onClick={handleExtractClick}>
          {busy ? "Extracting…" : "Extract claims"}
        </Button>
        {busy && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        {!busy && (sourceChat || transcript) && (
          <Button variant="ghost" onClick={startNew}>Clear</Button>
        )}
      </div>

      <div style={hintStyle}>
        Saved as a draft automatically while you type — safe to close this, switch providers in Settings, or retry after a failure without retyping.
      </div>
    </div>
  );
}

const labelStyle = {
  font: "var(--text-mono-sm)",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const hintStyle = {
  font: "var(--text-mono-sm)",
  color: "var(--text-muted)",
};

const inputStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  outline: "none",
};

const draftRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "6px 10px",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const draftDeleteStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "15px",
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const errorStyle = {
  font: "var(--text-mono-sm)",
  color: "var(--color-bronze)",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
};
