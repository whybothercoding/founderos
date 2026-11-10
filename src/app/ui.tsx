import type { ReactNode } from "react";
import type { Panel } from "@/lib/exec";

export const dot: Record<string, string> = {
  blocked: "bg-red-500", working: "bg-amber-400", idle: "bg-zinc-500", done: "bg-green-500", unknown: "bg-zinc-700",
};

export const rel = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export function Card({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4">
      <h2 className="mb-3 flex items-baseline justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
        {count !== undefined && <span className={count ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-600"}>{count}</span>}
      </h2>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

/** Renders a panel's rows, or its empty / unavailable state. */
export function Body<T>({ p, empty, children }: { p: Panel<T[]>; empty: string; children: (rows: T[]) => ReactNode }) {
  if (!p.ok) return <p className="text-amber-600 dark:text-amber-500">unavailable: {p.error}</p>;
  if (!p.data.length) return <p className="text-zinc-400 dark:text-zinc-600">{empty}</p>;
  return <>{children(p.data)}</>;
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
