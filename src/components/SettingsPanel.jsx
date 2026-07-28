import React from "react";
import { checkWebLLMSupport } from "../lib/providers/webllm";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (BYOK)" },
  { id: "openai-compatible", label: "OpenAI-compatible (BYOK or local model)" },
  { id: "webllm", label: "WebLLM (free, in-browser, experimental)" },
];

const MODEL_PLACEHOLDER = {
  anthropic: "claude-haiku-4-5-20251001",
  "openai-compatible": "gpt-4o-mini",
  webllm: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
};

export function SettingsPanel({ settings, onSettingsChange, apiKey, onApiKeyChange }) {
  const webllmSupport = settings.provider === "webllm" ? checkWebLLMSupport() : null;

  function set(patch) {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={labelStyle}>Model provider</div>
        <select value={settings.provider} onChange={(e) => set({ provider: e.target.value })} style={fieldStyle}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {(settings.provider === "anthropic" || settings.provider === "openai-compatible") && (
        <div>
          <div style={labelStyle}>API key {settings.provider === "openai-compatible" ? "(optional for local servers)" : ""}</div>
          <input
            type="password"
            placeholder="kept in memory only, never saved"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            style={fieldStyle}
          />
        </div>
      )}

      {settings.provider === "openai-compatible" && (
        <div>
          <div style={labelStyle}>Base URL</div>
          <input
            placeholder="https://api.openai.com/v1"
            value={settings.baseUrl}
            onChange={(e) => set({ baseUrl: e.target.value })}
            style={fieldStyle}
          />
          <div style={hintStyle}>Point this at a local server (e.g. http://localhost:11434/v1) to use your own model.</div>
        </div>
      )}

      {settings.provider !== "webllm" && (
        <div>
          <div style={labelStyle}>Model</div>
          <input
            placeholder={MODEL_PLACEHOLDER[settings.provider]}
            value={settings.model}
            onChange={(e) => set({ model: e.target.value })}
            style={fieldStyle}
          />
        </div>
      )}

      {settings.provider === "webllm" && (
        <div>
          <div style={labelStyle}>Model</div>
          <input
            placeholder={MODEL_PLACEHOLDER.webllm}
            value={settings.model}
            onChange={(e) => set({ model: e.target.value })}
            style={fieldStyle}
          />
          <div style={{ ...hintStyle, color: webllmSupport.hasWebGPU ? "var(--text-muted)" : "var(--color-bronze)" }}>
            {webllmSupport.note}
          </div>
        </div>
      )}

      <div>
        <div style={labelStyle}>Theme</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["dark", "light"].map((t) => (
            <button
              key={t}
              onClick={() => set({ theme: t })}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "var(--radius-md)",
                border: settings.theme === t ? "1px solid var(--border-accent)" : "1px solid var(--border-default)",
                background: settings.theme === t ? "var(--surface-raised)" : "transparent",
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
                fontSize: "13px",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
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
  marginTop: "6px",
};

const fieldStyle = {
  width: "100%",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  outline: "none",
};
