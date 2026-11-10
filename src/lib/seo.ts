// SEO research, read from the Baserow SEO database (filled weekly by the n8n SEO workflows; nothing is fetched from Google here).
// Tables: seo_priorities 785 · gsc_weekly_summary 783 · gsc_opportunities 782 · ga_weekly_summary 784 · crawl_summary 790
// · serp_snapshots 763 · competitor_registry 764. The shell token needs READ access to that database.
import { readRows } from "./baserow";
import { demoSeo, isDemo } from "./demo";
import { cached, panel, type Panel } from "./exec";

type Row = Record<string, unknown>;
const T = { priorities: 785, gsc: 783, opps: 782, ga: 784, crawl: 790, serp: 763, rivals: 764 };

const str = (x: unknown) => (x == null ? "" : typeof x === "object" && "value" in (x as object) ? String((x as { value: unknown }).value ?? "") : String(x));
const num = (x: unknown) => (x == null || x === "" ? null : Number(x));
const site = (s: unknown) => str(s).replace(/^sc-domain:/, "");

export type Priority = { id: number; site: string; action: string; keyword: string; type: string; urgency: string; status: string; searches: number | null };
export type GscSite = { site: string; period: string; clicks: number; prevClicks: number | null; impressions: number; prevImpressions: number | null; position: number | null; topQuery: string; zeroPages: number | null; sitemapUrls: number | null };
export type Opportunity = { query: string; site: string; page: string; impressions: number; position: number; potential: number; type: string };
export type GaProperty = { property: string; period: string; sessions: number; prevSessions: number | null; deltaPct: number | null; keyEvents: number; channel: string; topPage: string };
export type Crawl = { site: string; run: string; pages: number; errors: number; prevErrors: number | null; warnings: number; topErrors: string };
export type Rank = { site: string; run: string; tracked: number; ranked: number; top10: number; best: { keyword: string; position: number } | null };
export type Rival = { domain: string; site: string; appearances: number; lastSeen: string };

export type Seo = {
  priorities: Panel<Priority[]>;
  gsc: Panel<GscSite[]>;
  opps: Panel<Opportunity[]>;
  ga: Panel<GaProperty[]>;
  crawl: Panel<Crawl[]>;
  ranks: Panel<Rank[]>;
  rivals: Panel<Rival[]>;
  /** high-urgency open priorities + sites with crawl errors */
  badge: number;
};

/** First (newest) row per key from rows already ordered newest-first. */
const newestPer = <T,>(rows: T[], key: (r: T) => string) => {
  const seen = new Map<string, T>();
  for (const r of rows) if (!seen.has(key(r))) seen.set(key(r), r);
  return [...seen.values()];
};


/** Up to `maxPages` pages (200 rows, Baserow's maximum) of a table ordered newest first. */
async function recentRows(table: number, dateField: string, maxPages = 6): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const rows = await readRows(table, `order_by=-${dateField}&size=200&page=${page}`);
    out.push(...rows);
    if (rows.length < 200) break;
  }
  return out;
}

async function load(): Promise<Seo> {
  const [priorities, gsc, opps, ga, crawl, ranks, rivals] = await Promise.all([
    panel(async () => {
      const rows = await readRows(T.priorities, "order_by=-run_date&size=100");
      const last = rows.map((r) => str(r.run_date)).sort().at(-1);
      return rows
        .filter((r) => str(r.run_date) === last && ["new", "writing"].includes(str(r.status)))
        .map((r): Priority => ({ id: r.id as number, site: site(r.site), action: str(r.action), keyword: str(r.keyword), type: str(r.action_type), urgency: str(r.urgency), status: str(r.status), searches: num(r.avg_monthly_searches) }))
        .sort((a, b) => ["high", "medium", "low"].indexOf(a.urgency) - ["high", "medium", "low"].indexOf(b.urgency));
    }),
    panel(async () =>
      newestPer(await readRows(T.gsc, "order_by=-period_end&size=100"), (r) => site(r.site)).map((r): GscSite => ({
        site: site(r.site), period: str(r.period_end), clicks: num(r.clicks) ?? 0, prevClicks: num(r.prev_clicks), impressions: num(r.impressions) ?? 0, prevImpressions: num(r.prev_impressions),
        position: num(r.avg_position), topQuery: str(r.top_query), zeroPages: num(r.zero_impression_pages), sitemapUrls: num(r.sitemap_urls),
      })).sort((a, b) => b.impressions - a.impressions),
    ),
    panel(async () => {
      const rows = await readRows(T.opps, "order_by=-period_end&size=100");
      const last = rows.map((r) => str(r.period_end)).sort().at(-1);
      return rows
        .filter((r) => str(r.period_end) === last && str(r.status) === "new")
        .map((r): Opportunity => ({ query: str(r.query), site: site(r.site), page: str(r.page), impressions: num(r.impressions) ?? 0, position: num(r.position) ?? 0, potential: num(r.potential_clicks) ?? 0, type: str(r.opportunity_type) }))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 10);
    }),
    panel(async () =>
      newestPer(await readRows(T.ga, "order_by=-period_end&size=100"), (r) => str(r.property)).map((r): GaProperty => ({
        property: str(r.property), period: str(r.period_end), sessions: num(r.sessions) ?? 0, prevSessions: num(r.prev_sessions), deltaPct: num(r.sessions_delta_pct),
        keyEvents: num(r.key_events) ?? 0, channel: str(r.top_channel), topPage: str(r.top_page),
      })).sort((a, b) => b.sessions - a.sessions),
    ),
    panel(async () =>
      newestPer(await readRows(T.crawl, "order_by=-run_date&size=60"), (r) => str(r.site)).map((r): Crawl => ({
        site: str(r.site), run: str(r.run_date), pages: num(r.pages_crawled) ?? 0, errors: num(r.errors) ?? 0, prevErrors: num(r.prev_errors), warnings: num(r.warnings) ?? 0, topErrors: str(r.top_errors),
      })).sort((a, b) => b.errors - a.errors),
    ),
    panel(async () => {
      const rows = await recentRows(T.serp, "run_date");
      // each site's own newest run (runs of different sites can land on different days)
      const newest = new Map<string, string>();
      for (const r of rows) if (str(r.run_date) > (newest.get(str(r.site)) ?? "")) newest.set(str(r.site), str(r.run_date));
      const by = new Map<string, Rank>();
      for (const r of rows.filter((x) => str(x.run_date) === newest.get(str(x.site)))) {
        const s = str(r.site);
        const g = by.get(s) ?? { site: s, run: newest.get(s) ?? "", tracked: 0, ranked: 0, top10: 0, best: null };
        const pos = num(r.position);
        g.tracked++;
        if (pos !== null) {
          g.ranked++;
          if (pos <= 10) g.top10++;
          if (!g.best || pos < g.best.position) g.best = { keyword: str(r.keyword), position: pos };
        }
        by.set(s, g);
      }
      return [...by.values()].sort((a, b) => b.ranked - a.ranked);
    }),
    panel(async () =>
      (await readRows(T.rivals, "order_by=-appearances&size=10")).map((r): Rival => ({ domain: str(r.competitor_domain), site: str(r.site), appearances: num(r.appearances) ?? 0, lastSeen: str(r.last_seen) })),
    ),
  ]);
  const high = priorities.ok ? priorities.data.filter((p) => p.urgency === "high" && p.status === "new").length : 0;
  const broken = crawl.ok ? crawl.data.filter((c) => c.errors > 0).length : 0;
  return { priorities, gsc, opps, ga, crawl, ranks, rivals, badge: high + broken };
}

// The data changes weekly; 5 minutes is plenty and keeps the nav badge cheap on every page.
export const loadSeo = (): Promise<Seo> => (isDemo() ? Promise.resolve(demoSeo()) : cached("seo", 5 * 60_000, load));
