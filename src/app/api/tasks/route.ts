import { createTask } from "@/lib/baserow";
import { ENTITIES } from "@/lib/config";
import { localRepos } from "@/lib/git";
import { sameOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json()) as { title?: string; entity?: string; repo?: string; notes?: string; contact?: string };
  const title = String(b.title ?? "").trim().slice(0, 200);
  if (!title) return Response.json({ error: "title required" }, { status: 400 });
  if (!ENTITIES.includes(String(b.entity))) return Response.json({ error: "bad entity" }, { status: 400 });
  const repo = String(b.repo ?? "");
  if (repo && !(await localRepos()).some((r) => r.path === repo)) return Response.json({ error: "unknown repo" }, { status: 400 });
  const contact = String(b.contact ?? "").trim();
  if (contact && !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(contact)) return Response.json({ error: "contact must be one email address" }, { status: 400 });
  try {
    return Response.json(await createTask({ title, entity: String(b.entity), repo, notes: String(b.notes ?? "").slice(0, 2000), contact }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 500 });
  }
}
