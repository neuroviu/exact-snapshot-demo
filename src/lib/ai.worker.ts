/// <reference lib="webworker" />
// On-device extraction worker. Runs the local language model off the main thread.
import { pipeline, env, type TextGenerationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

export const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

let gen: TextGenerationPipeline | null = null;
let device = "";

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

async function load() {
  if (gen) return post({ type: "ready", model: MODEL_ID, device });
  const hasGPU = !!(self.navigator as any).gpu && !!(await (self.navigator as any).gpu.requestAdapter().catch(() => null));
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
  gen = (await pipeline("text-generation", MODEL_ID, {
    device: device as any,
    dtype: hasGPU ? "q4f16" : "q4",
    progress_callback,
  })) as TextGenerationPipeline;
  post({ type: "ready", model: MODEL_ID, device });
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
  const { type, id, text, lang } = e.data ?? {};
  try {
    if (type === "load") await load();
    if (type === "extract") {
      await load();
      const out: any = await gen!(prompt(text, lang) as any, { max_new_tokens: 320, do_sample: false });
      const msgs = out?.[0]?.generated_text;
      const raw = Array.isArray(msgs) ? msgs.at(-1)?.content ?? "" : String(msgs ?? "");
      post({ type: "result", id, raw });
    }
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
