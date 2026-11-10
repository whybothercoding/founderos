import { listSenders } from "@/lib/baserow";
import { loadDashboard } from "@/lib/dashboard";
import { DEMO_SENDERS, isDemo } from "@/lib/demo";
import { Compose } from "../compose";
import { Body, Card, Page, rel } from "../ui";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Mail({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const [d, senders] = await Promise.all([loadDashboard(), isDemo() ? DEMO_SENDERS : listSenders().catch(() => [])]);
  const initial = one(q.to) ? { to: one(q.to), subject: one(q.subject), entity: one(q.entity) } : undefined;
  return (
    <Page>
      <Card title="Inbox: needs reply (7d, unread)" count={d.mail.ok ? d.mail.data.length : undefined}>
        <Body p={d.mail} empty="nothing waiting">
          {(rows) => rows.slice(0, 15).map((m) => (
            <div key={m.id} className="truncate">{m.from} <span className="text-zinc-500">{m.subject} · {rel(m.date)}</span></div>
          ))}
        </Body>
      </Card>
      <Card title="Compose">
        <Compose senders={senders} initial={initial} />
      </Card>
    </Page>
  );
}
