"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800 text-sm">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 ${active ? "border-zinc-900 dark:border-zinc-100 text-black dark:text-white" : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"}`}
          >
            {i.label}
            {i.count > 0 && <span className="rounded-full bg-red-600 px-1.5 text-xs leading-5 text-white">{i.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
