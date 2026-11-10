# FounderOS

A local dashboard and agent dispatcher for a solo operator who runs many projects at once. One page answers **"what needs me right now?"** across coding agents, CI, automations and mail, and a few guarded buttons act on it.

It sits on top of [Herdr](https://herdr.dev) (the terminal workspace manager for AI coding agents) and works with **Claude Code, Codex, Grok and Antigravity**. It runs on your machine only and reads every source live. There is nothing to sync and no automation workflows to maintain.

<p><img src="docs/screenshot.png" alt="FounderOS Overview page in dark mode, with the built-in demo data" width="49%"> <img src="docs/screenshot-light.png" alt="The Code and CI page in light mode" width="49%"></p>

The UI follows the system light/dark setting (demo data shown: the Overview in dark mode, the Code & CI page in light mode).

## Pages

A tab bar switches between seven pages. Each tab shows a red badge with the number of items that need you (SEO: high-urgency open priorities plus sites with crawl errors), and the badges refresh every 30 seconds.

| Page | Contents | Source |
|---|---|---|
| **Overview** | Everything that needs you right now, grouped and linked to the page that handles it, plus a few numbers at a glance and any unavailable sources | all of the below |
| **Agents** | Every agent pane with its state (idle, working, blocked, done); the latest agent runs with outcome and result | Herdr; Baserow |
| **Tasks** | Open tasks with dispatch, close, reopen, reset and email actions; add a task | Baserow |
| **Code & CI** | Failed CI (newest run of each workflow and branch, last 7 days, across every repo in scope) with re-run and fix-task buttons; open loops: repos with uncommitted or unpushed work, plus tasks stuck in `running` | `gh` CLI; `git` |
| **Automations** | Failed n8n executions of the last 3 days grouped by workflow; AI spend (today, 7 days, month) | n8n REST API; OpenRouter key usage |
| **SEO** | The weekly SEO research: priorities from the latest report, Search Console (clicks, impressions, position, unindexed pages), top opportunities, Analytics, technical crawl, keyword rankings, top SERP competitors | Baserow SEO research database (filled weekly by n8n; nothing is fetched from Google here) |
| **Mail** | Unread, unanswered mail of the last 7 days from non-automated senders (metadata only, nothing stored); compose form | IMAP; SMTP |

The header counts everything that needs attention. `GET /api/needs-me` returns the same count as JSON (for a menu-bar badge, for example). A source that fails shows "unavailable" and never breaks a page.

## What it does

- **Alerts:** a background poller (every 3 minutes) posts only *new* items to a Discord webhook: a newly blocked agent, a failed CI run, a failed n8n execution, mail needing a reply, a task that is due or stuck. The first run only records the current state.
- **Dispatch:** a `todo` task with a repo runs headless in `claude -p`, `codex exec`, `grok -p` or `agy -p`. Agents get an edit-only permission mode (no unattended shell or network), the prompt forbids commit and push, and a run is killed after 30 minutes. The result lands in the task's Runs row, and the task moves to `review` or back to `todo`.
- **CI:** re-run failed jobs, or turn a failed run into a task carrying the failed-job log tail.
- **Mail:** compose a plain-text email to one recipient from a sender chosen in Baserow. Every attempt is logged and purged after 90 days. A task's ✉ button opens the Mail page with the contact address and task title prefilled.
- **Tasks:** add, close, reopen, reset stuck.

Every mutating endpoint accepts same-origin requests only and checks repo, agent, sender and ids against allow-lists. Every send, re-run and dispatch needs a confirm click.

## Requirements

- macOS or Linux with Node 24, `git`, and the [`gh`](https://cli.github.com) CLI logged in
- [Herdr](https://herdr.dev) running (for the Agents panel and dispatch targets)
- The agent CLIs you want to dispatch to, each already logged in
- A Baserow database with the tables below, an n8n instance with API access, and a mailbox with SMTP and IMAP

## Setup

```bash
npm install
npm run build
npx next start -H 127.0.0.1 -p 4317     # then open http://127.0.0.1:4317
```

`scripts/founderos.sh on | off | status` is the on/off switch meant for an Apple Shortcut ("Choose from Menu" with ON, OFF and Status, each running that script in a "Run Shell Script" action). ON starts `scripts/start.sh` as a detached background process and reports the URL once it answers (about 10 s; it does not open a browser), OFF stops it, and a second ON does nothing. `start.sh` runs inside an interactive zsh so credentials from your shell are available, adds `USER`, Homebrew and nvm's Node to a bare Shortcut PATH, builds and serves on localhost only. Running `start.sh` directly opens the browser unless `FOUNDEROS_NO_OPEN=1`. Logs go to `~/Library/Logs/founderos.log`.

Shortcut setup: enable *Settings → Advanced → Allow Running Scripts* in Shortcuts, and allow Shortcuts to access the Documents folder when macOS asks (the app scans your repos). A launchd job does not work here, because macOS blocks background jobs from reading `~/Documents`.

To try the UI without any credentials, start it with `FOUNDEROS_DEMO=1`: it shows fictional data (as in the screenshot above), contacts no service, sends no alerts and writes nothing.

The app is deliberately bound to `127.0.0.1`. It reads local sessions and repos, so it should never be exposed or deployed to a hosting provider.

## Configuration

Credentials are read from the **shell environment by name**. Nothing is stored in the project and `.env*` files are never read.

| Variable | Used for |
|---|---|
| `N8N_API_URL`, `N8N_API_KEY` | failed n8n executions |
| `FOUNDEROS_BASEROW_TOKEN` | Baserow database token, scoped to the FounderOS database only |
| `FOUNDEROS_DISCORD_WEBHOOK` | alerts (unset: alerts are off, the header says so) |
| `FOUNDEROS_SMTP_HOST`, `_PORT`, `_USER`, `_PASS` | sending (port 465 is implicit TLS, anything else requires STARTTLS) |
| `FOUNDEROS_IMAP_HOST`, `_PORT`, `_USER`, `_PASS` | inbox panel (port 993 is TLS) |
| `OPENROUTER_N8N_API_KEY` | AI-spend panel |

GitHub uses your `gh` login. Dispatched agents never inherit the `FOUNDEROS_*` variables.

Repos in scope come from the filesystem (every git repo under `~/Documents`, depth ≤ 3) plus every non-archived repo of the owners listed in `src/lib/config.ts`, together with the entity mapping and the ignore list.

### Baserow schema

One database with four tables (field names matter):

| Table | Fields |
|---|---|
| `Tasks` | `title` (primary), `entity`, `repo`, `status` (todo/running/review/done), `due`, `notes`, `contact`, plus the reverse link `Runs` |
| `Runs` | `summary` (primary), `task` (link to Tasks), `agent`, `started`, `ended`, `outcome` (success/failed/blocked/cancelled), `result` |
| `Sends` | `subject` (primary), `to`, `entity`, `status` (sent/failed), `sent_at` |
| `Senders` | `address` (primary), `name`, `entity`, `project`: the allowed "From" identities, edited in Baserow |

The **SEO** page only reads a second database (research tables written by your own workflows: priorities, Search Console and Analytics weekly summaries, opportunities, crawl summary, SERP snapshots, competitors), so `FOUNDEROS_BASEROW_TOKEN` needs read access to it as well. Table IDs are in `src/lib/seo.ts`.

`entity` is a single select (IndieGoWeb Ltd, Greek sole proprietorship, Personal). Table IDs are set in `src/lib/baserow.ts` and `src/lib/config.ts`.

## Layout

```
src/lib/        one adapter per source (herdr, github, git, n8n, mail, baserow, openrouter, seo)
                dashboard.ts aggregates them, alerts.ts is the Discord poller, dispatch.ts runs agents
src/app/        layout (header, tab bar with badges), one folder per page (agents, tasks, code, automation, seo, mail),
                the Overview at page.tsx, shared ui.tsx, and small client components for the buttons
src/app/api/    guarded endpoints: dispatch, tasks, tasks/status, ci/rerun, ci/fix-task, mail/send, needs-me
src/lib/demo.ts          fictional data for FOUNDEROS_DEMO=1 (screenshots, trying the UI)
src/instrumentation.ts   starts the alert poller with the server
scripts/start.sh         launcher for an Apple Shortcut
```

Next.js 16 (App Router), React 19, Tailwind 4, `nodemailer`, `imapflow`. `cacheComponents` is off on purpose: every read is live.

## Status and limitations

- Built and used on one machine; there is no test suite. It was checked by running it against live data.
- Dispatched agents are edit-only, so they cannot run tests or builds. Loosening that is a per-agent permission decision.
- If the app stops during a run, the task stays `running` and shows up as stuck.
- Alerts only fire while the app is running.
- Not built: Search Console and Analytics panels, stale-agent-session detection (Herdr exposes no idle time).
- Codex dispatch works mechanically but depends on your Codex account's usage limits.

## License

[MIT](LICENSE). This is personal tooling built around one setup: before reusing it, change the Baserow host and table IDs, the GitHub owners and entity names in `src/lib/config.ts` and `src/lib/baserow.ts`, and create the Baserow tables described above.
