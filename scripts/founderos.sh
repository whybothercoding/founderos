#!/bin/zsh
# FounderOS on/off switch for an Apple Shortcut:  founderos.sh on | off | status  (never opens a browser)
# ON starts scripts/start.sh as a detached background process (own session, so it outlives the Shortcut action);
# start.sh loads your shell environment (credentials) and serves on 127.0.0.1 only. OFF stops whatever listens on the port.
# The process inherits the Shortcut's file access, so Shortcuts needs access to the Documents folder (macOS asks once).
ROOT="${0:A:h:h}"
PORT=4317
URL="http://127.0.0.1:$PORT"
LOG="$HOME/Library/Logs/founderos.log"
PIDFILE="$ROOT/.state/founderos.pid"

is_up() { curl -s -o /dev/null --max-time 2 "$URL/api/needs-me"; }
listener() { lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null; }

case "$1" in
  on)
    if is_up; then echo "FounderOS is already ON ($URL)"; exit 0; fi
    if [ -n "$(listener)" ]; then echo "Port $PORT is used by another process; not starting."; exit 1; fi
    mkdir -p "$ROOT/.state" "$HOME/Library/Logs"
    : > "$LOG"
    # perl's setsid detaches into a new session (macOS has no setsid binary); nohup + redirects keep it quiet.
    FOUNDEROS_NO_OPEN=1 nohup /usr/bin/perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV' /bin/zsh "$ROOT/scripts/start.sh" >> "$LOG" 2>&1 < /dev/null &
    echo $! > "$PIDFILE"
    for i in $(seq 1 90); do
      is_up && { echo "FounderOS is ON ($URL)"; exit 0; }
      kill -0 "$(cat "$PIDFILE")" 2>/dev/null || { echo "FounderOS failed to start:"; tail -6 "$LOG"; exit 1; }
      sleep 1
    done
    echo "Started, but not answering after 90 s. See $LOG"; tail -5 "$LOG"; exit 1
    ;;
  off)
    PIDS=$(listener); [ -f "$PIDFILE" ] && PIDS="$PIDS $(cat "$PIDFILE")"
    for p in ${=PIDS}; do kill "$p" 2>/dev/null; done
    for i in $(seq 1 10); do [ -z "$(listener)" ] && break; sleep 1; done
    [ -n "$(listener)" ] && { echo "FounderOS did not stop (port $PORT still in use)"; exit 1; }
    rm -f "$PIDFILE"
    echo "FounderOS is OFF"
    ;;
  status)
    if is_up; then echo "FounderOS is ON ($URL) · $(curl -s --max-time 5 "$URL/api/needs-me" | sed -E 's/.*"needsMe":([0-9]+).*/\1 need you/')"; else echo "FounderOS is OFF"; fi
    ;;
  *)
    echo "usage: founderos.sh on | off | status"; exit 2
    ;;
esac
