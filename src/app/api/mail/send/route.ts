import { sendMail } from "@/lib/mail";
import { sameOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json()) as { to?: string; subject?: string; body?: string; from?: string };
  try {
    return Response.json({ ok: true, ...(await sendMail({ to: String(b.to ?? ""), subject: String(b.subject ?? ""), body: String(b.body ?? ""), from: String(b.from ?? "") })) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "failed" }, { status: 400 });
  }
}
