import { loadDashboard } from "@/lib/dashboard";
import { FixTaskButton, RerunButton } from "../rerun-button";
import { Body, Card, Page, rel } from "../ui";

export const dynamic = "force-dynamic";

export default async function Code() {
  const d = await loadDashboard();
  return (
    <Page>
      <Card title="Failed CI (7d)" count={d.ci.ok ? d.ci.data.length : undefined}>
        <Body p={d.ci} empty="no failed runs">
          {(rows) => rows.map((r) => (
            <div key={r.url}>
              <a href={r.url} target="_blank" className="hover:text-black dark:hover:text-white">
                {r.repo.split("/")[1]} · {r.workflow} <span className="text-zinc-500">{r.branch} · {rel(r.when)}</span>
              </a>
              <RerunButton repo={r.repo} id={r.id} />
              <FixTaskButton repo={r.repo} id={r.id} workflow={r.workflow} branch={r.branch} />
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Open loops (git, stuck tasks)" count={(d.loops.ok ? d.loops.data.length : 0) + d.stuck.length}>
        {d.stuck.map((t) => <div key={`stuck${t.id}`} className="text-amber-600 dark:text-amber-400">⏸ stuck in running: {t.title}</div>)}
        <Body p={d.loops} empty={d.stuck.length ? "no repo loops" : "all repos clean and pushed"}>
          {(rows) => rows.map((l) => (
            <div key={l.path}>{l.path} <span className="text-zinc-500">{l.branch}{l.dirty ? ` · ${l.dirty} changed` : ""}{l.ahead ? ` · ${l.ahead} unpushed` : ""}</span></div>
          ))}
        </Body>
      </Card>
    </Page>
  );
}
