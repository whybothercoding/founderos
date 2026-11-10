// AI spend of the key used by the n8n workflows (all entities route through OpenRouter).
// Key is read from the shell by reference (OPENROUTER_N8N_API_KEY). Endpoint: GET /api/v1/key (usage in USD).
export type Spend = { today: number; week: number; month: number; total: number; limit: number | null; remaining: number | null };

export async function aiSpend(): Promise<Spend> {
  const key = process.env.OPENROUTER_N8N_API_KEY;
  if (!key) throw new Error("OPENROUTER_N8N_API_KEY not set in the shell");
  const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const d = (await r.json()).data;
  return { today: d.usage_daily ?? 0, week: d.usage_weekly ?? 0, month: d.usage_monthly ?? 0, total: d.usage ?? 0, limit: d.limit ?? null, remaining: d.limit_remaining ?? null };
}
