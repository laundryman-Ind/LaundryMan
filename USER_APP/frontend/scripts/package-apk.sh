#!/usr/bin/env bash
# Clean, fresh APK packaging for Laundry Man.
#
# Pipeline (everything rebuilt from scratch, no stale state):
#   1. web build         -> dist/
#   2. trimmed pdfmake vfs (Roboto + Roboto Medium only)
#   3. capacitor sync    -> copies dist into the android project
#   4. patch the packaged index.html with the old working APK's settings
#      (viewport width=480 + apk-native-only style)
#   5. gradlew clean + assembleDebug (full clean, fresh start)
#   6. copy the APK to APK_BUILD/
#
# The versionCode is bumped per build so Android installs the update cleanly.
set -euo pipefail
cd "$(dirname "$0")/.."

# Locate a JDK 21 (required by the android build).
if [ -z "${JAVA_HOME:-}" ]; then
  for d in "C:/Program Files/Eclipse Adoptium"/jdk-21* "C:/Program Files/Java"/jdk-21* "$HOME/.jdks"/21*; do
    if [ -d "$d" ]; then JAVA_HOME="$d"; break; fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -d "$JAVA_HOME" ]; then
  echo "ERROR: JDK 21 not found. Set JAVA_HOME to a JDK 21 install." >&2
  exit 1
fi
echo "Using JDK: $JAVA_HOME"

OUT="../../APK_BUILD/LaundryMan-beta0.12.apk"

echo "── 1/6 web build"
npm run build

echo "── 2/6 trimmed pdfmake fonts"
node scripts/make-vfs-lite.mjs

echo "── 3/6 capacitor sync"
npx cap sync android

echo "── 4/6 patch packaged index.html (old-APK reference settings)"
node scripts/patch-apk-index.mjs android/app/src/main/assets/public/index.html

echo "── 5/6 clean + build APK (fresh start)"
(
  cd android
  export JAVA_HOME
  ./gradlew clean --console=plain
  ./gradlew assembleDebug --console=plain
)

echo "── 6/6 copy APK"
cp android/app/build/outputs/apk/debug/app-debug.apk "$OUT"
echo "Done → $OUT"
ls -la "$OUT"
