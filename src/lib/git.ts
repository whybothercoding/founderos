import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { cached, mapLimit, run } from "./exec";
import { DOCS, IGNORE_LOCAL, entityFor } from "./config";

export type LocalRepo = { path: string; entity: string; slug: string | null };
export type RepoLoop = { path: string; entity: string; branch: string; dirty: number; ahead: number };

const SKIP = new Set(["node_modules", "Pods", "DerivedData", "dist", "build", "venv", "reference"]);

async function walk(dir: string, depth: number, out: string[]) {
  if (depth > 3) return;
  let ents;
  try {
    ents = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  if (ents.some((e) => e.name === ".git")) out.push(dir); // keep descending: repos can nest (rectovoice-api)
  for (const e of ents) {
    if (e.isDirectory() && !e.name.startsWith(".") && !SKIP.has(e.name)) await walk(join(dir, e.name), depth + 1, out);
  }
}

async function slugOf(cwd: string) {
  try {
    const out = await run("git", ["config", "--get-regexp", "^remote\\..*\\.url$"], { cwd });
    for (const line of out.split("\n")) {
      const m = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/.exec(line.trim());
      if (m) return m[1];
    }
  } catch {}
  return null;
}

/** Every git repo under ~/Documents (depth ≤ 3), with its entity and GitHub slug. */
export function localRepos(): Promise<LocalRepo[]> {
  return cached("local-repos", 10 * 60_000, async () => {
    const dirs: string[] = [];
    await walk(DOCS, 0, dirs);
    const repos = await mapLimit(dirs, 8, async (d) => {
      const path = relative(DOCS, d) || ".";
      return { path, entity: entityFor(path), slug: await slugOf(d) };
    });
    return repos.filter((r) => r.path !== "." && !IGNORE_LOCAL.has(r.path));
  });
}

/** Repos with uncommitted changes or unpushed commits. */
export async function openLoops(): Promise<RepoLoop[]> {
  const repos = await localRepos();
  const rows = await mapLimit(repos, 8, async (r): Promise<RepoLoop | null> => {
    try {
      const status = await run("git", ["status", "--porcelain=v1", "-b"], { cwd: join(DOCS, r.path) });
      const [head, ...files] = status.trim().split("\n");
      const ahead = Number(/ahead (\d+)/.exec(head)?.[1] ?? 0);
      const branch = head.replace(/^## /, "").split("...")[0];
      return { path: r.path, entity: r.entity, branch, dirty: files.filter(Boolean).length, ahead };
    } catch {
      return null;
    }
  });
  return rows.filter((x): x is RepoLoop => x !== null && (x.dirty > 0 || x.ahead > 0));
}
