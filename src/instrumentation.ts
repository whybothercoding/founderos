// Background alert poller; runs only in the long-lived local server.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as { __fosAlerts?: boolean };
  if (g.__fosAlerts) return;
  g.__fosAlerts = true;
  const { checkAndAlert } = await import("./lib/alerts");
  const { purgeOldSends } = await import("./lib/baserow");
  const tick = () => {
    purgeOldSends().catch((e) => console.error("[purge]", e instanceof Error ? e.message : e));
    return checkAndAlert().catch((e) => console.error("[alerts]", e instanceof Error ? e.message : e));
  };
  setTimeout(tick, 10_000);
  setInterval(tick, 3 * 60_000).unref();
}
