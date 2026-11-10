import { loadSeo } from "@/lib/seo";
import { Body, Card, Page } from "../ui";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-US");
/** "+12" / "-5" in green (good) or red; for metrics where up is good. */
function Delta({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev === null || cur === prev) return null;
  const d = cur - prev;
  return <span className={d > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-400"}> {d > 0 ? "+" : ""}{nf.format(d)}</span>;
}
const urgency: Record<string, string> = { high: "text-red-600 dark:text-red-400", medium: "text-amber-600 dark:text-amber-400", low: "text-zinc-500" };

export default async function Seo() {
  const s = await loadSeo();
  return (
    <Page>
      <div className="md:col-span-2">
        <Card title="Priorities (latest weekly report)" count={s.priorities.ok ? s.priorities.data.filter((p) => p.urgency === "high" && p.status === "new").length : undefined}>
          <Body p={s.priorities} empty="no open priorities in the latest report">
            {(rows) => rows.map((p) => (
              <div key={p.id}>
                <span className={`mr-2 text-xs uppercase ${urgency[p.urgency] ?? ""}`}>{p.urgency}</span>
                <span className="text-zinc-500">{p.site} · {p.type.replace("_", " ")}{p.keyword ? ` · “${p.keyword}”` : ""}{p.searches ? ` · ${nf.format(p.searches)}/mo` : ""}{p.status === "writing" ? " · writing" : ""}</span>
                <div className="text-zinc-700 dark:text-zinc-300">{p.action}</div>
              </div>
            ))}
          </Body>
        </Card>
      </div>
      <Card title="Search Console (last full week)">
        <Body p={s.gsc} empty="no data">
          {(rows) => rows.map((g) => (
            <div key={g.site}>
              <span className="font-medium">{g.site}</span>{" "}
              <span className="text-zinc-500">week to {g.period}</span>
              <div className="text-zinc-700 dark:text-zinc-300">
                {nf.format(g.clicks)} clicks<Delta cur={g.clicks} prev={g.prevClicks} /> · {nf.format(g.impressions)} impressions<Delta cur={g.impressions} prev={g.prevImpressions} />
                {g.position !== null && ` · avg position ${g.position.toFixed(1)}`}
              </div>
              {g.zeroPages !== null && g.sitemapUrls ? (
                <div className={g.zeroPages / g.sitemapUrls > 0.5 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"}>
                  {g.zeroPages} of {g.sitemapUrls} sitemap pages have zero impressions{g.topQuery ? ` · top query “${g.topQuery}”` : ""}
                </div>
              ) : null}
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Opportunities (top 10 by potential clicks)">
        <Body p={s.opps} empty="no open opportunities">
          {(rows) => rows.map((o, i) => (
            <div key={i}>
              <a href={o.page} target="_blank" className="hover:text-black dark:hover:text-white">“{o.query}”</a>{" "}
              <span className="text-zinc-500">{o.site} · {o.type.replace("_", " ")} · pos {o.position.toFixed(1)} · {nf.format(o.impressions)} impr · +{o.potential} potential</span>
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Analytics (last full week)">
        <Body p={s.ga} empty="no data">
          {(rows) => rows.map((g) => (
            <div key={g.property}>
              <span className="font-medium">{g.property}</span>{" "}
              <span className="text-zinc-700 dark:text-zinc-300">{nf.format(g.sessions)} sessions<Delta cur={g.sessions} prev={g.prevSessions} />{g.deltaPct !== null ? ` (${g.deltaPct > 0 ? "+" : ""}${g.deltaPct.toFixed(1)}%)` : ""}</span>
              <div className="text-zinc-500">{g.keyEvents} key events · top channel {g.channel || "n/a"}{g.topPage ? ` · top page ${g.topPage}` : ""}</div>
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Technical crawl" count={s.crawl.ok ? s.crawl.data.filter((c) => c.errors > 0).length : undefined}>
        <Body p={s.crawl} empty="no crawl data">
          {(rows) => rows.map((c) => (
            <div key={c.site}>
              <span className="font-medium">{c.site}</span>{" "}
              <span className={c.errors ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-500"}>{c.errors} errors{c.prevErrors !== null && c.prevErrors !== c.errors ? ` (was ${c.prevErrors})` : ""}</span>
              <span className="text-zinc-500"> · {c.warnings} warnings · {c.pages} pages · {c.run}</span>
              {c.topErrors && <div className="truncate text-zinc-600 dark:text-zinc-400">{c.topErrors}</div>}
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Rankings (latest keyword run)">
        <Body p={s.ranks} empty="no ranking data">
          {(rows) => rows.map((r) => (
            <div key={r.site}>
              <span className="font-medium">{r.site}</span>{" "}
              <span className="text-zinc-700 dark:text-zinc-300">{r.ranked} of {r.tracked} tracked keywords rank · {r.top10} in the top 10 · run {r.run}</span>
              {r.best && <div className="text-zinc-500">best: “{r.best.keyword}” at #{r.best.position}</div>}
            </div>
          ))}
        </Body>
      </Card>
      <Card title="Top competitors in the SERPs">
        <Body p={s.rivals} empty="no competitors recorded">
          {(rows) => rows.map((r, i) => (
            <div key={i}>{r.domain} <span className="text-zinc-500">{r.site} · {r.appearances} appearances · last {r.lastSeen}</span></div>
          ))}
        </Body>
      </Card>
    </Page>
  );
}
