/** Mutating endpoints accept same-origin requests only (the dashboard is bound to localhost). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false; // e.g. "Origin: null"
  }
}

/** Parses a JSON object body; anything malformed becomes `{}` so the route's own validation answers 400. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? b : {};
  } catch {
    return {};
  }
}
