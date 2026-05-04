#!/bin/bash
# Aplica los archivos del widget Android + Firebase Cloud Messaging
# sobre el proyecto generado por Capacitor.
# Se ejecuta DESPUES de `npx cap sync android`
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
OVERRIDES="$ROOT/android-overrides"

echo "[overrides] aplicando widget Android + FCM..."

# 0. variables.gradle con minSdk 23 (requerido por plugin biometrico)
cp "$OVERRIDES/variables.gradle" "$ANDROID/variables.gradle"

# 1. AndroidManifest con receiver del widget + permisos de notificacion
cp "$OVERRIDES/AndroidManifest.xml" "$ANDROID/app/src/main/AndroidManifest.xml"

# 2. Strings con descripcion del widget
cp "$OVERRIDES/strings.xml" "$ANDROID/app/src/main/res/values/strings.xml"

# 3. Codigo Java del widget provider + Quick Transaction Activity
mkdir -p "$ANDROID/app/src/main/java/com/finanzapp/app/widget"
cp "$OVERRIDES/widget/FinanzAppWidgetProvider.java" "$ANDROID/app/src/main/java/com/finanzapp/app/widget/"
cp "$OVERRIDES/widget/QuickTransactionActivity.java" "$ANDROID/app/src/main/java/com/finanzapp/app/widget/"

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

# 7. Firebase Cloud Messaging (FCM)
echo "[overrides] aplicando configuracion Firebase..."

# 7.1 google-services.json al app/
cp "$OVERRIDES/google-services.json" "$ANDROID/app/google-services.json"

# 7.2 Inyectar classpath de google-services en build.gradle del proyecto
ROOT_GRADLE="$ANDROID/build.gradle"
if ! grep -q "com.google.gms:google-services" "$ROOT_GRADLE"; then
  # Insertar la linea del classpath dentro del bloque dependencies del buildscript
  python3 - <<PYEOF
import re
path = "$ROOT_GRADLE"
with open(path, 'r') as f:
    content = f.read()
# Buscar el primer bloque "dependencies {" dentro de buildscript y agregar el classpath
new_content = re.sub(
    r"(buildscript\s*\{[^}]*?dependencies\s*\{)",
    r"\1\n        classpath 'com.google.gms:google-services:4.4.2'",
    content,
    count=1,
    flags=re.DOTALL
)
with open(path, 'w') as f:
    f.write(new_content)
print("[overrides] classpath de google-services inyectado en root build.gradle")
PYEOF
fi

# 7.3 Aplicar plugin google-services al final del app/build.gradle
APP_GRADLE="$ANDROID/app/build.gradle"
if ! grep -q "com.google.gms.google-services" "$APP_GRADLE"; then
  echo "" >> "$APP_GRADLE"
  echo "apply plugin: 'com.google.gms.google-services'" >> "$APP_GRADLE"
  echo "[overrides] plugin google-services aplicado a app/build.gradle"
fi

# 7.4 Anadir dependencia firebase-messaging al app/build.gradle
if ! grep -q "firebase-messaging" "$APP_GRADLE"; then
  python3 - <<PYEOF
import re
path = "$APP_GRADLE"
with open(path, 'r') as f:
    content = f.read()
new_content = re.sub(
    r"(dependencies\s*\{)",
    r"\1\n    implementation platform('com.google.firebase:firebase-bom:33.7.0')\n    implementation 'com.google.firebase:firebase-messaging'",
    content,
    count=1,
    flags=re.DOTALL
)
with open(path, 'w') as f:
    f.write(new_content)
print("[overrides] dependencias firebase-messaging anadidas a app/build.gradle")
PYEOF
fi

# 8. Sincronizar versionName de package.json al app/build.gradle
APP_VERSION=$(node -p "require('$ROOT/package.json').version")
echo "[overrides] sincronizando versionName a $APP_VERSION..."
python3 - <<PYEOF
import re
path = "$APP_GRADLE"
ver = "$APP_VERSION"
with open(path, 'r') as f:
    content = f.read()
content = re.sub(r'versionName\s+"[^"]*"', f'versionName "{ver}"', content, count=1)
# Tambien bumpear versionCode (cada parte * 10000 para que crezca monotonicamente)
parts = [int(x) for x in ver.split('.')]
while len(parts) < 3: parts.append(0)
code = parts[0] * 10000 + parts[1] * 100 + parts[2]
content = re.sub(r'versionCode\s+\d+', f'versionCode {code}', content, count=1)
with open(path, 'w') as f:
    f.write(content)
print(f'[overrides] versionName={ver} versionCode={code}')
PYEOF

echo "[overrides] OK - widget + Firebase + version aplicados al proyecto Android"
