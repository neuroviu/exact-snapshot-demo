export type Lang = "en" | "fr";
export type Summary = {
  mainConcern: string;
  duration: string;
  symptoms: string;
  context: string;
  missing: string;
  confidence: "low" | "medium" | "high";
};
export type Encounter = {
  id: string;
  patientRef: string;
  lang: Lang;
  transcript: string;
  summary: Summary;
  emergency: boolean;
  createdAt: string;
  status: "pending" | "synced";
};

export const T = {
  en: {
    tagline: "Care continuity, even when connectivity isn't.",
    sub: "Offline-first AI-assisted documentation for frontline health workers.",
    start: "Start Patient Encounter",
    saved: "Saved Encounters",
    how: "How it works",
    online: "Online",
    offline: "Offline",
    offlineBanner: "Offline mode — your work is being saved on this device.",
    simulate: "Demo: Simulate Offline",
    simulated: "(simulated)",
    back: "Back",
    chooseLang: "Choose encounter language",
    patientRef: "Patient reference (initials or ID)",
    describe: "Patient's concern",
    describeHint: "Type what the patient says, in their own words.",
    speak: "Tap to record",
    listening: "Listening… tap to stop",
    voiceUnavailable: "Voice input not available on this device — please type.",
    sample: "Use sample",
    analyze: "Create draft summary",
    processing: "Processing on device…",
    processingSub: "No internet needed. Data stays on this phone.",
    draftLabel: "AI-assisted draft — requires health worker review",
    fields: {
      mainConcern: "Main concern",
      duration: "Duration",
      symptoms: "Symptoms reported",
      context: "Relevant context",
      missing: "Missing information / questions to ask",
    },
    confidence: "AI confidence",
    conf: { low: "Low", medium: "Medium", high: "High" },
    confNote: "The AI may be wrong or incomplete. Check every field with the patient.",
    nei: "Not enough information",
    approveCheck: "I have reviewed and corrected this summary. I am responsible for its content.",
    approve: "Approve & save on device",
    savedOk: "Encounter saved on this device",
    pending: "Pending sync",
    synced: "Synced",
    syncNow: "Sync now",
    syncing: "Syncing…",
    syncOffline: "You are offline. Records will stay safely on this device until connection returns.",
    empty: "No encounters saved yet.",
    emergencyTitle: "Emergency notice",
    emergency:
      "If the patient may need immediate medical attention, stop and follow your local emergency procedures and referral protocol now.",
    emergencyFlag: "Possible danger signs mentioned. Follow local emergency procedures.",
    notDx: "This tool does not diagnose or recommend treatment. The health worker makes all clinical decisions.",
    home: "Home",
    newEnc: "New encounter",
    aiPrepare: "Prepare offline AI",
    aiPreparing: "Preparing offline AI",
    aiPreparingSub: "The lightweight AI model is being stored on this device for offline use.",
    aiSize: "One-time download, about 370 MB on phones, 500 MB on computers. Use Wi-Fi if possible.",
    aiReady: "Offline AI ready",
    aiFailed: "The AI model could not start on this device.",
    aiCrashed: "The AI model closed the app last time, probably because this device ran low on memory. Basic offline mode is being used so you can keep working.",
    aiOfflineMissing: "The AI model isn't saved on this device yet. Connect to the internet and tap “Try again” to save it.",
    aiNotSaved: "This device didn't keep the AI model saved, so it will need internet again next time.",
    aiRetry: "Try again",
    aiPrivacy: "AI processing happens on this device. Patient descriptions are not sent to a cloud AI service.",
    basicMode: "Basic offline processing mode",
    basicModeSub: "Simple keyword rules, not an AI model.",
    aiDetails: "AI details",
    det: { processing: "Processing", onDevice: "On-device", model: "Model", lightweight: "lightweight local language model", cloud: "Cloud AI required", review: "Human review required", dx: "Diagnostic use", engine: "Engine in use", acc: "Acceleration", yes: "Yes", no: "No", notLoaded: "not loaded — keyword fallback" },
  },
  fr: {
    tagline: "La continuité des soins, même sans connexion.",
    sub: "Documentation assistée par IA, hors ligne d'abord, pour les agents de santé de première ligne.",
    start: "Commencer une consultation",
    saved: "Consultations enregistrées",
    how: "Comment ça marche",
    online: "En ligne",
    offline: "Hors ligne",
    offlineBanner: "Mode hors ligne — votre travail est enregistré sur cet appareil.",
    simulate: "Démo : simuler hors ligne",
    simulated: "(simulé)",
    back: "Retour",
    chooseLang: "Choisir la langue de la consultation",
    patientRef: "Référence patient (initiales ou ID)",
    describe: "Motif du patient",
    describeHint: "Écrivez ce que dit le patient, avec ses propres mots.",
    speak: "Appuyer pour enregistrer",
    listening: "Écoute… appuyer pour arrêter",
    voiceUnavailable: "Saisie vocale indisponible sur cet appareil — veuillez écrire.",
    sample: "Exemple",
    analyze: "Créer le résumé brouillon",
    processing: "Traitement sur l'appareil…",
    processingSub: "Sans internet. Les données restent sur ce téléphone.",
    draftLabel: "Brouillon assisté par IA — à vérifier par l'agent de santé",
    fields: {
      mainConcern: "Motif principal",
      duration: "Durée",
      symptoms: "Symptômes signalés",
      context: "Contexte pertinent",
      missing: "Informations manquantes / questions à poser",
    },
    confidence: "Confiance de l'IA",
    conf: { low: "Faible", medium: "Moyenne", high: "Élevée" },
    confNote: "L'IA peut se tromper ou être incomplète. Vérifiez chaque champ avec le patient.",
    nei: "Informations insuffisantes",
    approveCheck: "J'ai vérifié et corrigé ce résumé. J'en suis responsable.",
    approve: "Approuver et enregistrer",
    savedOk: "Consultation enregistrée sur l'appareil",
    pending: "En attente de synchro",
    synced: "Synchronisé",
    syncNow: "Synchroniser",
    syncing: "Synchronisation…",
    syncOffline: "Vous êtes hors ligne. Les dossiers restent sur l'appareil jusqu'au retour de la connexion.",
    empty: "Aucune consultation enregistrée.",
    emergencyTitle: "Avis d'urgence",
    emergency:
      "Si le patient a besoin de soins immédiats, arrêtez et suivez maintenant les procédures d'urgence et de référence locales.",
    emergencyFlag: "Signes de danger possibles mentionnés. Suivez les procédures d'urgence locales.",
    notDx: "Cet outil ne pose pas de diagnostic et ne recommande aucun traitement. L'agent de santé prend toutes les décisions cliniques.",
    home: "Accueil",
    newEnc: "Nouvelle consultation",
    aiPrepare: "Préparer l'IA hors ligne",
    aiPreparing: "Préparation de l'IA hors ligne",
    aiPreparingSub: "Le modèle d'IA léger est enregistré sur cet appareil pour une utilisation hors ligne.",
    aiSize: "Téléchargement unique, environ 370 Mo sur téléphone, 500 Mo sur ordinateur. Utilisez le Wi-Fi si possible.",
    aiReady: "IA hors ligne prête",
    aiFailed: "Le modèle d'IA n'a pas pu démarrer sur cet appareil.",
    aiCrashed: "Le modèle d'IA a fermé l'application la dernière fois, probablement par manque de mémoire sur cet appareil. Le mode hors ligne de base est utilisé pour que vous puissiez continuer.",
    aiOfflineMissing: "Le modèle d'IA n'est pas encore enregistré sur cet appareil. Connectez-vous à Internet et touchez « Réessayer » pour l'enregistrer.",
    aiNotSaved: "Cet appareil n'a pas gardé le modèle d'IA enregistré ; il faudra Internet la prochaine fois.",
    aiRetry: "Réessayer",
    aiPrivacy: "Le traitement IA se fait sur cet appareil. Les descriptions des patients ne sont pas envoyées à un service d'IA en ligne.",
    basicMode: "Mode de traitement hors ligne basique",
    basicModeSub: "Règles simples par mots-clés, pas un modèle d'IA.",
    aiDetails: "Détails de l'IA",
    det: { processing: "Traitement", onDevice: "Sur l'appareil", model: "Modèle", lightweight: "modèle de langage local léger", cloud: "IA en ligne requise", review: "Vérification humaine requise", dx: "Usage diagnostique", engine: "Moteur utilisé", acc: "Accélération", yes: "Oui", no: "Non", notLoaded: "non chargé — mots-clés" },
  },
} as const;

export const SAMPLES: Record<Lang, string> = {
  en: "My daughter has had a fever and cough for three days. She is not eating well and she is tired. We live far from the clinic and the water at home is from the well.",
  fr: "Mon fils a de la fièvre et la diarrhée depuis deux jours. Il vomit parfois et il est très fatigué. Nous habitons loin du centre de santé.",
};

const SYM: Record<Lang, [RegExp, string][]> = {
  en: [
    [/fever|hot body/i, "fever"], [/cough/i, "cough"], [/diarrh/i, "diarrhoea"], [/vomit/i, "vomiting"],
    [/headache/i, "headache"], [/tired|weak|fatigue/i, "tiredness / weakness"], [/rash/i, "rash"],
    [/pain|hurt|ache/i, "pain"], [/not eating|no appetite/i, "reduced appetite"], [/breath/i, "breathing difficulty"],
    [/bleed/i, "bleeding"], [/swell/i, "swelling"], [/dizz/i, "dizziness"],
  ],
  fr: [
    [/fi[eè]vre|corps chaud/i, "fièvre"], [/tou(x|sse)/i, "toux"], [/diarrh/i, "diarrhée"], [/vomi/i, "vomissements"],
    [/mal de t[eê]te|c[ée]phal/i, "maux de tête"], [/fatigu|faible/i, "fatigue / faiblesse"], [/[ée]ruption|boutons/i, "éruption cutanée"],
    [/douleur|mal au|mal [àa]/i, "douleur"], [/mange (pas|plus)|app[ée]tit/i, "perte d'appétit"], [/respir|souffle/i, "difficulté à respirer"],
    [/saign/i, "saignement"], [/gonfl|enfl/i, "gonflement"], [/vertige/i, "vertiges"],
  ],
};
const DANGER = /convuls|unconscious|not breathing|can't breathe|cannot breathe|heavy bleeding|seizure|inconscient|ne respire|saigne beaucoup|crise|chest pain|douleur thoracique/i;
const NUMW: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six_: "6", sept: "7" };

function duration(text: string, lang: Lang): string | null {
  const re = lang === "en"
    ? /(\d+|one|two|three|four|five|six|seven|a)\s+(day|days|week|weeks|month|months)/i
    : /(\d+|un|une|deux|trois|quatre|cinq|six|sept)\s+(jour|jours|semaine|semaines|mois)/i;
  const m = text.match(re);
  if (m) return `${NUMW[(m[1] ?? "").toLowerCase()] ?? (m[1] === "a" ? "1" : m[1])} ${m[2]}`;
  if (/yesterday|hier/i.test(text)) return lang === "en" ? "since yesterday" : "depuis hier";
  if (/this morning|ce matin/i.test(text)) return lang === "en" ? "since this morning" : "depuis ce matin";
  return null;
}

export function analyze(text: string, lang: Lang): { summary: Summary; emergency: boolean } {
  const nei = T[lang].nei;
  const syms = SYM[lang].filter(([r]) => r.test(text)).map(([, s]) => s);
  const dur = duration(text, lang);
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const ctx = sentences.filter((s) => !SYM[lang].some(([r]) => r.test(s)) && !duration(s, lang));
  const missing: string[] = [];
  const q = lang === "en"
    ? { age: "Patient age?", dur: "How long have symptoms lasted?", sev: "How severe? Getting better or worse?", med: "Any medicines already taken?", danger: "Any danger signs (convulsions, unable to drink, breathing difficulty)?" }
    : { age: "Âge du patient ?", dur: "Depuis combien de temps ?", sev: "Gravité ? Amélioration ou aggravation ?", med: "Médicaments déjà pris ?", danger: "Signes de danger (convulsions, ne peut pas boire, difficulté à respirer) ?" };
  if (!/\d+\s*(year|yr|an|ans|month|mois)\s*(old)?|age|âge/i.test(text)) missing.push(q.age);
  if (!dur) missing.push(q.dur);
  missing.push(q.sev, q.med, q.danger);
  const score = (syms.length > 0 ? 1 : 0) + (dur ? 1 : 0) + (text.length > 120 ? 1 : 0);
  return {
    emergency: DANGER.test(text),
    summary: {
      mainConcern: syms.length ? syms.slice(0, 2).join(lang === "en" ? " and " : " et ") : nei,
      duration: dur ?? nei,
      symptoms: syms.length ? syms.join(", ") : nei,
      context: ctx.length ? ctx.join(" ") : nei,
      missing: missing.map((m) => "• " + m).join("\n"),
      confidence: score >= 3 ? "high" : score === 2 ? "medium" : "low",
    },
  };
}

import { getAll, putMany, persistStorage } from "./db";

const LEGACY_KEY = "nvb.encounters.v1";
export async function loadEncounters(): Promise<Encounter[]> {
  void persistStorage();
  let list = await getAll();
  if (list.length) return list;
  // migrate earlier localStorage records, else seed sample data
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) { list = JSON.parse(raw); localStorage.removeItem(LEGACY_KEY); }
  } catch {}
  if (!list.length) list = [
    { id: "seed1", patientRef: "AK-0412", lang: "en", emergency: false, status: "synced",
      createdAt: new Date(Date.now() - 864e5 * 2).toISOString(), transcript: SAMPLES.en, summary: analyze(SAMPLES.en, "en").summary },
    { id: "seed2", patientRef: "MD-0098", lang: "fr", emergency: false, status: "pending",
      createdAt: new Date(Date.now() - 36e5 * 5).toISOString(), transcript: SAMPLES.fr, summary: analyze(SAMPLES.fr, "fr").summary },
  ];
  await putMany(list);
  return getAll();
}
export async function saveEncounters(list: Encounter[]) {
  await putMany(list);
}
