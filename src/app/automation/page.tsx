import { loadDashboard } from "@/lib/dashboard";
import { Body, Card, Page, rel } from "../ui";

export const dynamic = "force-dynamic";

export default async function Automation() {
  const d = await loadDashboard();
  return (
    <Page>
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
      <Card title="AI spend (OpenRouter, n8n key)">
        {d.spend.ok ? (
          <p>
            today ${d.spend.data.today.toFixed(2)} · 7d ${d.spend.data.week.toFixed(2)} · month ${d.spend.data.month.toFixed(2)}
            {d.spend.data.remaining !== null && <span className="text-zinc-500"> · ${d.spend.data.remaining.toFixed(2)} left of ${d.spend.data.limit}</span>}
          </p>
        ) : (
          <p className="text-amber-600 dark:text-amber-500">unavailable: {d.spend.error}</p>
        )}
      </Card>
    </Page>
  );
}
