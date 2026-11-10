// Credentials come from the shell by reference (N8N_API_URL, N8N_API_KEY); never stored in the project.
export type FailedExecution = { id: string; workflow: string; prefix: string; when: string };

function base() {
  const u = (process.env.N8N_API_URL ?? "").replace(/\/$/, "");
  if (!u || !process.env.N8N_API_KEY) throw new Error("N8N_API_URL / N8N_API_KEY not set in the shell");
  return /\/api\/v1$/.test(u) ? u : `${u}/api/v1`;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${base()}${path}`, { headers: { "X-N8N-API-KEY": process.env.N8N_API_KEY! }, cache: "no-store" });
  if (!r.ok) throw new Error(`n8n API ${r.status}`);
  return r.json();
}

/** Failed executions of the last 3 days, labelled by workflow name; the bracket prefix names the owning entity. */
export async function failedExecutions(): Promise<FailedExecution[]> {
  const [execs, wfs] = await Promise.all([
    get<{ data: { id: string; workflowId: string; startedAt: string }[] }>("/executions?status=error&limit=100"),
    get<{ data: { id: string; name: string }[] }>("/workflows?limit=250"),
  ]);
  const names = new Map(wfs.data.map((w) => [w.id, w.name]));
  const cutoff = Date.now() - 3 * 864e5;
  return execs.data
    .filter((e) => new Date(e.startedAt).getTime() > cutoff)
    .map((e) => {
      const workflow = names.get(e.workflowId) ?? `workflow ${e.workflowId}`;
      return { id: e.id, workflow, prefix: /^\[([^\]]+)\]/.exec(workflow)?.[1] ?? "other", when: e.startedAt };
    });
}
