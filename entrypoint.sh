#!/bin/sh
# lab-drop container entrypoint.
#
# Runs the app as a non-root user chosen at runtime via PUID/PGID (unraid
# convention; defaults to nobody:users = 99:100). The container starts as root
# only long enough to reconcile ownership of the app's own writable dirs and
# then drops privileges with gosu — the node process itself never runs as root.
#
# Cross-platform: PUID/PGID are plain env vars, so this behaves identically under
# `docker run -e`, docker-compose, or the unraid template. On Docker Desktop
# (macOS/Windows) bind-mount ownership is virtualized and chown is effectively a
# no-op — harmless; pure-Linux hosts get correctly-owned appdata.
set -e

PUID="${PUID:-99}"
PGID="${PGID:-100}"

# Reconcile ownership of ONLY the app's own writable dirs. We deliberately never
# chown arbitrary user-supplied mounts — a recursive chown over, say, a large
# media share would be slow and destructive.
for dir in /config /app/public/uploads; do
    mkdir -p "$dir"
    # Best-effort: don't abort the container if the FS rejects chown
    # (e.g. virtualized Docker Desktop mounts).
    chown -R "$PUID:$PGID" "$dir" 2>/dev/null || true
done

# Drop to the target uid:gid and hand off to the CMD (node index.js).
exec gosu "$PUID:$PGID" "$@"
