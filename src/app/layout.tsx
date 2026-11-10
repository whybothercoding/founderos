import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { alertsEnabled } from "@/lib/alerts";
import { isDemo } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard";
import { NavLinks } from "./nav";
import { AutoRefresh } from "./task-controls";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FounderOS",
  description: "Local dashboard for agents, CI and automations",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const d = await loadDashboard();
  const n = <T,>(p: { ok: boolean; data?: T[] }) => (p.ok && p.data ? p.data.length : 0);
  const items = [
    { href: "/", label: "Overview", count: d.needsMe },
    { href: "/agents", label: "Agents", count: d.blocked.length },
    { href: "/tasks", label: "Tasks", count: d.dueTasks.length + d.stuck.length },
    { href: "/code", label: "Code & CI", count: n(d.ci) },
    { href: "/automation", label: "Automations", count: n(d.n8n) },
    { href: "/mail", label: "Mail", count: n(d.mail) },
  ];
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main className="mx-auto w-full max-w-6xl space-y-4 p-6">
          <AutoRefresh />
          <header className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold">FounderOS</h1>
            <p className={d.needsMe ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-500"}>
              {d.needsMe ? `${d.needsMe} need you` : "nothing needs you"}
              <span className="ml-3 text-xs text-zinc-500">{isDemo() ? "demo data" : `alerts ${alertsEnabled() ? "on" : "off (FOUNDEROS_DISCORD_WEBHOOK not set)"}`}</span>
            </p>
          </header>
          <NavLinks items={items} />
          {children}
        </main>
      </body>
    </html>
  );
}
