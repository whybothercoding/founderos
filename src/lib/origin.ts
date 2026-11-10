/** Mutating endpoints accept same-origin requests only (the dashboard is bound to localhost). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !!origin && new URL(origin).host === req.headers.get("host");
}
