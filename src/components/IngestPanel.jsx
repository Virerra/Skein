import React, { useState } from "react";
import { Card } from "../design/core/Card";
import { Button } from "../design/core/Button";

export function IngestPanel({ onExtract, busy }) {
  const [apiKey, setApiKey] = useState("");
  const [sourceChat, setSourceChat] = useState("");
  const [transcript, setTranscript] = useState("");

  return (
    <Card padding="18px">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span style={{ font: "var(--text-subheading)", color: "var(--text-primary)" }}>Add chat transcript</span>

        <input
          placeholder="Anthropic API key (kept in memory only, never saved)"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Silo name, e.g. Database decision thread"
          value={sourceChat}
          onChange={(e) => setSourceChat(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Paste the full transcript here"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-ui)" }}
        />

        <Button
          variant="primary"
          disabled={busy || !apiKey || !transcript.trim()}
          onClick={() => onExtract({ apiKey, sourceChat, transcript })}
        >
          {busy ? "Extracting…" : "Extract claims"}
        </Button>
      </div>
    </Card>
  );
}

const inputStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-neu-sm)",
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  outline: "none",
};
