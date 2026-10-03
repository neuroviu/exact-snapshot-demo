// Client wrapper for the on-device model worker. Browser-only; never import the worker at SSR time.
import { analyze, T, type Lang, type Summary } from "./bridge";

export type AIStatus = "idle" | "loading" | "ready" | "failed";
export type AIState = { status: AIStatus; progress: number; model?: string; device?: string; error?: string | undefined };
export type Draft = { summary: Summary; emergency: boolean; engine: "model" | "basic"; grounded?: boolean };

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
  worker.onerror = (e) => {
    set({ status: "failed", error: e.message || "Worker failed" });
    // Never leave a draft waiting forever: release pending requests so the keyword fallback runs.
    pending.forEach((r) => r({ type: "error", message: "Worker failed" }));
    pending.clear();
    worker = null;
  };
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

// Grounding check: keep model text only if most of its content words appear in the patient's own words.
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const NUM = /^(\d+|one|two|three|four|five|six|seven|un|une|deux|trois|quatre|cinq|sept|days?|weeks?|months?|jours?|semaines?|mois)$/;
function grounded(piece: string, source: string) {
  const src = norm(source);
  const words = norm(piece).match(/[a-z0-9]{4,}/g) ?? [];
  if (!words.length) return true;
  const hit = words.filter((w) => NUM.test(w) || src.includes(w.slice(0, Math.max(4, Math.min(6, w.length - 1))))).length;
  return hit / words.length >= 0.6;
}
export function keepGrounded(value: string, source: string, sep: RegExp, joiner: string, nei: string) {
  if (value === nei) return value;
  const parts = value.split(sep).map((p) => p.trim()).filter(Boolean).filter((p) => grounded(p, source));
  return parts.length ? parts.join(joiner) : nei;
}

/** Uses the local model when ready; otherwise the labelled keyword fallback. */
export async function createDraft(text: string, lang: Lang): Promise<Draft> {
  const basic = analyze(text, lang);
  if (state.status !== "ready" || !worker) return { ...basic, engine: "basic" };
  const id = crypto.randomUUID();
  const res: any = await new Promise((r) => {
    pending.set(id, r);
    // Safety timeout: if the model stalls (e.g. offline file missing), fall back after 4 minutes.
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); r({ type: "error" }); } }, 240_000);
    try { worker!.postMessage({ type: "extract", id, text, lang }); } catch { pending.delete(id); r({ type: "error" }); }
  });
  const summary = res.type === "result" ? parseModelOutput(res.raw, lang) : null;
  if (!summary) return { ...basic, engine: "basic" };
  // Follow-up questions are prompts for the health worker, not patient facts; keep the standard checklist if the model gave none.
  const nei = T[lang].nei, b = basic.summary;
  const before = [summary.mainConcern, summary.symptoms, summary.context, summary.duration];
  summary.mainConcern = keepGrounded(summary.mainConcern, text, /$^/, "", nei);
  summary.symptoms = keepGrounded(summary.symptoms, text, /[,;]\s*/, ", ", nei);
  summary.context = keepGrounded(summary.context, text, /(?<=[.!?])\s+|,\s(?=[A-ZÀ-Ý])/, " ", nei);
  summary.duration = keepGrounded(summary.duration, text, /$^/, "", nei);
  const after = [summary.mainConcern, summary.symptoms, summary.context, summary.duration];
  const groundingApplied = before.some((v, i) => v !== after[i]);
  // Where the model's text was not supported by the patient's words, fall back to the rule-based value.
  if (summary.mainConcern === nei) summary.mainConcern = b.mainConcern;
  if (summary.symptoms === nei) summary.symptoms = b.symptoms;
  if (summary.context === nei) summary.context = b.context;
  if (summary.duration === nei) summary.duration = b.duration;
  if (summary.missing === T[lang].nei) summary.missing = basic.summary.missing;
  // Danger-sign flag stays rule-based so it can never be missed by the model.
  return { summary, emergency: basic.emergency, engine: "model", grounded: groundingApplied };
}
