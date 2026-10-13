#!/usr/bin/env bash
# Publishes the current JavaScript to every installed APK with matching native code.
#
# The app's runtime version is a fingerprint of its native side (app.json, native
# packages, config plugins, package.json scripts, .gitignore). An update only reaches
# APKs built with the same fingerprint, so after a native change, build a new APK with
# scripts/release-apk.sh first. `npx expo-updates runtimeversion:resolve --platform android`
# prints the current fingerprint; the latest APK's is in its assets/fingerprint.
#
# Exports to dist/update so the APK in dist/ survives.
set -euo pipefail

cd "$(dirname "$0")/.."
npx eas-cli@latest update --channel production --environment production --platform android \
  --input-dir dist/update --message "${1:?Usage: scripts/publish-update.sh \"what changed\"}"
