import { BASEROW } from "./config";

// Row access uses a Baserow database token (scoped to the FounderOS database only) read from the shell by reference.
// Deliberate deviation from the "rows via MCP" rule: a server process cannot call MCP tools.
const TOKEN_VAR = "FOUNDEROS_BASEROW_TOKEN";
export const TABLES = { tasks: BASEROW.tasksTable, runs: 807, sends: 808, senders: 809 };

export type Task = { id: number; title: string; entity: string; status: string; due: string | null; repo: string; notes: string; contact: string };
export type Sender = { address: string; name: string; entity: string; project: string };

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
  contact: String(x.contact ?? ""),
});

export async function openTasks(): Promise<Task[]> {
  const j = await api<{ results: Record<string, unknown>[] }>("GET", TABLES.tasks);
  return j.results.map(toTask).filter((t) => t.status !== "done");
}

export async function getTask(id: number) {
  return toTask(await api<Record<string, unknown>>("GET", TABLES.tasks, id));
}

export async function createTask(t: { title: string; entity: string; repo: string; notes: string; contact: string }) {
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

const SEND_RETENTION_DAYS = 90; // GDPR: recipients are personal data, keep the audit log only briefly

export async function logSend(s: { subject: string; to: string; entity: string; status: "sent" | "failed" }) {
  await api("POST", TABLES.sends, undefined, { ...s, sent_at: new Date().toISOString() });
}

let lastPurge = 0;
/** Delete Sends rows older than the retention window (at most every 6h). */
export async function purgeOldSends() {
  if (Date.now() - lastPurge < 6 * 3600_000) return 0;
  lastPurge = Date.now();
  const j = await api<{ results: { id: number; sent_at: string | null }[] }>("GET", TABLES.sends);
  const cutoff = Date.now() - SEND_RETENTION_DAYS * 864e5;
  const old = j.results.filter((r) => r.sent_at && new Date(r.sent_at).getTime() < cutoff);
  for (const r of old) await api("DELETE", TABLES.sends, r.id);
  return old.length;
}

/** Allowed "From" identities, edited in Baserow (table Senders). Not secrets; the SMTP login decides what the provider accepts. */
export async function listSenders(): Promise<Sender[]> {
  const j = await api<{ results: Record<string, unknown>[] }>("GET", TABLES.senders);
  return j.results
    .map((x) => ({ address: String(x.address ?? "").trim(), name: String(x.name ?? "").trim(), entity: val(x.entity), project: String(x.project ?? "").trim() }))
    .filter((s) => s.address)
    .sort((a, b) => a.entity.localeCompare(b.entity) || a.address.localeCompare(b.address));
}

export type Run = { id: number; summary: string; agent: string; outcome: string; started: string | null; ended: string | null; result: string; task: string };

/** Latest runs, newest first. */
export async function listRuns(limit = 12): Promise<Run[]> {
  const j = await api<{ results: Record<string, unknown>[] }>("GET", TABLES.runs);
  const link = (x: unknown) => (Array.isArray(x) && x[0] && typeof x[0] === "object" ? String((x[0] as { value?: unknown }).value ?? "") : "");
  return j.results
    .map((x) => ({
      id: x.id as number,
      summary: String(x.summary ?? ""),
      agent: val(x.agent),
      outcome: val(x.outcome),
      started: (x.started as string) || null,
      ended: (x.ended as string) || null,
      result: String(x.result ?? ""),
      task: link(x.task),
    }))
    .sort((a, b) => (b.started ?? "").localeCompare(a.started ?? ""))
    .slice(0, limit);
}

export async function setTaskStatus(id: number, status: "todo" | "running" | "review" | "done") {
  await updateTask(id, { status });
}
