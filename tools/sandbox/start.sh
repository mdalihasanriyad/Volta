#!/bin/sh
# Starts the offline sandbox server detached (re-uses it when already running).
cd "$(dirname "$0")/../.."
if curl -sf localhost:${SANDBOX_PORT:-4173}/api/health >/dev/null 2>&1; then echo "already running"; exit 0; fi
SANDBOX_PORT=${SANDBOX_PORT:-4173} setsid nohup node --import ./tests/helpers/register.mjs tools/sandbox/server.mjs > /tmp/sandbox.log 2>&1 < /dev/null &
for i in 1 2 3 4 5 6 7 8 9 10; do sleep 1; curl -sf localhost:${SANDBOX_PORT:-4173}/api/health >/dev/null 2>&1 && echo "sandbox up" && exit 0; done
echo "sandbox failed to start"; tail -20 /tmp/sandbox.log; exit 1
