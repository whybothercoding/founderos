# FounderOS

Theo's local dashboard + agent dispatch, on top of Herdr. Entity-neutral personal tooling (lives in `misc/`; the `misc/CLAUDE.md` tier applies). Plan: `~/.claude/plans/there-are-some-projects-moonlit-hearth.md`.

- **Runs locally only** (`next start -H 127.0.0.1 -p 4317`), never on Vercel: it reads local sessions and repos.
- **No n8n workflows.** Every panel reads its source live; n8n is a data source only (`src/lib/n8n.ts`).
- **Credentials come from the shell by reference** (`N8N_API_URL`, `N8N_API_KEY`, `FOUNDEROS_BASEROW_TOKEN`, `FOUNDEROS_DISCORD_WEBHOOK`, `FOUNDEROS_SMTP_{HOST,PORT,USER,PASS}`, `FOUNDEROS_IMAP_{HOST,PORT,USER,PASS}`, `OPENROUTER_N8N_API_KEY` (AI-spend tile), GitHub via the `gh` login). Never read `.env*`, never store values in the project.
- **Deviation (declared):** Baserow rows are read over REST with a database token, not via MCP: a server process cannot call MCP tools. Schema changes still use the JWT broker (`reference/infra-ids.md`, DB `211`: `Tasks` 806, `Runs` 807, `Sends` 808, `Senders` 809).
- `cacheComponents` is off on purpose (live data); pages use `force-dynamic`.
- **Dispatch (`src/lib/dispatch.ts`):** a `todo` task with a known local `repo` runs headless via `claude -p`, `codex exec`, `grok -p` or `agy -p`, each in an edit-only mode (`acceptEdits` / `workspace-write` / `accept-edits`): no unattended shell or network, prompt forbids commit/push. Run → `Runs` row (outcome, `result`), task → `review` on success, back to `todo` on failure. Children never inherit `FOUNDEROS_*`. 30-minute timeout. If the server stops mid-run, the task stays `running` (shown under open loops).
- **Task flow:** `todo` → dispatch → `running` → `review` → `done` (buttons: done / reopen / reset stuck; `/api/tasks/status` allows only `todo` and `done`). A `running` task this process isn't running is "stuck" (open loops, alert). A failed CI run can become a task via "→ fix task" (failed-job log tail in the notes); the Runs panel shows history and results.
- **Launch:** `scripts/start.sh` via an Apple Shortcut. It runs in an interactive zsh (credentials live in the shell) and adds `USER`, Homebrew and nvm node to a bare PATH; agent CLIs read their login from the Keychain under `$USER`.
- Mutating endpoints (`/api/dispatch`, `/api/tasks`, `/api/tasks/status`, `/api/ci/rerun`, `/api/ci/fix-task`, `/api/mail/send`) accept same-origin requests only and validate repo, agent and ids against allow-lists.
- **Mail (`src/lib/mail.ts`):** "From" identities are rows in the Baserow `Senders` table (address, name, entity), not env vars; a send must use one of them. Recipients are typed or come from a task's `contact` (✉ button prefills Compose). Send = one recipient, plain text, confirm click, 20/hour cap, every attempt logged to `Sends` (purged after 90 days). Inbox = read-only IMAP metadata of unread, unanswered INBOX mail from the last 7 days minus automated senders; nothing is stored. Compose is manual only; no agent or workflow sends mail through it.
- Each panel is wrapped in `panel()` (`src/lib/exec.ts`) so one failing source shows "unavailable" instead of breaking the page.
- **Global tool (Theo, 2026-11-10):** reads every entity's repos, workflows and CI on purpose. Panels still label each item with its entity; keep entity data out of any outbound message beyond a one-line alert.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
