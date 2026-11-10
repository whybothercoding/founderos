import { cached, panel } from "./exec";
import { herdrAgents } from "./herdr";
import { failedRuns } from "./github";
import { openLoops } from "./git";
import { failedExecutions } from "./n8n";
import { listRuns, openTasks } from "./baserow";
import { activeTaskIds } from "./dispatch";
import { aiSpend } from "./openrouter";
import { needsReply } from "./mail";
import { demoDashboard, isDemo } from "./demo";

async function loadLive() {
  const [agents, ci, loops, n8n, tasks, mail, runs, spend] = await Promise.all([
    panel(herdrAgents),
    panel(failedRuns),
    panel(openLoops),
    panel(failedExecutions),
    panel(openTasks),
    panel(needsReply),
    panel(listRuns),
    panel(aiSpend),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const blocked = agents.ok ? agents.data.filter((a) => a.status === "blocked") : [];
  const dueTasks = tasks.ok ? tasks.data.filter((t) => t.due && t.due <= today) : [];
  const active = activeTaskIds();
  const stuck = tasks.ok ? tasks.data.filter((t) => t.status === "running" && !active.has(t.id)) : [];
  const needsMe =
    stuck.length +
    blocked.length +
    (ci.ok ? ci.data.length : 0) +
    (n8n.ok ? n8n.data.length : 0) +
    dueTasks.length +
    (mail.ok ? mail.data.length : 0);
  return { agents, ci, loops, n8n, tasks, mail, runs, spend, blocked, dueTasks, stuck, needsMe };
}

export type Dashboard = Awaited<ReturnType<typeof loadLive>>;

// 15 s memo: the layout (nav badges) and the page share one load per navigation, the alert poller reuses it too.
export const loadDashboard = async (): Promise<Dashboard> => (isDemo() ? demoDashboard() : cached("dashboard", 15_000, loadLive));
