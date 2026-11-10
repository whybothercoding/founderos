import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDashboard } from "./dashboard";

// Discord alerts for NEW items only. Destination = incoming-webhook URL read from the shell by reference.
// State (keys of currently active items) lives in .state/alerts.json; the first run only seeds it.
const HOOK_VAR = "FOUNDEROS_DISCORD_WEBHOOK";
const FILE = join(process.cwd(), ".state", "alerts.json");

type Source = { prefix: string; ok: boolean; items: [string, string][] }; // [key, line]

export const alertsEnabled = () => !!process.env[HOOK_VAR];

export async function checkAndAlert() {
  const d = await loadDashboard();
  const sources: Source[] = [
    { prefix: "blocked", ok: d.agents.ok, items: d.blocked.map((a) => [`blocked:${a.pane}`, `🛑 ${a.agent} blocked: ${a.title || a.cwd}`]) },
    { prefix: "ci", ok: d.ci.ok, items: d.ci.ok ? d.ci.data.map((r) => [`ci:${r.id}`, `❌ CI ${r.repo} · ${r.workflow} (${r.branch})`]) : [] },
    { prefix: "n8n", ok: d.n8n.ok, items: d.n8n.ok ? d.n8n.data.map((e) => [`n8n:${e.id}`, `⚠️ n8n failed: ${e.workflow}`]) : [] },
    { prefix: "mail", ok: d.mail.ok, items: d.mail.ok ? d.mail.data.map((m) => [`mail:${m.id}`, `📧 reply needed: ${m.from} — ${m.subject.slice(0, 60)}`]) : [] },
    { prefix: "stuck", ok: d.tasks.ok, items: d.stuck.map((t) => [`stuck:${t.id}`, `⏸ task stuck in running: ${t.title}`]) },
    { prefix: "due", ok: d.tasks.ok, items: d.dueTasks.map((t) => [`due:${t.id}:${t.due}`, `📌 due: ${t.title}`]) },
  ];

  let prev: string[] | null = null;
  try {
    prev = (JSON.parse(await readFile(FILE, "utf8")) as { seen: string[] }).seen;
  } catch {}

  const prevSet = new Set(prev ?? []);
  const current = new Map<string, string>();
  const keep: string[] = [];
  for (const s of sources) {
    if (s.ok) for (const [k, line] of s.items) current.set(k, line);
    else for (const k of prevSet) if (k.startsWith(`${s.prefix}:`)) keep.push(k); // source down: don't forget, don't re-alert later
  }
  const fresh = prev === null ? [] : [...current].filter(([k]) => !prevSet.has(k));

  const hook = process.env[HOOK_VAR];
  if (hook && fresh.length) {
    const counts = new Map<string, number>();
    for (const [, line] of fresh) counts.set(line, (counts.get(line) ?? 0) + 1);
    const lines = [...counts].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l));
    const content = `**FounderOS** · ${fresh.length} new\n${lines.slice(0, 15).join("\n")}${lines.length > 15 ? `\n…and ${lines.length - 15} more` : ""}`.slice(0, 1900);
    const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
    if (!r.ok) throw new Error(`Discord webhook ${r.status}`); // state not saved: retried next tick
  }

  await mkdir(join(process.cwd(), ".state"), { recursive: true });
  await writeFile(FILE, JSON.stringify({ seen: [...current.keys(), ...keep] }));
  return { fresh: fresh.length, sent: !!hook && fresh.length > 0, seeded: prev === null };
}
