import { panel } from "./exec";
import { herdrAgents } from "./herdr";
import { failedRuns } from "./github";
import { openLoops } from "./git";
import { failedExecutions } from "./n8n";
import { openTasks } from "./baserow";
import { needsReply } from "./mail";

export async function loadDashboard() {
  const [agents, ci, loops, n8n, tasks, mail] = await Promise.all([
    panel(herdrAgents),
    panel(failedRuns),
    panel(openLoops),
    panel(failedExecutions),
    panel(openTasks),
    panel(needsReply),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const blocked = agents.ok ? agents.data.filter((a) => a.status === "blocked") : [];
  const dueTasks = tasks.ok ? tasks.data.filter((t) => t.due && t.due <= today) : [];
  const needsMe =
    blocked.length +
    (ci.ok ? ci.data.length : 0) +
    (n8n.ok ? n8n.data.length : 0) +
    dueTasks.length +
    (mail.ok ? mail.data.length : 0);
  return { agents, ci, loops, n8n, tasks, mail, blocked, dueTasks, needsMe };
}
