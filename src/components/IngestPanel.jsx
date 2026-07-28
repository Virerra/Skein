import React, { useState } from "react";
import { Button } from "../design/core/Button";
import { TranscriptEditor } from "./TranscriptEditor";

export function IngestPanel({ onExtract, onCancel, busy }) {
  const [sourceChat, setSourceChat] = useState("");
  const [transcript, setTranscript] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input
        placeholder="Silo name, e.g. Database decision thread"
        value={sourceChat}
        onChange={(e) => setSourceChat(e.target.value)}
        disabled={busy}
        style={inputStyle}
      />
      <TranscriptEditor onChange={setTranscript} placeholder="Paste the full transcript here" />

      <div style={{ display: "flex", gap: "8px" }}>
        <Button
          variant="primary"
          disabled={busy || !transcript.trim()}
          onClick={() => onExtract({ sourceChat, transcript })}
        >
          {busy ? "Extracting…" : "Extract claims"}
        </Button>
        {busy && (
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

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
