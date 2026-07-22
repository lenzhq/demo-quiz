#!/usr/bin/env bash
# --------------------------------------------------------------------------
# Fact or Fiction — Build & Deploy to Firebase Hosting (play.lenz.io)
#
# Prerequisites:
#   - Firebase CLI installed: npm install -g firebase-tools
#   - Logged in: firebase login
#   - A hosting "target" named "app" mapped to your site:
#       firebase target:apply hosting app <site> --project <project>
#   - Project id: set FIREBASE_PROJECT in a local (gitignored) .env.production,
#     or leave it unset and rely on your .firebaserc default.
#
# Usage:
#   bash deploy/deploy.sh
# --------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_ROOT}"

# Firebase project — read from the local (gitignored) .env.production so it is
# not hardcoded in this public repo. Empty => rely on the .firebaserc default.
FIREBASE_PROJECT="$(grep -E '^FIREBASE_PROJECT=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"

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

echo "==> Deploying to Firebase Hosting${FIREBASE_PROJECT:+ (project: ${FIREBASE_PROJECT})}..."
firebase deploy --only hosting:app ${FIREBASE_PROJECT:+--project "${FIREBASE_PROJECT}"}

echo ""
echo "=== Deployed to play.lenz.io ==="
echo ""
