import { panel } from "./exec";
import { herdrAgents } from "./herdr";
import { failedRuns } from "./github";
import { openLoops } from "./git";
import { failedExecutions } from "./n8n";
import { openTasks } from "./baserow";

export async function loadDashboard() {
  const [agents, ci, loops, n8n, tasks] = await Promise.all([
    panel(herdrAgents),
    panel(failedRuns),
    panel(openLoops),
    panel(failedExecutions),
    panel(openTasks),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const blocked = agents.ok ? agents.data.filter((a) => a.status === "blocked") : [];
  const dueTasks = tasks.ok ? tasks.data.filter((t) => t.due && t.due <= today) : [];
  const needsMe =
    blocked.length +
    (ci.ok ? ci.data.length : 0) +
    (n8n.ok ? n8n.data.length : 0) +
    dueTasks.length;
  return { agents, ci, loops, n8n, tasks, blocked, dueTasks, needsMe };
}
