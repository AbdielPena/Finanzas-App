#!/bin/bash
# Aplica los archivos del widget Android sobre el proyecto generado por Capacitor
# Se ejecuta DESPUES de `npx cap sync android`
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
OVERRIDES="$ROOT/android-overrides"

echo "[overrides] aplicando widget Android..."

# 1. AndroidManifest con receiver del widget
cp "$OVERRIDES/AndroidManifest.xml" "$ANDROID/app/src/main/AndroidManifest.xml"

# 2. Strings con descripcion del widget
cp "$OVERRIDES/strings.xml" "$ANDROID/app/src/main/res/values/strings.xml"

# 3. Codigo Java del widget provider
mkdir -p "$ANDROID/app/src/main/java/com/finanzapp/app/widget"
cp "$OVERRIDES/widget/FinanzAppWidgetProvider.java" "$ANDROID/app/src/main/java/com/finanzapp/app/widget/"

# 4. Layout del widget
cp "$OVERRIDES/widget/widget_finanzapp.xml" "$ANDROID/app/src/main/res/layout/"

# 5. Metadata del widget
mkdir -p "$ANDROID/app/src/main/res/xml"
cp "$OVERRIDES/widget/widget_finanzapp_info.xml" "$ANDROID/app/src/main/res/xml/"

# 6. Drawables del widget (background + botones)
cp "$OVERRIDES/widget/widget_background.xml" "$ANDROID/app/src/main/res/drawable/"
cp "$OVERRIDES/widget/widget_button_ingreso.xml" "$ANDROID/app/src/main/res/drawable/"
cp "$OVERRIDES/widget/widget_button_gasto.xml" "$ANDROID/app/src/main/res/drawable/"
cp "$OVERRIDES/widget/widget_button_transferencia.xml" "$ANDROID/app/src/main/res/drawable/"
cp "$OVERRIDES/widget/widget_button_open.xml" "$ANDROID/app/src/main/res/drawable/"

echo "[overrides] OK - widget aplicado al proyecto Android"
