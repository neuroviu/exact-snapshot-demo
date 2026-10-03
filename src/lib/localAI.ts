// Client wrapper for the on-device model worker. Browser-only; never import the worker at SSR time.
import { analyze, T, type Lang, type Summary } from "./bridge";

export type AIStatus = "idle" | "loading" | "ready" | "failed";
export type AIState = { status: AIStatus; progress: number; model?: string; device?: string; error?: string };
export type Draft = { summary: Summary; emergency: boolean; engine: "model" | "basic" };

const READY_KEY = "nvb.ai.prepared";
let worker: Worker | null = null;
let state: AIState = { status: "idle", progress: 0 };
const subs = new Set<(s: AIState) => void>();
const pending = new Map<string, (m: any) => void>();

function set(p: Partial<AIState>) { state = { ...state, ...p }; subs.forEach((f) => f(state)); }
export const getAI = () => state;
export function subscribeAI(f: (s: AIState) => void) { subs.add(f); f(state); return () => { subs.delete(f); }; }
export const wasPrepared = () => { try { return localStorage.getItem(READY_KEY) === "1"; } catch { return false; } };

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "progress" && m.total) set({ progress: Math.min(99, Math.round((m.loaded / m.total) * 100)) });
    if (m.type === "ready") { set({ status: "ready", progress: 100, model: m.model, device: m.device }); try { localStorage.setItem(READY_KEY, "1"); } catch {} }
    if (m.type === "error" && !m.id) set({ status: "failed", error: m.message });
    if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
  };
  worker.onerror = (e) => set({ status: "failed", error: e.message || "Worker failed" });
  return worker;
}

export function prepareAI() {
  if (state.status === "loading" || state.status === "ready") return;
  set({ status: "loading", progress: 0, error: undefined });
  try { ensureWorker().postMessage({ type: "load" }); }
  catch (err) { set({ status: "failed", error: String(err) }); }
}

const pick = (v: unknown, nei: string) => {
  const s = Array.isArray(v) ? v.filter(Boolean).join(", ") : typeof v === "string" ? v.trim() : "";
  return s ? s : nei;
};

export function parseModelOutput(raw: string, lang: Lang): Summary | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j: any;
  try { j = JSON.parse(m[0]); } catch { return null; }
  const nei = T[lang].nei;
  const miss = Array.isArray(j.missingInformation)
    ? j.missingInformation.filter(Boolean).map((x: string) => "• " + x).join("\n")
    : pick(j.missingInformation, nei);
  const u = String(j.uncertainty ?? "").toLowerCase();
  // uncertainty high → confidence low
  const confidence = u.includes("low") || u.includes("faible") ? "high" : u.includes("high") || u.includes("élev") ? "low" : "medium";
  return {
    mainConcern: pick(j.mainConcern, nei),
    duration: pick(j.duration, nei),
    symptoms: pick(j.symptomsReported, nei),
    context: pick(j.relevantContext, nei),
    missing: miss,
    confidence,
  };
}

/** Uses the local model when ready; otherwise the labelled keyword fallback. */
export async function createDraft(text: string, lang: Lang): Promise<Draft> {
  const basic = analyze(text, lang);
  if (state.status !== "ready" || !worker) return { ...basic, engine: "basic" };
  const id = crypto.randomUUID();
  const res: any = await new Promise((r) => { pending.set(id, r); worker!.postMessage({ type: "extract", id, text, lang }); });
  const summary = res.type === "result" ? parseModelOutput(res.raw, lang) : null;
  if (!summary) return { ...basic, engine: "basic" };
  // Danger-sign flag stays rule-based so it can never be missed by the model.
  return { summary, emergency: basic.emergency, engine: "model" };
}
