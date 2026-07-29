import React, { useEffect, useState } from "react";
import { checkWebLLMSupport, listWebLLMModels, RECOMMENDED_WEBLLM_MODELS } from "../lib/providers/webllm";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (BYOK)" },
  { id: "openai-compatible", label: "OpenAI-compatible (BYOK or local model)" },
  { id: "webllm", label: "WebLLM (free, in-browser, experimental)" },
];

// Curated shortlists for the dropdown. Anthropic and OpenAI-compatible
// both also offer a "Custom" option below since new hosted models ship
// often and local servers (Ollama, LM Studio, vLLM) use arbitrary names
// no fixed list could predict. WebLLM deliberately has no Custom escape
// hatch -- see listWebLLMModels() in providers/webllm.js: its dropdown
// is populated from the installed package's own valid model list, so
// there's no way to type in an ID that doesn't exist.
const ANTHROPIC_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — fastest, cheapest (recommended)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
];

const OPENAI_COMPATIBLE_MODELS = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini (recommended, cheap)" },
  { id: "gpt-4o", label: "gpt-4o" },
];

const CUSTOM = "__custom__";

export function SettingsPanel({ settings, onSettingsChange, apiKey, onApiKeyChange, rememberApiKey, onRememberApiKeyChange }) {
  const provider = settings.provider;
  const model = settings.models?.[provider] || "";
  const webllmSupport = provider === "webllm" ? checkWebLLMSupport() : null;
  const [webllmModels, setWebllmModels] = useState(null); // null = still loading
  const [webllmError, setWebllmError] = useState(null);
  const [confirmedModel, setConfirmedModel] = useState(null);
  // Explicit flag for "user picked Custom and hasn't typed a real value
  // yet" -- can't infer this from model alone, since clearing model to
  // "" to make room for typing would otherwise look identical to "no
  // default has been set," and the effect below would instantly
  // overwrite it back to the preset before a keystroke landed.
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    setCustomMode(false);
  }, [provider]);

  useEffect(() => {
    if (provider !== "webllm" || webllmModels) return;
    listWebLLMModels()
      .then(setWebllmModels)
      .catch((e) => setWebllmError(e.message || "Couldn't load the WebLLM model list."));
  }, [provider, webllmModels]);

  // Give each provider a real default the first time it's used, rather
  // than leaving its slot blank until the user picks something -- an
  // empty field is easy to mistake for "nothing saved yet." Each
  // provider has its own slot (settings.models[provider]), so switching
  // providers never shows a stale model from a different provider.
  // Skipped entirely while customMode is active -- see above.
  useEffect(() => {
    if (customMode || model) return;
    if (provider === "anthropic") setModel(ANTHROPIC_MODELS[0].id);
    else if (provider === "openai-compatible") setModel(OPENAI_COMPATIBLE_MODELS[0].id);
    else if (provider === "webllm") setModel(RECOMMENDED_WEBLLM_MODELS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, model, customMode]);

  function set(patch) {
    onSettingsChange({ ...settings, ...patch });
  }

  function setModel(id) {
    onSettingsChange({ ...settings, models: { ...settings.models, [provider]: id } });
  }

  function selectModel(id) {
    setModel(id);
    setConfirmedModel(id);
  }

  const presetsFor = {
    anthropic: ANTHROPIC_MODELS,
    "openai-compatible": OPENAI_COMPATIBLE_MODELS,
  }[provider];

  const isCustomValue = customMode || (presetsFor && model && !presetsFor.some((m) => m.id === model));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={labelStyle}>Model provider</div>
        <select value={provider} onChange={(e) => set({ provider: e.target.value })} style={fieldStyle}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {(provider === "anthropic" || provider === "openai-compatible") && (
        <div>
          <div style={labelStyle}>API key {provider === "openai-compatible" ? "(optional for local servers)" : ""}</div>
          <input
            type="password"
            placeholder={rememberApiKey ? "saved in this browser's storage" : "kept in memory only — cleared on reload"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            style={fieldStyle}
          />
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={rememberApiKey}
              onChange={(e) => onRememberApiKeyChange(e.target.checked)}
              style={{ marginTop: "2px" }}
            />
            <span style={hintStyle}>
              Remember this key on this device. Stores it in plain text in this
              browser's local storage — readable by any script running on this
              page. Fine on a personal machine; skip it on anything shared.
            </span>
          </label>
        </div>
      )}

      {provider === "openai-compatible" && (
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

      {/* Anthropic / OpenAI-compatible: dropdown of known-good IDs + Custom escape hatch */}
      {presetsFor && (
        <div>
          <div style={labelStyle}>Model</div>
          <select
            value={isCustomValue ? CUSTOM : model}
            onChange={(e) => {
              if (e.target.value === CUSTOM) {
                setCustomMode(true);
                setModel("");
              } else {
                setCustomMode(false);
                selectModel(e.target.value);
              }
            }}
            style={fieldStyle}
          >
            {presetsFor.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
            <option value={CUSTOM}>Custom…</option>
          </select>

          {isCustomValue && (
            <input
              autoFocus
              placeholder="exact model ID"
              value={model}
              onChange={(e) => {
                selectModel(e.target.value);
                if (e.target.value.trim()) setCustomMode(false);
              }}
              style={{ ...fieldStyle, marginTop: "8px" }}
            />
          )}

          {model && <ConfirmedModel id={model} justConfirmed={confirmedModel === model} />}
        </div>
      )}

      {/* WebLLM: dropdown ONLY, sourced live from the installed package's
          own valid model list -- there is deliberately no free-text
          option here, since that's exactly what produces "Cannot find
          model record in appConfig for X". */}
      {provider === "webllm" && (
        <div>
          <div style={labelStyle}>Model</div>

          {webllmError && <div style={{ ...hintStyle, color: "var(--color-bronze)" }}>{webllmError}</div>}

          {!webllmError && (
            <select
              value={model}
              onChange={(e) => selectModel(e.target.value)}
              disabled={!webllmModels}
              style={fieldStyle}
            >
              {!webllmModels && <option>Loading model list…</option>}
              {webllmModels && (
                <>
                  <optgroup label="Recommended — small and fast">
                    {RECOMMENDED_WEBLLM_MODELS.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </optgroup>
                  <optgroup label={`All models (${webllmModels.length})`}>
                    {webllmModels.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          )}

          {model && <ConfirmedModel id={model} justConfirmed={confirmedModel === model} />}

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

// Persistent, not a fading toast -- "so I know I did select it" reads
// as wanting ongoing certainty, not a blink-and-you-miss-it moment.
// Still gets a brief highlight right after a fresh selection so the
// change itself is noticeable, then settles into a plain confirmation.
function ConfirmedModel({ id, justConfirmed }) {
  return (
    <div
      style={{
        ...hintStyle,
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: justConfirmed ? "var(--accent-primary)" : "var(--text-secondary)",
        transition: "color 600ms ease",
      }}
    >
      <span style={{ color: "var(--accent-primary)" }}>✓</span>
      Using: {id}
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
