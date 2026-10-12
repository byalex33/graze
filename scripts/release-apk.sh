#!/usr/bin/env bash
# Builds a signed release APK into dist/.
#
# Signing uses ~/.graze/keystore.properties (never committed). Every release
# must be signed with that same key, or Android refuses to install it over the
# previous version and people would have to uninstall, losing their data.
set -euo pipefail

cd "$(dirname "$0")/.."

PROPS="${GRAZE_KEYSTORE_PROPERTIES:-$HOME/.graze/keystore.properties}"
[ -f "$PROPS" ] || { echo "Missing $PROPS (the release signing key)." >&2; exit 1; }
prop() { grep "^$1=" "$PROPS" | cut -d= -f2-; }

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
VERSION="$(node -p "require('./app.json').expo.version")"

if [ "${SKIP_BUILD:-0}" != 1 ]; then
  npx expo prebuild --platform android --no-install
  (cd android && ./gradlew assembleRelease --console=plain)
fi

mkdir -p dist
UNSIGNED=android/app/build/outputs/apk/release/app-release.apk
ALIGNED="dist/graze-$VERSION-aligned.apk"
OUT="dist/graze-$VERSION.apk"

"$BUILD_TOOLS/zipalign" -f -p 4 "$UNSIGNED" "$ALIGNED"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$(prop storeFile)" --ks-key-alias "$(prop keyAlias)" \
  --ks-pass "pass:$(prop storePassword)" --key-pass "pass:$(prop keyPassword)" \
  --out "$OUT" "$ALIGNED"
mv "$ALIGNED" "$(mktemp -d)/" # keep dist/ to the one file people download

"$BUILD_TOOLS/apksigner" verify --print-certs "$OUT" | grep -E "Signer #1 certificate (DN|SHA-256)"
echo "Built $OUT"
