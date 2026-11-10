import { dispatch } from "@/lib/dispatch";
import { sameOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { taskId, agent } = (await req.json()) as { taskId?: number; agent?: string };
  try {
    return Response.json(await dispatch(Number(taskId), String(agent)));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 400 });
  }
}
