import { loadDashboard } from "@/lib/dashboard";

// Polled by the (optional) menu-bar badge. Localhost only.
export async function GET() {
  const d = await loadDashboard();
  return Response.json({ needsMe: d.needsMe, blocked: d.blocked.length, ciFailures: d.ci.ok ? d.ci.data.length : null });
}
