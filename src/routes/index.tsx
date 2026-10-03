import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa";
import {
  loadEncounters, saveEncounters, SAMPLES, T,
  type Encounter, type Lang, type Summary,
} from "@/lib/bridge";
import { edge } from "@/lib/edge";
import { createDraft, getAI, prepareAI, startAI, subscribeAI, type AIState } from "@/lib/localAI";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroViu™ Bridge — Small AI for frontline care" },
      { name: "description", content: "Offline-first AI-assisted documentation for frontline health workers. Care continuity, even when connectivity isn't." },
      { property: "og:title", content: "NeuroViu™ Bridge — Small AI for frontline care" },
      { property: "og:description", content: "Care continuity, even when connectivity isn't. Offline-first AI-assisted documentation for frontline health workers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Screen = "home" | "lang" | "input" | "processing" | "review" | "done" | "saved" | "how" | "demo";

function useOnline() {
  const [real, setReal] = useState(true);
  const [sim, setSim] = useState(false);
  useEffect(() => {
    setReal(navigator.onLine);
    const u = () => setReal(navigator.onLine);
    window.addEventListener("online", u);
    window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  return { online: real && !sim, real, sim, setSim };
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [lang, setLang] = useState<Lang>("en");
  const { online, real, sim, setSim } = useOnline();
  const [list, setList] = useState<Encounter[]>([]);
  const [text, setText] = useState("");
  const [ref, setRef] = useState("");
  const [draft, setDraft] = useState<DraftT | null>(null);
  const [ai, setAI] = useState<AIState>(getAI());
  const t = T[lang];
  useEffect(() => {
    const un = subscribeAI(setAI);
    startAI(); // loads from on-device cache, unless the last attempt closed the app
    return un;
  }, []);

  useEffect(() => {
    void registerServiceWorker();
    loadEncounters().then(setList).catch(console.error);
  }, []);
  const persist = (l: Encounter[]) => { setList(l); void saveEncounters(l); };

  const [step, setStep] = useState(0);
  const runAnalysis = () => {
    setScreen("processing"); setStep(0);
    const tick = setInterval(() => setStep((x) => Math.min(x + 1, 3)), 300);
    const started = Date.now();
    void createDraft(text, lang).then(async (d) => {
      const wait = 1200 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      clearInterval(tick); setDraft(d); setScreen("review");
    });
  };
  const approve = () => {
    if (!draft) return;
    persist([{ id: crypto.randomUUID(), patientRef: ref || "—", lang, transcript: text, summary: draft.summary,
      emergency: draft.emergency, createdAt: new Date().toISOString(), status: "pending" }, ...list]);
    setScreen("done");
  };
  const reset = () => { setText(""); setRef(""); setDraft(null); };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background text-[17px] leading-relaxed">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2 font-bold text-primary">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">NV</span>
          <span>NeuroViu<sup className="text-[0.6em]">™</sup> Bridge</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "fr" : "en")} className="h-10 rounded-full border px-3 text-sm font-bold">
            {lang === "en" ? "FR" : "EN"}
          </button>
          <span
            role="status"
            className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-bold ${online ? "bg-secondary text-secondary-foreground" : "bg-warning-soft text-accent-foreground"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-warning"}`} />
            {online ? t.online : t.offline}
          </span>
        </div>
      </header>
      {!online && (
        <div role="status" className="bg-warning-soft px-4 py-2 text-center text-sm font-bold text-accent-foreground">
          {t.offlineBanner} {real && sim ? t.simulated : ""}
        </div>
      )}

      <main className="flex-1 px-4 py-6">
        {screen === "home" && (
          <div className="space-y-6">
            <section className="pt-4">
              <p className="text-sm font-bold uppercase tracking-wider text-primary">NeuroViu™ Bridge</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">{edge(lang).tagline}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{edge(lang).by}</p>
              <p className="mt-3 text-muted-foreground">{t.sub}</p>
            </section>
            <div className="space-y-3">
              <Btn onClick={() => { reset(); setScreen("lang"); }}>{t.start}</Btn>
              <Btn variant="secondary" onClick={() => setScreen("saved")}>
                {t.saved}
                {list.some((e) => e.status === "pending") && (
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-sm text-accent-foreground">
                    {list.filter((e) => e.status === "pending").length} {t.pending.toLowerCase()}
                  </span>
                )}
              </Btn>
              <Btn variant="ghost" onClick={() => setScreen("how")}>{t.how}</Btn>
            </div>
            <AISetup t={t} ai={ai} />
            <EdgeStatus lang={lang} ai={ai} />
            <Emergency t={t} />
            <p className="text-sm text-muted-foreground">{t.notDx}</p>
            <button onClick={() => setScreen("demo")} className="w-full text-center text-sm font-bold text-primary underline">{edge(lang).demoBtn} →</button>
          </div>
        )}

        {screen === "lang" && (
          <div className="space-y-4">
            <Back onClick={() => setScreen("home")} label={t.back} />
            <h2 className="text-2xl font-bold">{t.chooseLang}</h2>
            {(["en", "fr"] as Lang[]).map((l) => (
              <button key={l} onClick={() => { setLang(l); setScreen("input"); }}
                className={`flex min-h-16 w-full items-center justify-between rounded-xl border-2 bg-card px-5 text-lg font-bold ${lang === l ? "border-primary" : ""}`}>
                {l === "en" ? "English" : "Français"} <span className="text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        )}

        {screen === "input" && (
          <div className="space-y-4">
            <Back onClick={() => setScreen("lang")} label={t.back} />
            <label className="block">
              <span className="font-bold">{t.patientRef}</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 h-12 w-full rounded-xl border bg-card px-4" />
            </label>
            <div>
              <span className="font-bold">{t.describe}</span>
              <p className="text-sm text-muted-foreground">{t.describeHint}</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
                className="mt-2 w-full rounded-xl border bg-card p-4" />
              <button onClick={() => setText(SAMPLES[lang])} className="mt-1 text-sm font-bold text-primary underline">{t.sample}</button>
            </div>
            <Mic lang={lang} t={t} onText={(s) => setText((p) => (p ? p + " " : "") + s)} />
            <Btn disabled={text.trim().length < 5} onClick={runAnalysis}>{t.analyze}</Btn>
          </div>
        )}

        {screen === "processing" && (
          <div className="flex flex-col items-center gap-4 pt-20 text-center">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-secondary border-t-primary" />
            <p className="text-xl font-bold">{t.processing}</p>
            <p className="text-muted-foreground">{t.processingSub}</p>
            <ol className="w-full max-w-xs space-y-2 text-left text-sm">
              {edge(lang).steps.map((st, i) => (
                <li key={st} className={`flex items-center gap-2 transition-opacity ${i <= step ? "opacity-100" : "opacity-40"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border text-muted-foreground"}`}>{i < step ? "✓" : i + 1}</span>
                  <span className={i === step ? "font-bold" : ""}>{st}</span>
                </li>
              ))}
            </ol>
            {ai.status !== "ready" && <p className="text-sm text-muted-foreground">{t.basicMode}</p>}
          </div>
        )}

        {screen === "review" && draft && (
          <Review t={t} lang={lang} draft={draft} setDraft={setDraft} onApprove={approve} onBack={() => setScreen("input")} />
        )}

        {screen === "done" && (
          <div className="space-y-4 pt-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-3xl text-primary">✓</div>
            <h2 className="text-2xl font-bold">{t.savedOk}</h2>
            <p className="text-muted-foreground">{t.pending}</p>
            <Btn onClick={() => { reset(); setScreen("input"); }}>{t.newEnc}</Btn>
            <Btn variant="secondary" onClick={() => setScreen("saved")}>{t.saved}</Btn>
          </div>
        )}

        {screen === "saved" && <Saved t={t} list={list} persist={persist} online={online} onBack={() => setScreen("home")} />}

        {screen === "how" && <How lang={lang} ai={ai} onBack={() => setScreen("home")} label={t.back} onDemo={() => setScreen("demo")} />}

        {screen === "demo" && <Demo lang={lang} ai={ai} onBack={() => setScreen("home")} label={t.back} />}
      </main>

      <footer className="space-y-2 px-4 py-4 text-center text-xs text-muted-foreground">
        <label className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-card px-3 font-bold">
          <input type="checkbox" checked={sim} onChange={(e) => setSim(e.target.checked)} className="h-4 w-4 accent-primary" />
          {t.simulate}
        </label>
        <p>NeuroViu Labs</p>
      </footer>
    </div>
  );
}

type TT = (typeof T)[Lang];
type DraftT = { summary: Summary; emergency: boolean; engine: "model" | "basic"; grounded?: boolean };

function AISetup({ t, ai }: { t: TT; ai: AIState }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      {ai.status === "idle" && (<>
        <p className="font-bold">{t.aiPrepare}</p>
        <p className="text-sm text-muted-foreground">{t.aiPreparingSub} {t.aiSize}</p>
        <Btn variant="secondary" onClick={prepareAI}>{t.aiPrepare}</Btn>
        <p className="text-sm text-muted-foreground">{t.basicMode} — {t.basicModeSub}</p>
      </>)}
      {ai.status === "loading" && (<>
        <p className="font-bold">{t.aiPreparing}… {ai.progress}%</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${ai.progress}%` }} /></div>
        <p className="text-sm text-muted-foreground">{t.aiPreparingSub}</p>
      </>)}
      {ai.status === "ready" && (<>
        <p className="flex items-center gap-2 font-bold text-primary"><span className="h-2.5 w-2.5 rounded-full bg-success" />{t.aiReady}</p>
        {ai.saved === false && <p className="text-sm text-muted-foreground">{t.aiNotSaved}</p>}
      </>)}
      {ai.status === "failed" && (<>
        <p className="font-bold">{ai.reason === "crashed" ? t.aiCrashed : ai.reason === "offline" ? t.aiOfflineMissing : t.aiFailed}</p>
        <p className="text-sm text-muted-foreground">{t.basicMode} — {t.basicModeSub}</p>
        <Btn variant="ghost" onClick={prepareAI}>{t.aiRetry}</Btn>
      </>)}
      <p className="text-sm text-muted-foreground">{t.aiPrivacy}</p>
      <AIDetails t={t} ai={ai} />
    </div>
  );
}

function AIDetails({ t, ai }: { t: TT; ai: AIState }) {
  const d = t.det;
  const rows: [string, string][] = [
    [d.processing, d.onDevice],
    [d.model, ai.status === "ready" ? `${d.lightweight} (${ai.model})` : d.notLoaded],
    ...(ai.status === "ready" ? [[d.acc, ai.device === "webgpu" ? "WebGPU" : "WebAssembly (CPU)"] as [string, string]] : []),
    [d.cloud, d.no],
    [d.review, d.yes],
    [d.dx, d.no],
  ];
  return (
    <details className="rounded-lg border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-bold">{t.aiDetails}</summary>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-bold break-all">{v}</dd></div>
        ))}
      </dl>
    </details>
  );
}

function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const v = { primary: "bg-primary text-primary-foreground", secondary: "bg-secondary text-secondary-foreground", ghost: "border bg-card text-foreground" }[variant];
  return <button {...p} className={`flex min-h-14 w-full items-center justify-center rounded-xl px-5 text-lg font-bold transition active:scale-[0.98] disabled:opacity-40 ${v} ${className}`} />;
}
function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="h-10 font-bold text-primary">← {label}</button>;
}
function Emergency({ t }: { t: TT }) {
  return (
    <div role="note" className="rounded-xl border-l-4 border-destructive bg-card p-4">
      <p className="font-bold text-destructive">{t.emergencyTitle}</p>
      <p className="text-sm">{t.emergency}</p>
    </div>
  );
}

function Mic({ lang, t, onText }: { lang: Lang; t: TT; onText: (s: string) => void }) {
  const [rec, setRec] = useState(false);
  const [msg, setMsg] = useState("");
  const r = useRef<any>(null);
  const toggle = () => {
    if (rec) { r.current?.stop(); setRec(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMsg(t.voiceUnavailable); return; }
    const s = new SR();
    s.lang = lang === "en" ? "en-US" : "fr-FR";
    s.onresult = (e: any) => onText(Array.from(e.results).map((x: any) => x[0].transcript).join(" "));
    s.onerror = () => { setMsg(t.voiceUnavailable); setRec(false); };
    s.onend = () => setRec(false);
    r.current = s; s.start(); setRec(true); setMsg("");
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={toggle} aria-label={rec ? t.listening : t.speak}
        className={`grid h-20 w-20 place-items-center rounded-full text-3xl ${rec ? "animate-pulse bg-destructive text-primary-foreground" : "bg-secondary text-primary"}`}>
        🎙
      </button>
      <span className="text-sm font-bold">{rec ? t.listening : t.speak}</span>
      {msg && <span className="text-center text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}

function Review({ t, lang, draft, setDraft, onApprove, onBack }: {
  t: TT; lang: Lang; draft: DraftT;
  setDraft: (d: DraftT) => void; onApprove: () => void; onBack: () => void;
}) {
  const [ok, setOk] = useState(false);
  const s = draft.summary;
  const keys = Object.keys(t.fields) as (keyof typeof t.fields)[];
  return (
    <div className="space-y-4">
      <Back onClick={onBack} label={t.back} />
      <div className="rounded-xl bg-warning-soft p-3 text-center font-bold text-accent-foreground">⚠ {t.draftLabel}</div>
      {draft.engine === "model" && draft.grounded && <p className="rounded-lg bg-secondary px-3 py-2 text-center text-sm text-secondary-foreground">🛡 {edge(lang).groundingApplied}</p>}
      {draft.engine === "basic" && <p className="text-center text-sm text-muted-foreground">{t.basicMode} — {t.basicModeSub}</p>}
      {draft.emergency && <div className="rounded-xl border-2 border-destructive bg-card p-3 font-bold text-destructive">{t.emergencyFlag}</div>}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="font-bold">{t.confidence}</span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${s.confidence === "high" ? "bg-secondary text-secondary-foreground" : "bg-warning-soft text-accent-foreground"}`}>
            {t.conf[s.confidence]}
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= ["low", "medium", "high"].indexOf(s.confidence) ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t.confNote}</p>
      </div>
      {keys.map((k) => (
        <label key={k} className="block">
          <span className="font-bold">{t.fields[k]}</span>
          <textarea value={s[k]} rows={k === "missing" ? 5 : 2}
            onChange={(e) => setDraft({ ...draft, summary: { ...s, [k]: e.target.value } })}
            className={`mt-1 w-full rounded-xl border bg-card p-3 ${s[k] === t.nei ? "italic text-muted-foreground" : ""}`} />
        </label>
      ))}
      <label className="flex gap-3 rounded-xl border bg-card p-4">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-primary" />
        <span>{t.approveCheck}</span>
      </label>
      <Btn disabled={!ok} onClick={onApprove}>{t.approve}</Btn>
      <p className="text-sm text-muted-foreground">{t.notDx}</p>
    </div>
  );
}

function Saved({ t, list, persist, online, onBack }: { t: TT; list: Encounter[]; persist: (l: Encounter[]) => void; online: boolean; onBack: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const pending = list.filter((e) => e.status === "pending").length;
  const sync = () => {
    setSyncing(true);
    setTimeout(() => { persist(list.map((e) => ({ ...e, status: "synced" }))); setSyncing(false); }, 1500);
  };
  return (
    <div className="space-y-4">
      <Back onClick={onBack} label={t.back} />
      <h2 className="text-2xl font-bold">{t.saved}</h2>
      {pending > 0 && (online
        ? <Btn disabled={syncing} onClick={sync}>{syncing ? t.syncing : `${t.syncNow} (${pending})`}</Btn>
        : <p className="rounded-xl bg-warning-soft p-3 text-sm text-accent-foreground">{t.syncOffline}</p>)}
      {list.length === 0 && <p className="text-muted-foreground">{t.empty}</p>}
      {list.map((e) => (
        <div key={e.id} className="rounded-xl border bg-card">
          <button onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
            <div>
              <p className="font-bold">{e.patientRef} · {e.summary.mainConcern}</p>
              <p className="text-sm text-muted-foreground">{new Date(e.createdAt).toLocaleString(e.lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · {e.lang.toUpperCase()}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${e.status === "synced" ? "bg-secondary text-secondary-foreground" : "bg-warning-soft text-accent-foreground"}`}>
              {e.status === "synced" ? t.synced : t.pending}
            </span>
          </button>
          {open === e.id && (
            <dl className="space-y-2 border-t p-4 text-sm">
              {(Object.keys(t.fields) as (keyof typeof t.fields)[]).map((k) => (
                <div key={k}><dt className="font-bold">{t.fields[k]}</dt><dd className="whitespace-pre-line">{e.summary[k]}</dd></div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

function How({ lang, ai, onBack, label, onDemo }: { lang: Lang; ai: AIState; onBack: () => void; label: string; onDemo: () => void }) {
  return (
    <div className="space-y-4">
      <Back onClick={onBack} label={label} />
      <Pipeline lang={lang} />
      <p className="text-sm text-muted-foreground">{T[lang].aiPrivacy}</p>
      <EdgeStatus lang={lang} ai={ai} />
      <AIDetails t={T[lang]} ai={ai} />
      <Btn variant="ghost" onClick={onDemo}>{edge(lang).demoBtn}</Btn>
      <Emergency t={T[lang]} />
    </div>
  );
}

function Pipeline({ lang }: { lang: Lang }) {
  const e = edge(lang);
  return (
    <section>
      <h2 className="text-2xl font-bold">{e.pipeTitle}</h2>
      <ol className="mt-4">
        {e.pipeline.map(([h, b], i) => (
          <li key={h} className="relative flex gap-3 pb-4 last:pb-0">
            {i < e.pipeline.length - 1 && <span aria-hidden className="absolute left-[17px] top-9 bottom-0 w-0.5 bg-secondary" />}
            <span className={`relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${i === 1 || i === 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{i + 1}</span>
            <div className="flex-1 rounded-xl border bg-card p-3">
              <p className="flex flex-wrap items-center gap-2 font-bold">{h}
                {i === 5 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-accent-foreground">{e.simulated}</span>}
              </p>
              <p className="text-sm text-muted-foreground">{b}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EdgeStatus({ lang, ai }: { lang: Lang; ai: AIState }) {
  const e = edge(lang), s = e.status;
  if (ai.status !== "ready") return (
    <div className="rounded-xl border bg-card p-4 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{e.statusTitle}</p>
      <p className="mt-1 flex items-center gap-2 font-bold"><span className="h-2.5 w-2.5 rounded-full bg-warning" />{e.basicTitle}</p>
      <p className="mt-1 text-muted-foreground">{ai.status === "loading" ? e.loadingNote : e.basicNote}</p>
    </div>
  );
  const rows: [string, string][] = [
    [s.processing, s.onDevice],
    [s.model, ai.model?.includes("SmolLM2") ? "SmolLM2-135M-Instruct (INT8)" : ai.model?.includes("Qwen") ? "Qwen2.5-0.5B-Instruct (quantized)" : "—"],
    [s.accel, ai.device === "webgpu" ? "WebGPU" : "WebAssembly (CPU)"],
    [s.net, s.no], [s.cloud, s.no], [s.grounding, s.active], [s.human, s.required], [s.dx, s.no],
  ];
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card p-4 text-sm">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><span className="h-2.5 w-2.5 rounded-full bg-success" />{e.statusTitle}</p>
      <dl className="mt-2 divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-bold">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function Demo({ lang, ai, onBack, label }: { lang: Lang; ai: AIState; onBack: () => void; label: string }) {
  const e = edge(lang);
  const tone = { real: "bg-secondary text-secondary-foreground", sim: "bg-warning-soft text-accent-foreground", rule: "bg-muted text-foreground" };
  return (
    <div className="space-y-5">
      <Back onClick={onBack} label={label} />
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">NeuroViu™ Bridge</p>
        <h2 className="mt-1 text-2xl font-bold">{e.demoTitle}</h2>
        <p className="mt-2 text-sm opacity-90">{e.demoIntro}</p>
      </section>
      <EdgeStatus lang={lang} ai={ai} />
      <ul className="grid gap-2">
        {e.features.map(([h, b, k]) => (
          <li key={h} className="rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{h}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${tone[k]}`}>{e.tags[k]}</span>
            </div>
            <p className="text-sm text-muted-foreground">{b}</p>
          </li>
        ))}
      </ul>
      <Pipeline lang={lang} />
      <section className="rounded-xl border-l-4 border-warning bg-card p-4">
        <h3 className="font-bold">{e.limitsTitle}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{e.limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
    </div>
  );
}
