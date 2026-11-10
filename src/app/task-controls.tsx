"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AGENTS = ["claude", "codex", "grok", "agy"];
const ENTITIES = ["IndieGoWeb Ltd", "Greek sole proprietorship", "Personal"];
const field = "rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-1.5 py-0.5 text-xs";

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.ok ? null : ((await r.json()).error as string) ?? "failed";
}

export function DispatchControl({ taskId }: { taskId: number }) {
  const router = useRouter();
  const [agent, setAgent] = useState(AGENTS[0]);
  const [s, setS] = useState<"idle" | "confirm" | "busy" | string>("idle");
  async function go() {
    if (s === "idle") return setS("confirm");
    setS("busy");
    const err = await post("/api/dispatch", { taskId, agent });
    if (err) return setS(err);
    setS("idle");
    router.refresh();
  }
  return (
    <span className="ml-2 inline-flex items-center gap-1">
      <select value={agent} onChange={(e) => { setAgent(e.target.value); setS("idle"); }} className={field}>
        {AGENTS.map((a) => <option key={a}>{a}</option>)}
      </select>
      <button onClick={go} disabled={s === "busy"} className={`rounded border px-1.5 text-xs ${s === "confirm" ? "border-amber-600 dark:border-amber-500 text-amber-600 dark:text-amber-400" : "border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"}`}>
        {s === "idle" ? "run" : s === "confirm" ? "confirm run?" : s === "busy" ? "…" : s}
      </button>
    </span>
  );
}

export function AddTaskForm({ repos }: { repos: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", entity: ENTITIES[0], repo: "", notes: "", contact: "" });
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = await post("/api/tasks", f);
    if (m) return setErr(m);
    setF({ ...f, title: "", notes: "", contact: "" });
    setErr("");
    setOpen(false);
    router.refresh();
  }
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 hover:text-black dark:hover:text-white">+ add task</button>;
  return (
    <form onSubmit={submit} className="space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-2">
      <input required autoFocus placeholder="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${field} w-full`} />
      <input type="email" placeholder="contact email for this task (optional)" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} className={`${field} w-full`} />
      <textarea placeholder="notes for the agent (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={`${field} w-full`} rows={2} />
      <div className="flex flex-wrap gap-1.5">
        <select value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} className={field}>{ENTITIES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={f.repo} onChange={(e) => setF({ ...f, repo: e.target.value })} className={field}>
          <option value="">no repo (can't dispatch)</option>
          {repos.map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="rounded border border-zinc-400 dark:border-zinc-600 px-2 text-xs hover:text-black dark:hover:text-white">add</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500">cancel</button>
      </div>
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
    </form>
  );
}

/** Close / reopen a task, or reset one stuck in `running` (its dispatch process is gone). */
export function TaskActions({ id, status, stuck }: { id: number; status: string; stuck: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function set(next: "todo" | "done") {
    setBusy(true);
    await post("/api/tasks/status", { id, status: next });
    setBusy(false);
    router.refresh();
  }
  const btn = "ml-2 rounded border border-zinc-300 dark:border-zinc-700 px-1.5 text-xs text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white";
  if (status === "review") return <><button disabled={busy} onClick={() => set("done")} className={btn}>done</button><button disabled={busy} onClick={() => set("todo")} className={btn}>reopen</button></>;
  if (stuck) return <button disabled={busy} onClick={() => set("todo")} className={`${btn} border-amber-600 text-amber-600 dark:text-amber-400`}>reset stuck</button>;
  if (status === "todo") return <button disabled={busy} onClick={() => set("done")} className={btn}>done</button>;
  return null;
}
