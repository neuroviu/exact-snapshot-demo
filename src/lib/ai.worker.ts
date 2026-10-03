/// <reference lib="webworker" />
// On-device extraction worker. Runs the local language model off the main thread.
import { pipeline, env, type TextGenerationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

// Phones (especially iPhone Safari) close the app if a page uses too much memory, so they get a smaller model.
const UA = self.navigator.userAgent || "";
const IS_PHONE = /iPhone|iPad|iPod|Android|Mobile/i.test(UA) || (self.navigator as any).maxTouchPoints > 1 && /Macintosh/.test(UA);
export const MODEL_ID = IS_PHONE ? "HuggingFaceTB/SmolLM2-360M-Instruct" : "onnx-community/Qwen2.5-0.5B-Instruct";

let gen: TextGenerationPipeline | null = null;
let device = "";

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

/** True when the model weights are stored in this device's browser cache (needed for offline use). */
async function modelSaved(): Promise<boolean> {
  try {
    const c = await caches.open(env.cacheKey);
    const keys = await c.keys();
    return keys.some((r) => r.url.includes(MODEL_ID) && r.url.endsWith(".onnx"));
  } catch {
    return false;
  }
}

class OfflineMissing extends Error {}

async function load(online = true) {
  if (gen) return post({ type: "ready", model: MODEL_ID, device, saved: await modelSaved() });
  // Offline: never try the network — fail fast with a clear reason if the files weren't saved.
  env.allowRemoteModels = online;
  if (!online && !(await modelSaved())) throw new OfflineMissing("Model files are not saved on this device.");
  // Use WebGPU only when the adapter supports f16 shaders (needed by the q4f16 weights).
  const adapter = (self.navigator as any).gpu ? await (self.navigator as any).gpu.requestAdapter().catch(() => null) : null;
  const hasGPU = !!adapter && adapter.features?.has?.("shader-f16");
  const files: Record<string, { loaded: number; total: number }> = {};
  const progress_callback = (p: any) => {
    if (p.status === "progress" && p.file) {
      files[p.file] = { loaded: p.loaded ?? 0, total: p.total ?? 0 };
      const all = Object.values(files);
      const loaded = all.reduce((a, f) => a + f.loaded, 0);
      const total = all.reduce((a, f) => a + f.total, 0);
      post({ type: "progress", loaded, total });
    }
  };
  device = hasGPU ? "webgpu" : "wasm";
  try {
    gen = (await pipeline("text-generation", MODEL_ID, {
      device: device as any,
      dtype: hasGPU ? "q4f16" : IS_PHONE ? "int8" : "q4",
      progress_callback,
    })) as TextGenerationPipeline;
  } catch (err) {
    if (!online) throw new OfflineMissing(err instanceof Error ? err.message : String(err));
    throw err;
  }
  post({ type: "ready", model: MODEL_ID, device, saved: await modelSaved() });
}

function prompt(text: string, lang: "en" | "fr") {
  const nei = lang === "fr" ? "Informations insuffisantes" : "Not enough information";
  const sys = `You are a documentation assistant for health workers. Your ONLY job is to extract information that the patient explicitly stated and put it into JSON.
Rules:
- Extract ONLY facts stated in the patient's text. Never infer, guess, or add medical facts.
- NEVER give a diagnosis, possible conditions, medication, treatment, or advice.
- If a field was not stated, write exactly "${nei}".
- Write values in ${lang === "fr" ? "French" : "English"}, the patient's language. Do not translate.
- "missingInformation": short questions the health worker could ask about things not stated (age, severity, medicines taken, danger signs).
- "uncertainty": "low", "medium" or "high" — how uncertain the extraction is.
Return ONLY one JSON object with keys: mainConcern, duration, symptomsReported, relevantContext, missingInformation, uncertainty.`;
  return [
    { role: "system", content: sys },
    { role: "user", content: `Patient text:\n"""${text}"""` },
  ];
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, text, lang, online } = e.data ?? {};
  try {
    if (type === "load") await load(online !== false);
    if (type === "extract") {
      if (!gen) await load(self.navigator.onLine);
      const out: any = await gen!(prompt(text, lang) as any, { max_new_tokens: 320, do_sample: false });
      const msgs = out?.[0]?.generated_text;
      const raw = Array.isArray(msgs) ? msgs.at(-1)?.content ?? "" : String(msgs ?? "");
      post({ type: "result", id, raw });
    }
  } catch (err) {
    const code = err instanceof OfflineMissing ? "offline" : "other";
    post({ type: "error", id, code, message: err instanceof Error ? err.message : String(err) });
  }
};
