import { setTaskStatus } from "@/lib/baserow";
import { readJson, sameOrigin } from "@/lib/origin";

// Only manual transitions: close (done) or put back (todo). `running`/`review` are set by dispatch.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id, status } = (await readJson(req)) as { id?: number; status?: string };
  if (!Number.isInteger(id) || !["todo", "done"].includes(String(status))) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    await setTaskStatus(Number(id), status as "todo" | "done");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 500 });
  }
}
