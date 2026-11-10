import { rerunFailed } from "@/lib/github";
import { readJson, sameOrigin } from "@/lib/origin";

// The only mutating endpoint. Same-origin only (the dashboard is bound to localhost).
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { repo, id } = (await readJson(req)) as { repo?: string; id?: string };
  try {
    await rerunFailed(String(repo), String(id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 400 });
  }
}
