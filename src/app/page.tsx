import type { ReactNode } from "react";
import { loadDashboard } from "@/lib/dashboard";
import type { Panel } from "@/lib/exec";
import { alertsEnabled } from "@/lib/alerts";
import { localRepos } from "@/lib/git";
import { RerunButton } from "./rerun-button";
import { listSenders } from "@/lib/baserow";
import { Compose, EmailTaskButton } from "./compose";
import { AddTaskForm, AutoRefresh, DispatchControl } from "./task-controls";

export const dynamic = "force-dynamic";

const dot: Record<string, string> = {
  blocked: "bg-red-500", working: "bg-amber-400", idle: "bg-zinc-500", done: "bg-green-500", unknown: "bg-zinc-700",
};
const rel = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

function Card({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-3 flex items-baseline justify-between text-sm font-medium text-zinc-300">
        {title}
        {count !== undefined && <span className={count ? "text-red-400" : "text-zinc-600"}>{count}</span>}
      </h2>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

function Body<T>({ p, empty, children }: { p: Panel<T[]>; empty: string; children: (rows: T[]) => ReactNode }) {
  if (!p.ok) return <p className="text-amber-500">unavailable: {p.error}</p>;
  if (!p.data.length) return <p className="text-zinc-600">{empty}</p>;
  return <>{children(p.data)}</>;
}

export default async function Home() {
  const [d, repos, senders] = await Promise.all([loadDashboard(), localRepos(), listSenders().catch(() => [])]);
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <AutoRefresh />
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">FounderOS</h1>
        <p className={d.needsMe ? "text-red-400" : "text-green-500"}>
          {d.needsMe ? `${d.needsMe} need you` : "nothing needs you"}
          <span className="ml-3 text-xs text-zinc-500">alerts {alertsEnabled() ? "on" : "off (FOUNDEROS_DISCORD_WEBHOOK not set)"}</span>
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Agents (Herdr)" count={d.blocked.length}>
          <Body p={d.agents} empty="no agent panes">
            {(rows) => rows.map((a) => (
              <div key={a.pane} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dot[a.status]}`} />
                <span className="w-14 text-zinc-400">{a.agent}</span>
                <span className="truncate">{a.title || a.cwd.replace(/^.*\/Documents\/?/, "~/")}</span>
                <span className="ml-auto text-zinc-500">{a.status}</span>
              </div>
            ))}
          </Body>
        </Card>
        <Card title="Failed CI (7d)" count={d.ci.ok ? d.ci.data.length : undefined}>
          <Body p={d.ci} empty="no failed runs">
            {(rows) => rows.map((r) => (
              <div key={r.url}>
                <a href={r.url} target="_blank" className="hover:text-white">
                  {r.repo.split("/")[1]} · {r.workflow} <span className="text-zinc-500">{r.branch} · {rel(r.when)}</span>
                </a>
                <RerunButton repo={r.repo} id={r.id} />
              </div>
            ))}
          </Body>
        </Card>
        <Card title="Failed n8n executions (3d)" count={d.n8n.ok ? d.n8n.data.length : undefined}>
          <Body p={d.n8n} empty="no failures">
            {(rows) => {
              const byWf = new Map<string, { n: number; last: string }>();
              for (const e of rows) {
                const g = byWf.get(e.workflow);
                byWf.set(e.workflow, { n: (g?.n ?? 0) + 1, last: g && g.last > e.when ? g.last : e.when });
              }
              return [...byWf].map(([wf, g]) => (
                <div key={wf}>{wf} <span className="text-zinc-500">{g.n}× · last {rel(g.last)}</span></div>
              ));
            }}
          </Body>
        </Card>
        <Card title="Open loops (git)" count={d.loops.ok ? d.loops.data.length : undefined}>
          <Body p={d.loops} empty="all repos clean and pushed">
            {(rows) => rows.map((l) => (
              <div key={l.path}>{l.path} <span className="text-zinc-500">{l.branch}{l.dirty ? ` · ${l.dirty} changed` : ""}{l.ahead ? ` · ${l.ahead} unpushed` : ""}</span></div>
            ))}
          </Body>
        </Card>
        <Card title="Inbox: needs reply (7d, unread)" count={d.mail.ok ? d.mail.data.length : undefined}>
          <Body p={d.mail} empty="nothing waiting">
            {(rows) => rows.slice(0, 10).map((m) => (
              <div key={m.id} className="truncate">{m.from} <span className="text-zinc-500">{m.subject} · {rel(m.date)}</span></div>
            ))}
          </Body>
          <Compose senders={senders} />
        </Card>
        <Card title="Tasks (Baserow)" count={d.dueTasks.length}>
          <Body p={d.tasks} empty="no open tasks">
            {(rows) => rows.map((t) => (
              <div key={t.id}>
                {t.title} <span className="text-zinc-500">{t.entity} · {t.status}{t.repo ? ` · ${t.repo}` : ""}{t.contact ? ` · ${t.contact}` : ""}{t.due ? ` · due ${t.due}` : ""}</span>
                {t.status === "todo" && t.repo && <DispatchControl taskId={t.id} />}
                {t.contact && <EmailTaskButton prefill={{ to: t.contact, subject: t.title, entity: t.entity }} />}
              </div>
            ))}
          </Body>
          <AddTaskForm repos={repos.map((r) => r.path).sort()} />
        </Card>
      </div>
    </main>
  );
}
