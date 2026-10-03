import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa";
import {
  loadEncounters, saveEncounters, SAMPLES, T,
  type Encounter, type Lang, type Summary,
} from "@/lib/bridge";
import { createDraft, getAI, prepareAI, subscribeAI, wasPrepared, type AIState } from "@/lib/localAI";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroViu Bridge — Offline-first care documentation" },
      { name: "description", content: "Offline-first AI-assisted documentation for frontline health workers. Care continuity, even when connectivity isn't." },
      { property: "og:title", content: "NeuroViu Bridge" },
      { property: "og:description", content: "Care continuity, even when connectivity isn't. Offline-first AI-assisted documentation for frontline health workers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Screen = "home" | "lang" | "input" | "processing" | "review" | "done" | "saved" | "how";

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
    if (wasPrepared()) prepareAI(); // loads from on-device cache
    return un;
  }, []);

  useEffect(() => {
    void registerServiceWorker();
    loadEncounters().then(setList).catch(console.error);
  }, []);
  const persist = (l: Encounter[]) => { setList(l); void saveEncounters(l); };

  const runAnalysis = () => {
    setScreen("processing");
    const started = Date.now();
    void createDraft(text, lang).then(async (d) => {
      const wait = 1200 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setDraft(d); setScreen("review");
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
          Bridge
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
              <p className="text-sm font-bold uppercase tracking-wider text-primary">NeuroViu Bridge</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">{t.tagline}</h1>
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
            <Emergency t={t} />
            <p className="text-sm text-muted-foreground">{t.notDx}</p>
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
            {ai.status !== "ready" && <p className="text-sm text-muted-foreground">{t.basicMode}</p>}
          </div>
        )}

        {screen === "review" && draft && (
          <Review t={t} draft={draft} setDraft={setDraft} onApprove={approve} onBack={() => setScreen("input")} />
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

        {screen === "how" && <How lang={lang} ai={ai} onBack={() => setScreen("home")} label={t.back} />}
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
type DraftT = { summary: Summary; emergency: boolean; engine: "model" | "basic" };

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
      {ai.status === "ready" && (
        <p className="flex items-center gap-2 font-bold text-primary"><span className="h-2.5 w-2.5 rounded-full bg-success" />{t.aiReady}</p>
      )}
      {ai.status === "failed" && (<>
        <p className="font-bold">{t.aiFailed}</p>
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

function Review({ t, draft, setDraft, onApprove, onBack }: {
  t: TT; draft: DraftT;
  setDraft: (d: DraftT) => void; onApprove: () => void; onBack: () => void;
}) {
  const [ok, setOk] = useState(false);
  const s = draft.summary;
  const keys = Object.keys(t.fields) as (keyof typeof t.fields)[];
  return (
    <div className="space-y-4">
      <Back onClick={onBack} label={t.back} />
      <div className="rounded-xl bg-warning-soft p-3 text-center font-bold text-accent-foreground">⚠ {t.draftLabel}</div>
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

function How({ lang, ai, onBack, label }: { lang: Lang; ai: AIState; onBack: () => void; label: string }) {
  const steps = lang === "en" ? [
    ["Works offline", "All core features run on the phone. No connection is needed to record, summarise, or save an encounter."],
    ["Small on-device AI", "A lightweight model turns the patient's words into a structured draft. It flags uncertainty and says “Not enough information” instead of guessing."],
    ["Health worker decides", "The AI never diagnoses or recommends treatment. The health worker reviews, corrects and approves every record."],
    ["Sync when possible", "Approved records wait safely as “Pending sync” and upload when connectivity returns."],
  ] : [
    ["Fonctionne hors ligne", "Toutes les fonctions essentielles tournent sur le téléphone. Aucune connexion n'est nécessaire pour enregistrer, résumer ou sauvegarder."],
    ["Petite IA sur l'appareil", "Un modèle léger transforme les mots du patient en brouillon structuré. Il signale l'incertitude et indique « Informations insuffisantes » au lieu de deviner."],
    ["L'agent de santé décide", "L'IA ne pose jamais de diagnostic et ne recommande aucun traitement. L'agent vérifie, corrige et approuve chaque dossier."],
    ["Synchro dès que possible", "Les dossiers approuvés attendent « En attente de synchro » et sont envoyés au retour de la connexion."],
  ];
  return (
    <div className="space-y-4">
      <Back onClick={onBack} label={label} />
      <h2 className="text-2xl font-bold">{T[lang].how}</h2>
      <ol className="space-y-3">
        {steps.map(([h, b], i) => (
          <li key={h} className="flex gap-4 rounded-xl border bg-card p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-bold text-primary">{i + 1}</span>
            <div><p className="font-bold">{h}</p><p className="text-sm text-muted-foreground">{b}</p></div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">{T[lang].aiPrivacy}</p>
      <AIDetails t={T[lang]} ai={ai} />
      <Emergency t={T[lang]} />
    </div>
  );
}
