"use client";
import { useState } from "react";

export function RerunButton({ repo, id }: { repo: string; id: number }) {
  const [s, setS] = useState<"idle" | "confirm" | "busy" | "done" | string>("idle");
  async function go() {
    if (s === "idle") return setS("confirm");
    setS("busy");
    const r = await fetch("/api/ci/rerun", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo, id: String(id) }) });
    setS(r.ok ? "done" : (await r.json()).error ?? "failed");
  }
  const label = { idle: "re-run failed", confirm: "confirm?", busy: "…", done: "queued" }[s] ?? s;
  return (
    <button onClick={go} disabled={s === "busy" || s === "done"} className={`ml-2 rounded border px-1.5 text-xs ${s === "confirm" ? "border-amber-500 text-amber-400" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>
      {label}
    </button>
  );
}

/** Turn a failed run into a Baserow task (with the failed-job log) that can be dispatched to an agent. */
export function FixTaskButton({ repo, id, workflow, branch }: { repo: string; id: number; workflow: string; branch: string }) {
  const [s, setS] = useState<"idle" | "busy" | "done" | string>("idle");
  async function go() {
    setS("busy");
    const r = await fetch("/api/ci/fix-task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo, id: String(id), workflow, branch }) });
    const j = await r.json();
    setS(r.ok ? (j.dispatchable ? "done" : "task (no local clone)") : j.error ?? "failed");
  }
  const label = { idle: "→ fix task", busy: "…", done: "task added" }[s] ?? s;
  return (
    <button onClick={go} disabled={s === "busy" || s === "done"} className="ml-2 rounded border border-zinc-700 px-1.5 text-xs text-zinc-400 hover:text-white">
      {label}
    </button>
  );
}
