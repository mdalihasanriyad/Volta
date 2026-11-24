#!/bin/sh
# Usage: tools/sandbox/e2e.sh [playwright args]   (starts the sandbox if needed, then runs the specs against it)
cd "$(dirname "$0")/../.."
tools/sandbox/start.sh || exit 1
node /opt/npm-tools/node_modules/playwright/cli.js test -c tools/sandbox/playwright.config.js "$@"
