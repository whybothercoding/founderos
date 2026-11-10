import Link from "next/link";
import { loadDashboard } from "@/lib/dashboard";
import { Card, Page } from "./ui";

export const dynamic = "force-dynamic";

/** Everything that needs Theo right now, linking to the page that handles it; plus a few numbers at a glance. */
export default async function Overview() {
  const d = await loadDashboard();
  const wf = new Map<string, number>();
  if (d.n8n.ok) for (const e of d.n8n.data) wf.set(e.workflow, (wf.get(e.workflow) ?? 0) + 1);
  const sections = [
    { href: "/agents", title: "Agents blocked", items: d.blocked.map((a) => `${a.agent}: ${a.title || a.cwd}`) },
    { href: "/code", title: "Failed CI", items: d.ci.ok ? d.ci.data.map((r) => `${r.repo.split("/")[1]} · ${r.workflow} (${r.branch})`) : [] },
    { href: "/automation", title: "Failed n8n executions", items: [...wf].map(([w, k]) => (k > 1 ? `${w} ×${k}` : w)) },
    { href: "/mail", title: "Waiting for a reply", items: d.mail.ok ? d.mail.data.map((m) => `${m.from}: ${m.subject}`) : [] },
    { href: "/tasks", title: "Tasks due or stuck", items: [...d.dueTasks.map((t) => `due: ${t.title}`), ...d.stuck.map((t) => `stuck: ${t.title}`)] },
  ].filter((s) => s.items.length);
  const sources = (
    [["Agents", d.agents], ["CI", d.ci], ["Open loops", d.loops], ["n8n", d.n8n], ["Tasks", d.tasks], ["Mail", d.mail], ["Runs", d.runs], ["AI spend", d.spend]] as [string, { ok: boolean; error?: string }][]
  ).filter(([, p]) => !p.ok);
  const working = d.agents.ok ? d.agents.data.filter((a) => a.status === "working").length : null;
  return (
    <Page>
      <Card title="Needs you" count={d.needsMe}>
        {sections.length === 0 && <p className="text-zinc-600 dark:text-zinc-400">Nothing needs you right now.</p>}
        {sections.map((s) => (
          <div key={s.href}>
            <Link href={s.href} className="font-medium hover:underline">{s.title} <span className="text-zinc-500">({s.items.length})</span></Link>
            {s.items.slice(0, 4).map((x, i) => <div key={i} className="truncate text-zinc-600 dark:text-zinc-400">{x}</div>)}
            {s.items.length > 4 && <div className="text-zinc-500">…and {s.items.length - 4} more</div>}
          </div>
        ))}
      </Card>
      <Card title="At a glance">
        <p>Agents: {d.agents.ok ? `${d.agents.data.length} panes, ${working} working` : "unavailable"}</p>
        <p>Open repo loops: {d.loops.ok ? d.loops.data.length : "unavailable"}</p>
        <p>Open tasks: {d.tasks.ok ? d.tasks.data.length : "unavailable"}</p>
        <p>AI spend: {d.spend.ok ? `$${d.spend.data.today.toFixed(2)} today · $${d.spend.data.month.toFixed(2)} this month` : "unavailable"}</p>
        {sources.length > 0 && <p className="pt-2 text-amber-600 dark:text-amber-500">Unavailable sources: {sources.map(([n, p]) => `${n} (${p.error})`).join("; ")}</p>}
      </Card>
    </Page>
  );
}
