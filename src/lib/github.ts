import { cached, mapLimit, run } from "./exec";
import { OWNERS } from "./config";
import { localRepos } from "./git";

export type FailedRun = { id: number; repo: string; entity: string; workflow: string; branch: string; url: string; when: string };

/** All repos in scope for CI: every local clone with a GitHub remote plus every non-archived repo of each owner. */
export function ciRepos(): Promise<{ slug: string; entity: string }[]> {
  return cached("ci-repos", 10 * 60_000, async () => {
    const map = new Map<string, { slug: string; entity: string }>();
    for (const r of await localRepos()) if (r.slug) map.set(r.slug.toLowerCase(), { slug: r.slug, entity: r.entity });
    await Promise.all(
      OWNERS.map(async (o) => {
        try {
          const out = await run("gh", ["repo", "list", o.login, "--limit", "200", "--no-archived", "--json", "nameWithOwner"], { timeout: 30000 });
          for (const r of JSON.parse(out) as { nameWithOwner: string }[]) {
            const k = r.nameWithOwner.toLowerCase();
            if (!map.has(k)) map.set(k, { slug: r.nameWithOwner, entity: o.entity });
          }
        } catch {}
      }),
    );
    return [...map.values()];
  });
}

type GhRun = { databaseId: number; workflowName: string; headBranch: string; url: string; createdAt: string; conclusion: string };

/** Workflow+branch pairs whose newest run failed in the last 7 days (read-only, via the `gh` login). */
export function failedRuns(): Promise<FailedRun[]> {
  return cached("failed-runs", 2 * 60_000, async () => {
    const repos = await ciRepos();
    const cutoff = Date.now() - 7 * 864e5;
    const res = await mapLimit(repos, 6, async (r): Promise<FailedRun[]> => {
      try {
        const out = await run("gh", [
          "run", "list", "--repo", r.slug, "--limit", "30",
          "--json", "databaseId,workflowName,headBranch,url,createdAt,conclusion",
        ]);
        const latest = new Map<string, GhRun>(); // newest run per workflow+branch decides
        for (const x of JSON.parse(out) as GhRun[]) {
          const k = `${x.workflowName}|${x.headBranch}`;
          const cur = latest.get(k);
          if (!cur || x.createdAt > cur.createdAt) latest.set(k, x);
        }
        return [...latest.values()]
          .filter((x) => x.conclusion === "failure" && new Date(x.createdAt).getTime() > cutoff)
          .map((x) => ({ id: x.databaseId, repo: r.slug, entity: r.entity, workflow: x.workflowName, branch: x.headBranch, url: x.url, when: x.createdAt }));
      } catch {
        return [];
      }
    });
    return res.flat();
  });
}

/** Re-run only the failed jobs of a run. Repo must be in scope, id numeric. */
export async function rerunFailed(repo: string, id: string) {
  if (!/^\d+$/.test(id)) throw new Error("bad run id");
  if (!(await ciRepos()).some((r) => r.slug === repo)) throw new Error("repo not in scope");
  await run("gh", ["run", "rerun", id, "--failed", "--repo", repo], { timeout: 30000 });
}

/** Tail of the failed-job log of a run (for a fix task). */
export async function failedLog(repo: string, id: string) {
  if (!/^\d+$/.test(id)) throw new Error("bad run id");
  if (!(await ciRepos()).some((r) => r.slug === repo)) throw new Error("repo not in scope");
  const out = await run("gh", ["run", "view", id, "--log-failed", "--repo", repo], { timeout: 45000 }).catch(() => "");
  return out.trim().slice(-3000);
}
