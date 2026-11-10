import { run } from "./exec";

export type HerdrAgent = {
  agent: string;
  status: "idle" | "working" | "blocked" | "done" | "unknown";
  cwd: string;
  pane: string;
  title: string;
};

type Raw = {
  agent: string;
  agent_status: HerdrAgent["status"];
  cwd: string;
  pane_id: string;
  terminal_title_stripped?: string;
};

export async function herdrAgents(): Promise<HerdrAgent[]> {
  const out = await run("herdr", ["agent", "list"]);
  const agents: Raw[] = JSON.parse(out).result.agents;
  return agents.map((a) => ({
    agent: a.agent,
    status: a.agent_status,
    cwd: a.cwd,
    pane: a.pane_id,
    title: a.terminal_title_stripped ?? "",
  }));
}
