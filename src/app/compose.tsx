"use client";
import { useEffect, useState } from "react";

const field = "rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-xs";
type Sender = { address: string; name: string; entity: string; project: string };
type Prefill = { to: string; subject: string; entity: string };

/** Task rows call this to open Compose prefilled (recipient = task contact, subject = task title). */
export function EmailTaskButton({ prefill }: { prefill: Prefill }) {
  return (
    <button onClick={() => window.dispatchEvent(new CustomEvent("fos-compose", { detail: prefill }))} title={`email ${prefill.to}`} className="ml-2 rounded border border-zinc-700 px-1.5 text-xs text-zinc-400 hover:text-white">
      ✉
    </button>
  );
}

export function Compose({ senders }: { senders: Sender[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ to: "", subject: "", body: "", from: senders[0]?.address ?? "" });
  const [s, setS] = useState<"idle" | "confirm" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<Prefill>).detail;
      const match = senders.find((x) => x.entity === d.entity) ?? senders[0];
      setF((p) => ({ ...p, to: d.to, subject: d.subject, from: match?.address ?? p.from }));
      setOpen(true);
      setS("idle");
    };
    window.addEventListener("fos-compose", h);
    return () => window.removeEventListener("fos-compose", h);
  }, [senders]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (s === "idle") return setS("confirm");
    setS("busy");
    const r = await fetch("/api/mail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!r.ok) {
      setErr((await r.json()).error ?? "failed");
      return setS("idle");
    }
    setErr("");
    setF({ ...f, to: "", subject: "", body: "" });
    setS("sent");
  }
  const edit = (k: "to" | "subject" | "body" | "from") => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setS("idle"); };

  if (!open) return <button onClick={() => { setOpen(true); setS("idle"); }} className="text-xs text-zinc-500 hover:text-white">+ compose email</button>;
  if (!senders.length) return <p className="text-xs text-amber-500">No senders yet: add rows (address, name, entity) to the Baserow table Senders in the FounderOS database. <button onClick={() => setOpen(false)} className="text-zinc-500">close</button></p>;
  return (
    <form onSubmit={submit} className="space-y-1.5 border-t border-zinc-800 pt-2">
      <select value={f.from} onChange={edit("from")} className={`${field} w-full`} title="From">
        {senders.map((x) => <option key={x.address} value={x.address}>{x.project ? `${x.project.split(/[,(]/)[0].trim()} · ` : x.entity ? `${x.entity}: ` : ""}{x.address}</option>)}
      </select>
      <input required type="email" placeholder="to (one recipient)" value={f.to} onChange={edit("to")} className={`${field} w-full`} />
      <input required placeholder="subject" value={f.subject} onChange={edit("subject")} className={`${field} w-full`} />
      <textarea required placeholder="plain-text body" rows={5} value={f.body} onChange={edit("body")} className={`${field} w-full`} />
      <div className="flex items-center gap-2">
        <button disabled={s === "busy"} className={`rounded border px-2 text-xs ${s === "confirm" ? "border-amber-500 text-amber-400" : "border-zinc-600 hover:text-white"}`}>
          {s === "confirm" ? `confirm send to ${f.to}?` : s === "busy" ? "sending…" : "send"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500">close</button>
        {s === "sent" && <span className="text-xs text-green-500">sent</span>}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </form>
  );
}
