# Despliegue en Banahosting

Guia paso a paso para subir FinanzApp (frontend + backend) a tu hosting Banahosting con cPanel.

## Arquitectura de despliegue

```
tudominio.com           -> Frontend (public_html)
api.tudominio.com       -> Backend Node.js (subdominio + Setup Node.js App)
db.supabase.co          -> Postgres gestionado (Supabase free tier)
mail.tudominio.com      -> SMTP de Banahosting (cuenta de email)
```

---

## Pre-requisitos

1. **Plan Banahosting con Node.js**
   Verifica en cPanel que existe el icono **"Setup Node.js App"**.
   Si no aparece, contacta soporte de Banahosting o considera upgrade a VPS.

2. **Cuenta Supabase gratis**
   - Ir a [supabase.com](https://supabase.com), registrarte
   - "New project" -> nombre `finanzapp` -> elegir region (US East mas cercano)
   - Apunta el password del proyecto y la **Connection String** (Settings -> Database -> URI)

3. **Subdominio para la API**
   En cPanel -> Subdominios -> crear `api.tudominio.com`

4. **Cuenta de email del hosting**
   En cPanel -> Email Accounts -> crear `no-reply@tudominio.com`
   Anota host SMTP, puerto, usuario, password.

---

## Paso 1 — Cargar el schema en Supabase

1. Login en Supabase -> tu proyecto -> SQL Editor
2. Pegar todo el contenido de `backend/db/schema.sql`
3. Run

Verifica que aparezcan las 28+ tablas en Database -> Tables.

---

## Paso 2 — Backend en Banahosting (Setup Node.js App)

1. cPanel -> **Setup Node.js App** -> **Create Application**
   - Node.js version: 20.x (la mas alta disponible)
   - Application mode: Production
   - Application root: `finanzapp-api`
   - Application URL: `api.tudominio.com`
   - Application startup file: `src/server.js`

2. **Subir el codigo**

   Por **Git Version Control** (recomendado, en cPanel):
   ```
   Repo URL: https://github.com/AbdielPena/Finanzas-App.git
   Repo path: /home/usuario/finanzapp-api
   Branch: main
   ```
   Marca "Deploy directorio backend" y selecciona la subcarpeta `backend/`.

   O por **FTP/SSH**: subes solo la carpeta `backend/` al `Application root`.

3. **Variables de entorno** (panel "Environment Variables" del Setup Node.js App)

   Ver la plantilla completa en `backend/ENV_SETUP.md`. En produccion los valores criticos son:

   - `NODE_ENV` = production
   - URL de conexion a Supabase (la copias del panel de Supabase)
   - Dos secrets JWT distintos (genera con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `CORS_ORIGINS` = https://tudominio.com,https://www.tudominio.com
   - `APP_URL` = https://tudominio.com
   - Configuracion SMTP del hosting

4. **Instalar dependencias**

   Boton **"Run NPM Install"** del panel de Setup Node.js App.

5. **Arrancar la app**

   Boton **"Start Application"**. Si todo esta bien:
   - `https://api.tudominio.com/health` debe responder JSON
   - `https://api.tudominio.com/health/db` debe responder con info de Postgres

---

## Paso 3 — Frontend en `public_html`

1. **Build local** en tu maquina (raiz del repo):

   Crea un archivo de configuracion de produccion para Vite (Vite usa el patron de archivos por modo - lo encuentras en su documentacion oficial). Dentro pones la URL de la API:
   ```
   VITE_API_URL=https://api.tudominio.com/api/v1
   ```

   Luego:
   ```bash
   npm install
   npm run build
   ```
   Esto genera `dist/`.

2. **Subir el contenido de `dist/`** a `public_html` de tu hosting via FTP o File Manager de cPanel.

3. **Configurar SPA fallback** (necesario para que el hash router funcione bien):
   En `public_html/.htaccess`:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]

   # Cache-Control para PWA
   <FilesMatch "\.(html|json|webmanifest)$">
     Header set Cache-Control "no-cache"
   </FilesMatch>
   <FilesMatch "\.(js|css|png|jpg|svg|woff2)$">
     Header set Cache-Control "public, max-age=31536000, immutable"
   </FilesMatch>
   ```

4. **HTTPS obligatorio**: cPanel -> SSL/TLS Status -> "Run AutoSSL" para tu dominio. La PWA solo funciona en HTTPS.

---

## Paso 4 — Verificacion end-to-end

1. Abre `https://tudominio.com` en navegador
2. Registra una cuenta nueva
3. Verifica:
   - Llega un email a tu inbox (test) con link de verificacion
   - Login funciona
   - Crear un banco/cuenta -> aparece despues de refrescar
   - El admin (`#/superadmin`) muestra al menos tu usuario

---

## Paso 5 — App Android (APK)

Esto se hace en **tu maquina local**, no en el hosting:

```bash
# Una sola vez:
npm install
npx cap add android

# Cada vez que quieras generar APK:
npm run build
npx cap sync android
npx cap open android
# En Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Necesitas Android Studio + JDK 17 instalados.

---

## Paso 6 — App iOS (PWA)

Como decidiste **sin Apple Developer Program ($99/ano)**, el camino es PWA:

1. Abre `https://tudominio.com` en Safari iOS
2. Tap el boton compartir (cuadrado con flecha)
3. "Anadir a pantalla de inicio"
4. La PWA queda como icono nativo, sin Safari URL bar

Limitaciones de PWA en iOS:
- No push notifications nativas (Apple las habilito recien en iOS 16.4 con limitaciones)
- No acceso a contactos / camara avanzada
- Para FinanzApp esto **no es problema** - no necesita esas APIs

---

## Paso 7 — Desktop Windows (.exe con Tauri)

En tu maquina local:

```bash
# Una sola vez:
# Instala Rust desde https://rustup.rs
# Instala Visual Studio C++ Build Tools

npm install
npm run tauri:build
```

Genera un `.exe` instalable en:
`src-tauri/target/release/bundle/nsis/FinanzApp_1.0.0_x64-setup.exe`

Distribuye ese instalador.

---

## Troubleshooting

### "Setup Node.js App" no aparece en mi cPanel
Tu plan no soporta Node.js. Opciones:
1. Upgrade a un plan superior de Banahosting
2. Usar VPS de Banahosting (te da SSH y libertad total)
3. Mover SOLO el backend a Render/Railway (mantienes frontend en Banahosting)

### La API no responde
- Verifica logs en cPanel -> Setup Node.js App -> "Show Log"
- Verifica que las variables de entorno estan completas
- Test de conexion a la BD: `psql <connection-string>` desde tu maquina

### Email no llega
- Verifica que la configuracion SMTP es correcta (test desde cPanel -> Email Accounts -> "Connect Devices")
- Algunos Banahosting requieren puerto 465 con SMTP seguro habilitado en lugar de 587

### CORS error en el navegador
- Asegurate que `CORS_ORIGINS` incluye tu dominio EXACTO con https://
- Si usas www, incluye ambos: `https://tudominio.com,https://www.tudominio.com`

---

## Costos estimados

| Item | Costo |
|------|-------|
| Banahosting (ya tienes) | tu plan actual |
| Supabase Postgres | $0 (free tier hasta 500MB) |
| Dominio | ~$10/ano |
| Apple Dev (NO compras) | $0 |
| Google Play Dev (opcional, si quieres APK en Play Store) | $25 una sola vez |
| **TOTAL adicional** | **$0-25** |
