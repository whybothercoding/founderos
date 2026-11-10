import { loadDashboard } from "@/lib/dashboard";
import { loadSeo } from "@/lib/seo";

// Polled by the (optional) menu-bar badge. Localhost only.
export async function GET() {
  const [d, seo] = await Promise.all([loadDashboard(), loadSeo()]);
  return Response.json({ needsMe: d.needsMe + seo.badge, blocked: d.blocked.length, ciFailures: d.ci.ok ? d.ci.data.length : null });
}
