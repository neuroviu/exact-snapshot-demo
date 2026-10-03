<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Offline: vite-plugin-pwa generateSW writes sw.js into dist/client; registration only via src/lib/pwa.ts (guarded off in dev/preview). Why: SSR app has no index.html, so pages use NetworkFirst runtime cache warmed on registration.
- Encounters persist in IndexedDB (src/lib/db.ts), not localStorage. Why: durable offline storage across app restarts.
- On-device AI: Transformers.js runs in a Web Worker (src/lib/ai.worker.ts) wrapped by src/lib/localAI.ts; model output is lexically grounded against the patient text and the keyword processor in bridge.ts stays as labelled fallback. Why: no cloud LLM, no UI freeze, no invented facts.
- On-device AI start-up goes through startAI() in src/lib/localAI.ts, which skips auto-loading when a busy flag survived a previous run. Why: phones that run out of memory loading the model would otherwise crash on every reopen.
