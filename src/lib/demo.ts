// FOUNDEROS_DEMO=1: synthetic data for screenshots and trying the UI without any credentials.
// Everything here is fictional. No source is contacted, no alerts are sent, nothing is written.
import type { Dashboard } from "./dashboard";

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const ok = <T,>(data: T) => ({ ok: true as const, data });

export const isDemo = () => process.env.FOUNDEROS_DEMO === "1";

export const DEMO_REPOS = ["acme/api", "acme/web", "acme/infra", "studio/site", "tools/founderos"];
export const DEMO_SENDERS = [
  { address: "hello@acme.example", name: "Acme", entity: "Acme Ltd", project: "Acme" },
  { address: "me@example.org", name: "Alex", entity: "Personal", project: "Portfolio and outreach" },
];

export function demoDashboard(): Dashboard {
  const agents = ok([
    { agent: "claude", status: "working" as const, cwd: "~/acme/api", pane: "w1:p1", title: "Refactor auth middleware" },
    { agent: "codex", status: "idle" as const, cwd: "~/acme/web", pane: "w1:p2", title: "Fix flaky checkout test" },
    { agent: "grok", status: "blocked" as const, cwd: "~/acme/infra", pane: "w2:p1", title: "Plan database migration" },
    { agent: "agy", status: "done" as const, cwd: "~/studio/site", pane: "w3:p1", title: "Write release notes" },
  ]);
  const ci = ok([
    { id: 1, repo: "acme/web", entity: "Acme Ltd", workflow: "CI", branch: "main", url: "https://github.com/acme/web/actions/runs/1", when: ago(42) },
    { id: 2, repo: "acme/api", entity: "Acme Ltd", workflow: "Deploy (production)", branch: "release", url: "https://github.com/acme/api/actions/runs/2", when: ago(300) },
  ]);
  const n8n = ok([
    { id: "1", workflow: "[Shop] Order Sync", prefix: "Shop", when: ago(95) },
    { id: "2", workflow: "[Shop] Order Sync", prefix: "Shop", when: ago(400) },
    { id: "3", workflow: "[Blog] Weekly Digest", prefix: "Blog", when: ago(1500) },
  ]);
  const loops = ok([
    { path: "acme/api", entity: "Acme Ltd", branch: "feat/auth-refactor", dirty: 7, ahead: 2 },
    { path: "acme/web", entity: "Acme Ltd", branch: "main", dirty: 1, ahead: 0 },
    { path: "studio/site", entity: "Personal", branch: "docs/release-notes", dirty: 0, ahead: 3 },
  ]);
  const tasks = ok([
    { id: 1, title: "Fix flaky checkout test", entity: "Acme Ltd", status: "todo", due: null, repo: "acme/web", notes: "", contact: "" },
    { id: 2, title: "Reply to partner about API limits", entity: "Acme Ltd", status: "todo", due: null, repo: "", notes: "", contact: "partner@example.com" },
    { id: 3, title: "Write release notes", entity: "Personal", status: "review", due: null, repo: "studio/site", notes: "", contact: "" },
    { id: 4, title: "Rotate staging credentials", entity: "Acme Ltd", status: "todo", due: new Date().toISOString().slice(0, 10), repo: "acme/infra", notes: "", contact: "" },
  ]);
  const mail = ok([
    { id: "1", from: "Dana Whitfield", subject: "Question about the enterprise plan", date: ago(35) },
    { id: "2", from: "Sam Okoro", subject: "Re: integration timeline", date: ago(180) },
  ]);
  const runs = ok([
    { id: 3, summary: "claude: Write release notes", agent: "claude", outcome: "success", started: ago(120), ended: ago(115), result: "Drafted release notes for v1.4 from the merged PRs. Nothing left except a final read-through.", task: "Write release notes" },
    { id: 2, summary: "grok: Plan database migration", agent: "grok", outcome: "failed", started: ago(600), ended: ago(590), result: "Stopped: the migration needs a shell command that edit-only mode does not allow.", task: "Plan database migration" },
  ]);
  const spend = ok({ today: 0.42, week: 3.18, month: 11.76, total: 58.3, limit: null, remaining: null });
  const blocked = agents.data.filter((a) => a.status === "blocked");
  const today = new Date().toISOString().slice(0, 10);
  const dueTasks = tasks.data.filter((t) => t.due && t.due <= today);
  const needsMe = blocked.length + ci.data.length + n8n.data.length + dueTasks.length + mail.data.length;
  return { agents, ci, loops, n8n, tasks, mail, runs, spend, blocked, dueTasks, stuck: [], needsMe };
}
