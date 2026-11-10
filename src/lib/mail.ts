import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { listSenders, logSend } from "./baserow";
import { cached } from "./exec";

// Credentials come from the shell by reference: FOUNDEROS_SMTP_{HOST,PORT,USER,PASS}, FOUNDEROS_IMAP_{HOST,PORT,USER,PASS}.
// "From" identities are data, not secrets: they live in the Baserow Senders table. Recipients are typed or come from a task's contact.
function need(prefix: "SMTP" | "IMAP") {
  const g = (k: string) => process.env[`FOUNDEROS_${prefix}_${k}`];
  const missing = ["HOST", "PORT", "USER", "PASS"].filter((k) => !g(k));
  if (missing.length) throw new Error(`FOUNDEROS_${prefix}_${missing.join("/")} not set in the shell`);
  return { host: g("HOST")!, port: Number(g("PORT")), user: g("USER")!, pass: g("PASS")! };
}

// ---------- inbox: metadata only, nothing stored ----------
export type MailItem = { id: string; from: string; subject: string; date: string };
const AUTOMATED = /(no-?reply|do-?not-?reply|notifications?@|mailer-daemon|newsletter|bounce)/i;

/** Unread, unanswered INBOX mail from the last 7 days, excluding obvious automated senders. Read-only. */
export function needsReply(): Promise<MailItem[]> {
  return cached("needs-reply", 2 * 60_000, async () => {
    const c = need("IMAP");
    const client = new ImapFlow({ host: c.host, port: c.port, secure: c.port === 993, auth: { user: c.user, pass: c.pass }, logger: false });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const uids = (await client.search({ since: new Date(Date.now() - 7 * 864e5), seen: false, answered: false }, { uid: true })) || [];
      const items: MailItem[] = [];
      if (uids.length) {
        for await (const m of client.fetch(uids.slice(-40), { envelope: true, uid: true }, { uid: true })) {
          const f = m.envelope?.from?.[0];
          const addr = f?.address ?? "";
          if (AUTOMATED.test(addr)) continue;
          items.push({ id: String(m.uid), from: f?.name || addr || "unknown", subject: m.envelope?.subject ?? "(no subject)", date: new Date(m.envelope?.date ?? Date.now()).toISOString() });
        }
      }
      return items.sort((a, b) => b.date.localeCompare(a.date));
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }
  });
}

// ---------- send ----------
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const sentAt: number[] = [];
const MAX_PER_HOUR = 20; // runaway guard; this is a manual one-recipient tool, not a mailer

export async function sendMail(m: { to: string; subject: string; body: string; from: string }) {
  const to = m.to.trim();
  const subject = m.subject.trim();
  if (!EMAIL.test(to)) throw new Error("one valid recipient address required");
  if (!subject || /[\r\n]/.test(subject) || subject.length > 200) throw new Error("subject required (single line, ≤ 200 chars)");
  if (!m.body.trim() || m.body.length > 10_000) throw new Error("body required (≤ 10,000 chars)");
  const recent = sentAt.filter((t) => Date.now() - t < 3600_000);
  if (recent.length >= MAX_PER_HOUR) throw new Error("hourly send limit reached");

  const c = need("SMTP");
  const sender = (await listSenders()).find((x) => x.address.toLowerCase() === m.from.trim().toLowerCase());
  if (!sender) throw new Error("sender is not in the Senders table");
  const from = sender.name ? { name: sender.name, address: sender.address } : sender.address;
  const entity = sender.entity || "Personal";
  const tx = nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, requireTLS: c.port !== 465, auth: { user: c.user, pass: c.pass } });
  try {
    await tx.sendMail({ from, to, subject, text: m.body });
  } catch (e) {
    await logSend({ subject, to, entity, status: "failed" }).catch(() => {});
    throw new Error(`send failed: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`);
  }
  sentAt.push(Date.now());
  await logSend({ subject, to, entity, status: "sent" }).catch((e) => console.error("[mail] sent but not logged:", e instanceof Error ? e.message : e));
  return { from: sender.address };
}
