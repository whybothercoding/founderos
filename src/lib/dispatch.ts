import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createRun, getTask, updateRun, updateTask } from "./baserow";
import { DOCS } from "./config";
import { localRepos } from "./git";

// Headless dispatch. Permissions are deliberately conservative: each CLI may edit files inside the task's repo,
// but not run arbitrary shell/network commands unattended, and the prompt forbids commit/push.
export const AGENTS = ["claude", "codex", "grok", "agy"] as const;
export type AgentName = (typeof AGENTS)[number];

const PREFIX = "Do not commit, push or touch anything outside this repository. Finish with a short summary of what you did and what is left.\n\nTask: ";

function command(agent: AgentName, prompt: string, cwd: string, lastMsgFile: string): [string, string[]] {
  switch (agent) {
    case "claude": return ["claude", ["-p", prompt, "--permission-mode", "acceptEdits"]];
    case "codex": return ["codex", ["exec", "--sandbox", "workspace-write", "-C", cwd, "-o", lastMsgFile, prompt]];
    case "grok": return ["grok", ["-p", prompt, "--cwd", cwd, "--permission-mode", "acceptEdits"]];
    case "agy": return ["agy", ["-p", prompt, "--mode", "accept-edits"]];
  }
}

const active = ((globalThis as { __fosActive?: Set<number> }).__fosActive ??= new Set<number>());
const TIMEOUT_MS = 30 * 60_000;

/** Tasks this server process is currently running (a `running` task not in here is stuck). */
export const activeTaskIds = () => new Set(active);

export async function dispatch(taskId: number, agent: string) {
  if (!(AGENTS as readonly string[]).includes(agent)) throw new Error("unknown agent");
  const a = agent as AgentName;
  if (active.has(taskId)) throw new Error("task already running");
  const task = await getTask(taskId);
  if (task.status !== "todo") throw new Error(`task is ${task.status}, not todo`);
  const repos = await localRepos();
  if (!repos.some((r) => r.path === task.repo)) throw new Error("task repo is not a known local repo");
  const cwd = join(DOCS, task.repo);

  active.add(taskId);
  let runId: number;
  try {
    runId = await createRun({ summary: `${a}: ${task.title}`.slice(0, 250), taskId, agent: a });
    await updateTask(taskId, { status: "running" });
  } catch (e) {
    active.delete(taskId);
    throw e;
  }

  const dir = join(process.cwd(), ".state", "runs");
  await mkdir(dir, { recursive: true });
  const logFile = join(dir, `${runId}.log`);
  const lastMsgFile = join(dir, `${runId}.last.txt`);
  const log = createWriteStream(logFile);
  const prompt = PREFIX + task.title + (task.notes ? `\n\n${task.notes}` : "");
  const [cmd, args] = command(a, prompt, cwd, lastMsgFile);
  // Agents must not inherit FounderOS's own credentials.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("FOUNDEROS_"))) as NodeJS.ProcessEnv;
  const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, TIMEOUT_MS);
  let tail = "";
  const onData = (b: Buffer) => { log.write(b); tail = (tail + b.toString()).slice(-4000); };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const finish = async (code: number | null, err?: string) => {
    clearTimeout(timer);
    log.end();
    active.delete(taskId);
    let result = tail;
    if (a === "codex") { try { result = await readFile(lastMsgFile, "utf8"); } catch {} }
    const ok = code === 0 && !timedOut;
    try {
      await updateRun(runId, {
        ended: new Date().toISOString(),
        outcome: ok ? "success" : timedOut ? "cancelled" : "failed",
        result: (err ?? result).trim().slice(-3000),
      });
      await updateTask(taskId, { status: ok ? "review" : "todo" });
    } catch (e) {
      console.error("[dispatch] could not record run", runId, e instanceof Error ? e.message : e);
    }
  };
  child.on("error", (e) => void finish(null, `could not start ${cmd}: ${e.message}`));
  child.on("close", (code) => void finish(code));
  return { runId };
}
