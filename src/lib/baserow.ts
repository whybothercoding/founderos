import { BASEROW } from "./config";

// Row access uses a Baserow database token (scoped to the FounderOS database only) read from the shell by reference.
// Deliberate deviation from the "rows via MCP" rule: a server process cannot call MCP tools.
const TOKEN_VAR = "FOUNDEROS_BASEROW_TOKEN";
export const TABLES = { tasks: BASEROW.tasksTable, runs: 807, sends: 808 };

export type Task = { id: number; title: string; entity: string; status: string; due: string | null; repo: string; notes: string };

async function api<T>(method: string, table: number, rowId?: number, body?: unknown): Promise<T> {
  const token = process.env[TOKEN_VAR];
  if (!token) throw new Error(`${TOKEN_VAR} not set in the shell`);
  const url = `${BASEROW.url}/api/database/rows/table/${table}/${rowId ?? ""}${rowId ? "/" : ""}?user_field_names=true&size=200`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Baserow ${r.status} ${(await r.text()).slice(0, 120)}`);
  return method === "DELETE" ? (undefined as T) : r.json();
}

const val = (x: unknown) => (x && typeof x === "object" && "value" in x ? String((x as { value: unknown }).value) : "");
const toTask = (x: Record<string, unknown>): Task => ({
  id: x.id as number,
  title: String(x.title ?? ""),
  entity: val(x.entity),
  status: val(x.status),
  due: (x.due as string) || null,
  repo: String(x.repo ?? ""),
  notes: String(x.notes ?? ""),
});

export async function openTasks(): Promise<Task[]> {
  const j = await api<{ results: Record<string, unknown>[] }>("GET", TABLES.tasks);
  return j.results.map(toTask).filter((t) => t.status !== "done");
}

export async function getTask(id: number) {
  return toTask(await api<Record<string, unknown>>("GET", TABLES.tasks, id));
}

export async function createTask(t: { title: string; entity: string; repo: string; notes: string }) {
  return toTask(await api<Record<string, unknown>>("POST", TABLES.tasks, undefined, { ...t, status: "todo" }));
}

export async function updateTask(id: number, patch: Record<string, unknown>) {
  await api("PATCH", TABLES.tasks, id, patch);
}

export async function createRun(r: { summary: string; taskId: number; agent: string }) {
  const row = await api<{ id: number }>("POST", TABLES.runs, undefined, {
    summary: r.summary, task: [r.taskId], agent: r.agent, started: new Date().toISOString(),
  });
  return row.id;
}

export async function updateRun(id: number, patch: Record<string, unknown>) {
  await api("PATCH", TABLES.runs, id, patch);
}
