import { execFile } from "node:child_process";

/** Run a binary (no shell), resolve stdout; reject on non-zero exit or timeout. */
export function run(cmd: string, args: string[], opts: { cwd?: string; timeout?: number } = {}) {
  return new Promise<string>((resolve, reject) => {
    execFile(cmd, args, { cwd: opts.cwd, timeout: opts.timeout ?? 15000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) =>
      err ? reject(err) : resolve(stdout),
    );
  });
}

/** Panels must degrade, never crash the page. */
export type Panel<T> = { ok: true; data: T } | { ok: false; error: string };

export async function panel<T>(fn: () => Promise<T>): Promise<Panel<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "unknown error" };
  }
}

const store = new Map<string, { t: number; p: Promise<unknown> }>();

/** Memoise an async call for `ttl` ms (shared by page loads and the alert poller). */
export function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.p as Promise<T>;
  const p = fn();
  store.set(key, { t: Date.now(), p });
  p.catch(() => store.delete(key));
  return p;
}

/** Map with bounded concurrency. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}
