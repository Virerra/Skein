import React, { useEffect, useRef } from "react";

// AI chat exports often carry markdown emphasis (***x***, **x**, *x*,
// [text](url)) that reads as clutter once pasted into a plain textarea
// -- this converts it into real formatting instead of leaving the raw
// symbols visible. Deliberately simple regex-based conversion, not a
// full markdown parser: covers the common cases, not nested edge cases.
function markdownToHtml(text) {
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  html = html.replace(/\n/g, "<br>");
  return html;
}

export function TranscriptEditor({ onChange, placeholder, initialValue }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && initialValue) {
      ref.current.innerText = initialValue;
    }
    // Runs once per mount only -- the parent forces a remount (via a
    // `key` change) whenever a different draft is loaded. Re-syncing
    // on every initialValue change instead would overwrite the user's
    // cursor position mid-keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, markdownToHtml(text));
    onChange(ref.current.innerText);
  }

  function handleInput() {
    onChange(ref.current.innerText);
  }

  return (
    <div
      ref={ref}
      contentEditable
      onPaste={handlePaste}
      onInput={handleInput}
      data-placeholder={placeholder}
      suppressContentEditableWarning
      className="rich-editor"
      style={{
        minHeight: "160px",
        maxHeight: "320px",
        overflowY: "auto",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        color: "var(--text-primary)",
        fontFamily: "var(--font-ui)",
        fontSize: "13px",
        outline: "none",
        whiteSpace: "pre-wrap",
      }}
    />
  );
}
