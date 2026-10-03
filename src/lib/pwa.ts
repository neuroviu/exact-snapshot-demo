// Single, guarded service-worker registration point. Never registers in dev,
// iframes, or Lovable preview hosts; `?sw=off` unregisters.
function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  const bad = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (bad.some((d) => h === d || h.endsWith("." + d))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()),
    );
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    // Warm the page cache so the app shell opens offline right after the first visit.
    await navigator.serviceWorker.ready;
    const cache = await caches.open("nvb-pages");
    await cache.add(new Request("/", { cache: "reload" }));
  } catch (e) {
    console.warn("SW registration failed", e);
  }
}
