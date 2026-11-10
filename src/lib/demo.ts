// FOUNDEROS_DEMO=1: synthetic data for screenshots and trying the UI without any credentials.
// Everything here is fictional. No source is contacted, no alerts are sent, nothing is written.
import type { Dashboard } from "./dashboard";
import type { Seo } from "./seo";

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

export function demoSeo(): Seo {
  const priorities = ok([
    { id: 1, site: "shop.example", action: "Page one ranks 4th for a high-intent query; add a comparison table and FAQ to move into the top 3.", keyword: "best standing desk", type: "ranking_drop", urgency: "high", status: "new", searches: 5400 },
    { id: 2, site: "blog.example", action: "Competitors cover the setup guide topic; write a step-by-step article.", keyword: "how to set up a home office", type: "content_gap", urgency: "medium", status: "new", searches: 2900 },
    { id: 3, site: "acme.example", action: "A new competitor appears in the top 10 for the brand-adjacent term.", keyword: "", type: "new_competitor", urgency: "low", status: "new", searches: null },
  ]);
  const gsc = ok([
    { site: "shop.example", period: "2026-11-05", clicks: 412, prevClicks: 365, impressions: 18400, prevImpressions: 17100, position: 11.4, topQuery: "standing desk", zeroPages: 6, sitemapUrls: 48 },
    { site: "blog.example", period: "2026-11-05", clicks: 96, prevClicks: 120, impressions: 5200, prevImpressions: 5900, position: 14.8, topQuery: "home office setup", zeroPages: 12, sitemapUrls: 30 },
    { site: "acme.example", period: "2026-11-05", clicks: 18, prevClicks: 18, impressions: 840, prevImpressions: 529, position: 10.2, topQuery: "acme widgets", zeroPages: 2, sitemapUrls: 8 },
  ]);
  const opps = ok([
    { query: "standing desk converter", site: "shop.example", page: "https://shop.example/converters", impressions: 1200, position: 8.6, potential: 41, type: "striking_distance" },
    { query: "ergonomic keyboard tray", site: "shop.example", page: "https://shop.example/trays", impressions: 640, position: 12.1, potential: 22, type: "striking_distance" },
    { query: "desk cable management", site: "blog.example", page: "https://blog.example/cables", impressions: 980, position: 6.2, potential: 18, type: "ctr_gap" },
  ]);
  const ga = ok([
    { property: "shop.example", period: "2026-11-08", sessions: 2150, prevSessions: 1980, deltaPct: 8.6, keyEvents: 64, channel: "Organic Search", topPage: "/standing-desks" },
    { property: "blog.example", period: "2026-11-08", sessions: 840, prevSessions: 910, deltaPct: -7.7, keyEvents: 9, channel: "Organic Search", topPage: "/home-office-setup" },
    { property: "acme.example", period: "2026-11-08", sessions: 42, prevSessions: 38, deltaPct: 10.5, keyEvents: 1, channel: "Direct", topPage: "/" },
  ]);
  const crawl = ok([
    { site: "blog.example", run: "2026-11-08", pages: 142, errors: 3, prevErrors: 1, warnings: 9, topErrors: "broken internal links" },
    { site: "shop.example", run: "2026-11-08", pages: 310, errors: 0, prevErrors: 0, warnings: 4, topErrors: "" },
    { site: "acme.example", run: "2026-11-08", pages: 71, errors: 0, prevErrors: 0, warnings: 0, topErrors: "" },
  ]);
  const ranks = ok([
    { site: "shop.example", run: "2026-11-08", tracked: 40, ranked: 22, top10: 7, best: { keyword: "best standing desk", position: 4 } },
    { site: "blog.example", run: "2026-11-08", tracked: 30, ranked: 11, top10: 2, best: { keyword: "home office setup", position: 7 } },
  ]);
  const rivals = ok([
    { domain: "bigdesks.example", site: "shop.example", appearances: 31, lastSeen: "2026-11-08" },
    { domain: "officeguide.example", site: "blog.example", appearances: 24, lastSeen: "2026-11-08" },
  ]);
  return { priorities, gsc, opps, ga, crawl, ranks, rivals, badge: 2 };
}
