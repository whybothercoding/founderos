import { loadDashboard } from "@/lib/dashboard";
import { localRepos } from "@/lib/git";
import { DEMO_REPOS, isDemo } from "@/lib/demo";
import { EmailTaskButton } from "../compose";
import { AddTaskForm, DispatchControl, TaskActions } from "../task-controls";
import { Body, Card } from "../ui";

export const dynamic = "force-dynamic";

export default async function Tasks() {
  const [d, repos] = await Promise.all([loadDashboard(), isDemo() ? DEMO_REPOS.map((path) => ({ path })) : localRepos()]);
  return (
    <Card title="Tasks (Baserow)" count={d.dueTasks.length + d.stuck.length}>
      <Body p={d.tasks} empty="no open tasks">
        {(rows) => rows.map((t) => (
          <div key={t.id}>
            {t.title} <span className="text-zinc-500">{t.entity} · {t.status}{t.repo ? ` · ${t.repo}` : ""}{t.contact ? ` · ${t.contact}` : ""}{t.due ? ` · due ${t.due}` : ""}</span>
            {t.status === "todo" && t.repo && <DispatchControl taskId={t.id} />}
            {t.contact && <EmailTaskButton prefill={{ to: t.contact, subject: t.title, entity: t.entity }} />}
            <TaskActions id={t.id} status={t.status} stuck={d.stuck.some((x) => x.id === t.id)} />
          </div>
        ))}
      </Body>
      <AddTaskForm repos={repos.map((r) => r.path).sort()} />
    </Card>
  );
}
