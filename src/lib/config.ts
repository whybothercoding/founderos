import { homedir } from "node:os";
import { join } from "node:path";

export const DOCS = join(homedir(), "Documents");

/** GitHub owners whose non-archived repos are all covered by CI checks. */
export const OWNERS = [
  { login: "IndieGoWeb", entity: "IndieGoWeb Ltd" },
  { login: "whybothercoding", entity: "Personal" },
];

/** Local clones that are not Theo's own work (third-party). */
export const IGNORE_LOCAL = new Set(["misc/OpenMontage"]);

/** Entity of a local repo, from its folder (see reference/portfolio-map.md). */
export function entityFor(path: string) {
  if (path.startsWith("indiegoweb/")) return "IndieGoWeb Ltd";
  if (path.startsWith("sole-proprietorship/")) return "Greek sole proprietorship";
  if (/^xCode\/(rectovoice|wherebee|checksun)/.test(path)) return "IndieGoWeb Ltd";
  return "Personal";
}

export const ENTITIES = ["IndieGoWeb Ltd", "Greek sole proprietorship", "Personal"];

export const BASEROW = { url: "https://baserow.indiegoweb.com", tasksTable: 806 };
