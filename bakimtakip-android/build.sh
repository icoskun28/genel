#!/usr/bin/env bash
# Bakım Takip 1.0 APK derleme betiği (Android SDK build-tools ile; Gradle gerekmez).
# Gerekli: ANDROID_JAR, AAPT2, D8, ZIPALIGN, APKSIGNER, KEYSTORE, KS_PASS
set -euo pipefail
cd "$(dirname "$0")"
OUT=build; rm -rf "$OUT"; mkdir -p "$OUT/classes" "$OUT/dex"
"$AAPT2" compile --dir res -o "$OUT/res.zip"
"$AAPT2" link -o "$OUT/base.apk" -I "$ANDROID_JAR" --manifest AndroidManifest.xml -A assets \
  --min-sdk-version 24 --target-sdk-version 34 --version-code 1 --version-name 1.0 "$OUT/res.zip"
javac -source 8 -target 8 -nowarn -Xlint:-options -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find src -name '*.java')
"$D8" --release --min-api 24 --lib "$ANDROID_JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q -j ../base.apk classes.dex)
"$ZIPALIGN" -f -p 4 "$OUT/base.apk" "$OUT/aligned.apk"
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias bakimtakip \
  --out "$OUT/BakimTakip-1.0.apk" "$OUT/aligned.apk"
"$APKSIGNER" verify --print-certs "$OUT/BakimTakip-1.0.apk" | head -3
ls -la "$OUT/BakimTakip-1.0.apk"
