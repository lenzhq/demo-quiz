#!/usr/bin/env bash
# --------------------------------------------------------------------------
# Fact or Fiction — Build & Deploy to Firebase Hosting (play.lenz.io)
#
# Prerequisites:
#   - Firebase CLI installed: npm install -g firebase-tools
#   - Logged in: firebase login
#   - Firebase site "lenz-play" created in project "lenz-prod"
#
# Usage:
#   bash deploy/deploy.sh
# --------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_ROOT}"

# Production env vars
VITE_API_BASE="https://lenz.io/api/v1"
VITE_LENZ_URL="https://lenz.io"

echo "==> Building Fact or Fiction..."
echo "    VITE_API_BASE=${VITE_API_BASE}"
echo "    VITE_LENZ_URL=${VITE_LENZ_URL}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "==> Installing npm dependencies..."
    npm ci
fi

# Build with production env vars
VITE_API_BASE="${VITE_API_BASE}" \
VITE_LENZ_URL="${VITE_LENZ_URL}" \
    npm run build

echo "==> Deploying to Firebase Hosting (lenz-play)..."
firebase deploy --only hosting

echo ""
echo "=== Deployed to play.lenz.io ==="
echo ""
