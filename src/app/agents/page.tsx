import { loadDashboard } from "@/lib/dashboard";
import { Body, Card, dot, Page, rel } from "../ui";

export const dynamic = "force-dynamic";

export default async function Agents() {
  const d = await loadDashboard();
  return (
    <Page>
      <Card title="Agents (Herdr)" count={d.blocked.length}>
        <Body p={d.agents} empty="no agent panes">
          {(rows) => rows.map((a) => (
            <div key={a.pane} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot[a.status]}`} />
              <span className="w-14 text-zinc-600 dark:text-zinc-400">{a.agent}</span>
              <span className="truncate">{a.title || a.cwd.replace(/^.*\/Documents\/?/, "~/")}</span>
              <span className="ml-auto text-zinc-500">{a.status}</span>
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Agent runs (latest)">
        <Body p={d.runs} empty="no runs yet">
          {(rows) => rows.map((r) => (
            <details key={r.id}>
              <summary className="cursor-pointer truncate">
                <span className={r.outcome === "success" ? "text-green-600 dark:text-green-500" : r.outcome ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>{r.outcome || "running"}</span>{" "}
                {r.summary} <span className="text-zinc-500">{r.started ? rel(r.started) : ""}</span>
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">{r.result || "no result yet"}</pre>
            </details>
          ))}
        </Body>
      </Card>
    </Page>
  );
}
