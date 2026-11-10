import { createTask } from "@/lib/baserow";
import { ciRepos, failedLog } from "@/lib/github";
import { localRepos } from "@/lib/git";
import { sameOrigin } from "@/lib/origin";

// Turns a failed CI run into a Baserow task (with the failed-job log tail) that can then be dispatched to an agent.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { repo, id, workflow, branch } = (await req.json()) as { repo?: string; id?: string; workflow?: string; branch?: string };
  try {
    const r = (await ciRepos()).find((x) => x.slug === repo);
    if (!r) throw new Error("repo not in scope");
    const log = await failedLog(r.slug, String(id));
    const local = (await localRepos()).find((x) => x.slug?.toLowerCase() === r.slug.toLowerCase());
    const task = await createTask({
      title: `Fix CI: ${r.slug.split("/")[1]} · ${String(workflow ?? "").slice(0, 80)} (${String(branch ?? "").slice(0, 60)})`,
      entity: r.entity,
      repo: local?.path ?? "",
      contact: "",
      notes: `Failed GitHub Actions run ${id} on ${r.slug}. Find the cause and fix it in this repo; do not push.\n\nFailed-job log (tail):\n${log || "(log unavailable, open the run in GitHub)"}`.slice(0, 2000),
    });
    return Response.json({ ok: true, taskId: task.id, dispatchable: !!local });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 400 });
  }
}
