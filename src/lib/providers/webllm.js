// Experimental in-browser provider via WebLLM. Multi-threaded WebLLM
// needs the page to be cross-origin isolated (COOP/COEP response
// headers), which a static host like GitHub Pages can't set -- this
// module feature-detects and reports its real status instead of
// silently failing, per README's already-documented caveat. The
// package itself is dynamically imported so it never lands in the
// bundle for users who don't select this provider.

import { parseClaimsResponse } from "./parseClaimsResponse";

// Curated starting point for the Settings dropdown -- small, fast,
// instruction-tuned models that are reasonable to run in a browser.
// Deliberately q4f32_1, not q4f16_1: f16 quantization needs the
// browser's `shader-f16` WebGPU extension, which many Chrome installs
// don't have enabled -- f32 works on more hardware at the cost of
// roughly double the download/memory footprint. The full list (163+
// models as of writing, including the f16 variants) is available via
// listWebLLMModels() below for anyone who wants to try one.
export const RECOMMENDED_WEBLLM_MODELS = [
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "Llama-3.2-3B-Instruct-q4f32_1-MLC",
  "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
  "Phi-3.5-mini-instruct-q4f32_1-MLC",
];

// Pulled live from the installed package's own config rather than
// hand-maintained, so it can never drift out of sync with what
// CreateMLCEngine will actually accept. This is what fixes "Cannot
// find model record in appConfig for X" at the source: the dropdown
// can only ever offer IDs that are already valid.
export async function listWebLLMModels() {
  const webllm = await import("@mlc-ai/web-llm");
  return webllm.prebuiltAppConfig.model_list.map((m) => m.model_id).sort();
}

export function checkWebLLMSupport() {
  const hasWebGPU = typeof navigator !== "undefined" && !!navigator.gpu;
  const isolated = typeof window !== "undefined" && window.crossOriginIsolated === true;

  let note;
  if (!hasWebGPU) {
    note = "This browser doesn't expose WebGPU -- WebLLM can't run here. Use BYOK or a local model instead.";
  } else if (!isolated) {
    note = "WebGPU is available, but this page isn't cross-origin isolated (needs COOP/COEP response headers, which this host may not set). Model loading may be slow or fail.";
  } else {
    note = "WebGPU and cross-origin isolation are both available -- WebLLM should work on this device.";
  }

  return { supported: hasWebGPU, hasWebGPU, crossOriginIsolated: isolated, note };
}

// WebGPU failures surface as raw driver/compiler internals ("[Invalid
// ShaderModule (unlabeled)] is invalid due to a previous error...")
// which mean nothing to a user picking a model from a dropdown --
// translated here into what actually went wrong and what to do about
// it. Falls through to the original error for anything unrecognized,
// so genuinely novel failures aren't hidden, just the known-noisy ones.
function friendlyWebLLMError(e) {
  const msg = e?.message || String(e);

  if (/shader-f16|requires webgpu extension|not yet supported by this browser/i.test(msg)) {
    return new Error(
      "This model needs a WebGPU feature (shader-f16) your browser doesn't have enabled. Pick a model without \"f16\" in its name from Settings instead (the Recommended list uses f32 variants for this reason) -- or, if you specifically want an f16 model, some Chrome builds support it behind the --enable-dawn-features=allow_unsafe_apis launch flag."
    );
  }
  if (/out of memory|oom/i.test(msg)) {
    return new Error("This model needs more GPU memory than your device has available. Try a smaller WebLLM model in Settings.");
  }
  if (/shadermodule|compute stage|pipeline|validating|adapter|device was lost/i.test(msg)) {
    return new Error("This model failed to run on your GPU (a WebGPU compilation error). Try a different WebLLM model in Settings (an f32 one, if you were on an f16 model), or switch to a BYOK/local-model provider instead.");
  }
  if (/\.wasm|\.bin\b|download/i.test(msg)) {
    return new Error("The model failed to download completely. Check your connection and try again.");
  }
  return e;
}

let enginePromise = null;
let enginePromiseModel = null;

function discardEngineCache() {
  enginePromise = null;
  enginePromiseModel = null;
}

async function getEngine(model) {
  if (!enginePromise || enginePromiseModel !== model) {
    enginePromiseModel = model;
    enginePromise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      return webllm.CreateMLCEngine(model);
    })();
  }
  return enginePromise;
}

export async function extractWithWebLLM({ transcript, systemPrompt, model, signal }) {
  const support = checkWebLLMSupport();
  if (!support.hasWebGPU) throw new Error(support.note);

  const resolvedModel = model || RECOMMENDED_WEBLLM_MODELS[0];

  let engine;
  try {
    engine = await getEngine(resolvedModel);
  } catch (e) {
    discardEngineCache(); // don't keep serving a broken init to the next attempt
    throw friendlyWebLLMError(e);
  }

  // engine.chat.completions.create() doesn't accept an abort signal and
  // resolves (rather than rejecting) when interrupted, so cancellation
  // is done by racing it against a promise that rejects on abort. A
  // known web-llm bug means the engine returns empty content on every
  // generation *after* interruptGenerate() is called -- so the cached
  // engine is discarded on abort, forcing a fresh one next attempt
  // instead of silently returning nothing.
  const abortPromise = new Promise((_, reject) => {
    if (!signal) return;
    const onAbort = () => {
      engine.interruptGenerate?.();
      discardEngineCache();
      reject(new DOMException("Extraction cancelled.", "AbortError"));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });

  let reply;
  try {
    const generatePromise = engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
    });
    reply = await Promise.race([generatePromise, abortPromise]);
  } catch (e) {
    if (e.name === "AbortError") throw e;
    discardEngineCache(); // a broken generation likely means a broken engine instance
    throw friendlyWebLLMError(e);
  }

  const raw = reply.choices?.[0]?.message?.content ?? "[]";
  try {
    return parseClaimsResponse(raw);
  } catch (e) {
    throw new Error("The model didn't return usable output for this transcript. Try again, or try a larger WebLLM model. " + e.message);
  }
}
