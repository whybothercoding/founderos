#!/bin/zsh
# Launched by the Apple Shortcut ("Run Shell Script", this file's path).
# Runs inside an interactive zsh so the credentials that live in the shell are available.
# Builds, serves on localhost only, opens the browser. Set FOUNDEROS_NO_OPEN=1 to skip the browser.
ROOT="${0:A:h:h}"
# Agent CLIs read their login from the macOS Keychain under $USER; a bare Shortcut environment may lack it.
export USER="${USER:-$(id -un)}" LOGNAME="${LOGNAME:-$(id -un)}"
PORT=4317
if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  [ -z "$FOUNDEROS_NO_OPEN" ] && open "http://127.0.0.1:$PORT"
  exit 0
fi
/bin/zsh -ic '
cd "$0" || exit 1
# A Shortcut gets a bare PATH: add Homebrew (gh) and the newest nvm node.
NODE_BIN=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)
export PATH="/opt/homebrew/bin:$NODE_BIN:$PATH"
npm run build >/dev/null 2>&1 || { echo "build failed"; exit 1; }
[ -z "$FOUNDEROS_NO_OPEN" ] && (sleep 3; open "http://127.0.0.1:'"$PORT"'") &
exec npx next start -H 127.0.0.1 -p '"$PORT"'
' "$ROOT"
