# Iconos de Tauri

Tauri requiere PNG/ICO en multiples tamanos. Para generarlos automaticamente desde el icono SVG del frontend:

## Opcion 1 — Tauri CLI (recomendado)

```bash
# Desde la raiz del proyecto:
npx @tauri-apps/cli icon public/icons/icon.svg
```

Esto genera automaticamente todos los formatos requeridos (32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns) en esta carpeta.

## Opcion 2 — Manual

Si prefieres usarlo con tu propio diseno:
1. Crea un PNG cuadrado de 1024x1024 px
2. Usa cualquier conversor online (ICO Convert, RealFaviconGenerator, etc.)
3. Genera los siguientes archivos en esta carpeta:
   - `32x32.png`
   - `128x128.png`
   - `128x128@2x.png` (256x256 px)
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)
