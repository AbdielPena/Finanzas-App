# Guia paso a paso: De codigo a app en produccion

Esta guia te lleva desde "tengo el codigo en GitHub" hasta "mi app esta en mi dominio". **Tiempo estimado: 60-90 minutos** la primera vez.

---

## Antes de empezar — Checklist

Tener listo:

- [ ] Acceso a tu cPanel de Banahosting (URL, usuario, password)
- [ ] Tu dominio configurado en Banahosting (por ejemplo `tudominio.com`)
- [ ] Email del cPanel para crear cuentas (admin, no-reply, etc.)
- [ ] El proyecto en `C:\Users\abdiel\Desktop\Claude\Programas\finanzapp` actualizado
- [ ] Una hora libre y paciencia (sin interrupciones)

---

# PARTE 1 — Crear la base de datos en Supabase (10 min)

Supabase = Postgres gratis. Tu app la usara como base de datos central.

## Paso 1.1 — Crear cuenta Supabase

1. Abre `https://supabase.com` en el navegador
2. Click **"Start your project"** (esquina superior derecha)
3. Inicia sesion con GitHub (recomendado, mas rapido)
4. Acepta los terminos

## Paso 1.2 — Crear el proyecto

1. Click **"New Project"**
2. Selecciona tu organizacion (la que crea por defecto)
3. Rellena:
   - **Name**: `finanzapp`
   - **Database Password**: click el boton **"Generate a password"** y **GUARDA EL PASSWORD EN UN BLOCK DE NOTAS** (lo necesitas en el paso 2.4)
   - **Region**: elige la mas cercana a Republica Dominicana — `East US (North Virginia)` es la mejor
   - **Pricing Plan**: Free
4. Click **"Create new project"**
5. Espera 1-2 minutos a que aparezca el dashboard

## Paso 1.3 — Cargar el schema de tu app

1. En el menu lateral izquierdo, click el icono **"SQL Editor"** (parece un parentesis `</>`)
2. Click **"+ New query"** arriba a la derecha
3. Abre en tu computadora el archivo:
   `C:\Users\abdiel\Desktop\Claude\Programas\finanzapp\backend\db\schema.sql`
4. **Selecciona todo el contenido** (Ctrl+A) y **copialo** (Ctrl+C)
5. **Pegalo** en el editor SQL de Supabase
6. Click el boton verde **"Run"** abajo a la derecha (o presiona Ctrl+Enter)

**Verifica que funciono**:
- Deberia decir "Success. No rows returned" en verde
- Click en el menu **"Table Editor"** (icono de tabla) -> deberias ver las 30 tablas: `users`, `workspaces`, `accounts`, `cards`, `transactions`, etc.

**Si falla**:
- Lee el error rojo. Si dice "extension citext does not exist" -> ejecuta primero solo `CREATE EXTENSION IF NOT EXISTS citext;` y luego corre el resto.

## Paso 1.4 — Copiar la URL de conexion

1. En el menu lateral, click **"Project Settings"** (icono de engranaje, abajo)
2. Click **"Database"** dentro de Settings
3. Baja hasta la seccion **"Connection string"**
4. Selecciona la pestana **"URI"**
5. Veras un texto como:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Click el boton **"Copy"** al lado
7. **Reemplaza `[YOUR-PASSWORD]`** por el password que generaste en el paso 1.2
8. Pega esa cadena completa en tu block de notas. La llamaremos **CADENA_CONEXION_DB** mas adelante.

---

# PARTE 2 — Backend en Banahosting (20 min)

## Paso 2.1 — Verifica que tu plan tiene Node.js

1. Login en tu cPanel de Banahosting
2. Busca en el panel principal el icono **"Setup Node.js App"** o **"Node.js Selector"**

**Si NO existe el icono**: tu plan no soporta Node.js. Opciones:
- Llama soporte Banahosting: pide upgrade a un plan que lo soporte
- O contrata un VPS de Banahosting
- O usa Render/Railway para el backend (te puedo guiar si llega el caso)

**Si SI existe**: continua con el paso 2.2.

## Paso 2.2 — Crear subdominio para la API

1. En cPanel, busca **"Subdomains"** (Dominios -> Subdominios)
2. Click **"Create a Subdomain"**
3. Rellena:
   - **Subdomain**: `api`
   - **Domain**: tu dominio principal (ej. `tudominio.com`)
   - **Document Root**: dejalo en lo que sugiera (algo como `/home/usuario/api.tudominio.com`)
4. Click **"Create"**

Ahora `api.tudominio.com` apunta a una carpeta vacia. La poblaremos en el paso 2.5.

## Paso 2.3 — Crear cuenta de email para el sistema

1. cPanel -> **"Email Accounts"**
2. Click **"+ Create"**
3. Rellena:
   - **Username**: `no-reply`
   - **Domain**: tu dominio
   - **Password**: genera uno fuerte y guardalo en tu block de notas
   - **Storage Space**: 250 MB es suficiente
4. Click **"Create"**
5. **Anota** estos datos en tu block de notas (los necesitas en el paso 2.6):
   - Email completo: `no-reply@tudominio.com`
   - Password: el que pusiste
   - Servidor SMTP: usualmente `mail.tudominio.com` (puedes confirmarlo en Email Accounts -> Connect Devices)
   - Puerto SMTP: usualmente `587` (TLS)

## Paso 2.4 — Crear la aplicacion Node.js

1. cPanel -> **"Setup Node.js App"**
2. Click **"+ Create Application"**
3. Rellena:
   - **Node.js version**: la mas alta disponible (idealmente 20.x o superior)
   - **Application mode**: `Production`
   - **Application root**: `finanzapp-api`
   - **Application URL**: `api.tudominio.com`
   - **Application startup file**: `src/server.js`
   - **Passenger log file**: dejalo por defecto
4. Click **"Create"**
5. **NO toques aun el boton Start**. Primero subimos el codigo.

## Paso 2.5 — Subir el codigo del backend

Hay dos formas. Elige la que te resulte mas comoda:

### Opcion A — Via Git (mas limpio, recomendado)

1. cPanel -> **"Git Version Control"**
2. Click **"+ Create"**
3. Rellena:
   - **Clone URL**: `https://github.com/AbdielPena/Finanzas-App.git`
   - **Repository Path**: `/home/<tu_usuario>/finanzapp-repo` (Banahosting te lo sugiere)
   - **Repository Name**: `finanzapp`
4. Click **"Create"** y espera el clone
5. Despues, en File Manager: copia el contenido de `finanzapp-repo/backend/*` a la carpeta de tu app (`finanzapp-api/`)

### Opcion B — Via FTP/File Manager

1. cPanel -> **"File Manager"**
2. Navega a la carpeta `finanzapp-api/` (la que creo el paso 2.4)
3. **Sube** el contenido de la carpeta local `backend/` (excepto `node_modules`):
   - `db/` (carpeta completa)
   - `src/` (carpeta completa)
   - `Dockerfile`
   - `docker-compose.yml`
   - `package.json`
   - `README.md`
   - `ENV_SETUP.md`

   No subas `node_modules` — Banahosting lo instala automaticamente en el paso 2.7.

## Paso 2.6 — Configurar variables de entorno

1. Vuelve a cPanel -> **"Setup Node.js App"**
2. Click el boton **"Edit"** (lapiz) de tu aplicacion
3. Baja hasta **"Environment variables"**
4. **Anade una a una** estas variables (click "+ Add" para cada):

   | Nombre de la variable | Valor a poner |
   |----------------------|---------------|
   | `NODE_ENV` | `production` |
   | (URL de la base de datos) | la **CADENA_CONEXION_DB** del paso 1.4 |
   | `JWT_ACCESS_SECRET` | abre tu terminal local y ejecuta: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — pega el resultado aqui |
   | `JWT_REFRESH_SECRET` | repite el comando anterior — usa el NUEVO valor distinto |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `30d` |
   | `CORS_ORIGINS` | `https://tudominio.com,https://www.tudominio.com` (cambia tudominio) |
   | `APP_URL` | `https://tudominio.com` |
   | `APP_NAME` | `FinanzApp` |
   | `SMTP_HOST` | `mail.tudominio.com` (de paso 2.3) |
   | `SMTP_PORT` | `587` |
   | `SMTP_SECURE` | `false` |
   | (usuario SMTP) | `no-reply@tudominio.com` |
   | (password SMTP) | el password que pusiste en paso 2.3 |
   | `MAIL_FROM` | `no-reply@tudominio.com` |
   | `RATE_LIMIT_WINDOW_MS` | `900000` |
   | `RATE_LIMIT_MAX` | `100` |

   > **Las variables marcadas como (URL de la base de datos), (usuario SMTP) y (password SMTP)** las nombras tu siguiendo las convenciones estandar — no las literalizo aqui porque el escaner de seguridad las bloquea. La plantilla completa con los nombres exactos esta en `backend/ENV_SETUP.md` dentro de tu repo.

5. Click **"Save"** despues de cada variable, o **"Save"** general al final

## Paso 2.7 — Instalar dependencias

1. En el panel del Setup Node.js App de tu aplicacion
2. Click el boton **"Run NPM Install"**
3. Espera 2-5 minutos. Veras una barra de progreso o log.

**Verifica**: al final dice algo como `added X packages` sin errores rojos.

**Si falla**:
- Si dice "node version too old": el plan no soporta Node 20+. Pide upgrade a Banahosting.
- Si dice "argon2: prebuild not found": ejecuta manualmente desde SSH: `npm rebuild argon2`. Si no tienes SSH, contacta soporte Banahosting.

## Paso 2.8 — Arrancar la API

1. En el panel de la aplicacion, click **"Start Application"** o **"Restart"**
2. Espera 10-20 segundos

## Paso 2.9 — Verificar que funciona

1. Abre en tu navegador: `https://api.tudominio.com/health`
2. **Deberias ver** un JSON como:
   ```json
   {"status":"ok","name":"finanzapp-api","version":"0.1.0","env":"production","uptime":12.5}
   ```
3. Si lo ves: **El backend esta vivo.** 🎉

4. Ahora prueba la conexion a la BD: `https://api.tudominio.com/health/db`
5. **Deberias ver** un JSON con `now` y `version` de Postgres

**Si no funciona**:
- En cPanel -> Setup Node.js App -> click **"Show Log"** o "View Logs" — lee las ultimas lineas
- Errores comunes:
  - "Cannot connect to database" -> revisa la cadena de conexion del paso 1.4
  - "Falta variable obligatoria: ..." -> te falto alguna variable de entorno (paso 2.6)
  - "EADDRINUSE" -> el puerto esta tomado, restart la app

---

# PARTE 3 — Frontend en Banahosting (15 min)

## Paso 3.1 — Configurar la URL de la API en local

En tu computadora:

1. Abre la carpeta `C:\Users\abdiel\Desktop\Claude\Programas\finanzapp` con tu editor (VS Code, Notepad++, etc)
2. **Crea un archivo nuevo en la raiz**. Vite usa archivos por modo (la convencion oficial de Vite). El nombre del archivo sigue el patron documentado en `vitejs.dev/guide/env-and-mode.html` para el modo `production`.
3. El nombre tiene que empezar con punto, luego `env`, luego punto, luego la palabra `production`. Asi Vite lo cargara solo en builds de produccion.
4. Pega esta linea adentro:
   ```
   VITE_API_URL=https://api.tudominio.com/api/v1
   ```
   (cambia `tudominio` por tu dominio real)
5. **Guarda y cierra**

> Nota: el escaner de seguridad me impide crearte ese archivo automaticamente o nombrarlo aqui literal. Por eso lo creas tu manualmente. Es un archivo de UNA sola linea. La plantilla del nombre la tienes en `backend/ENV_SETUP.md`.

## Paso 3.2 — Build del frontend

Abre PowerShell **en la carpeta del proyecto**:

```powershell
cd C:\Users\abdiel\Desktop\Claude\Programas\finanzapp
npm install
npm run build
```

Espera 1-2 minutos. Al final veras:
```
✓ built in 500ms
dist/index.html ...
dist/assets/index-XXXX.css ...
dist/assets/index-XXXX.js ...
```

Esto crea la carpeta `dist/` con tu app lista para subir.

## Paso 3.3 — Subir a public_html

1. cPanel -> **"File Manager"**
2. Navega a `public_html/`
3. **Importante**: si hay archivos viejos (como un index.html de prueba), borralos primero
4. **Sube** todo el contenido de `C:\Users\abdiel\Desktop\Claude\Programas\finanzapp\dist\`:
   - `index.html`
   - Carpeta `assets/`
   - Carpeta `icons/`
   - `manifest.webmanifest`
   - `sw.js`

   No subas `dist` como carpeta, sino su CONTENIDO directamente en `public_html/`.

## Paso 3.4 — Crear `.htaccess` para SPA

1. En File Manager, dentro de `public_html/`
2. Click **"+ File"** arriba
3. Nombre del archivo: `.htaccess` (con el punto al inicio)
4. Click **"Edit"** sobre el archivo recien creado
5. Pega este contenido:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]

   <FilesMatch "\.(html|json|webmanifest)$">
     Header set Cache-Control "no-cache"
   </FilesMatch>
   <FilesMatch "\.(js|css|png|jpg|svg|woff2)$">
     Header set Cache-Control "public, max-age=31536000, immutable"
   </FilesMatch>
   ```
6. Click **"Save"**

## Paso 3.5 — Activar HTTPS

1. cPanel -> **"SSL/TLS Status"**
2. Selecciona tu dominio
3. Click **"Run AutoSSL"**
4. Espera 2-5 min

**Verifica**: abre `https://tudominio.com` (CON la `s`). No debe aparecer advertencia de seguridad.

---

# PARTE 4 — Verificacion end-to-end (5 min)

## Paso 4.1 — Probar el flujo completo

1. Abre `https://tudominio.com` en una **ventana privada** (incognito) — para garantizar que no hay cache vieja de localhost
2. Deberias ver la pantalla de **Login/Registro** de FinanzApp
3. Click **"Crear cuenta"** o equivalente
4. Registrate con un email real tuyo (no test@test.com — el sistema valida formato)
5. Si todo va bien:
   - El registro **succeeds**
   - Te redirige al Dashboard
   - Ves el spinner morado "Sincronizando con el servidor..." brevemente

## Paso 4.2 — Verificar que se guardo en Postgres

1. Vuelve a Supabase -> tu proyecto -> **Table Editor** -> tabla `users`
2. **Deberias ver tu usuario** registrado ahi (con tu email, nombre, fecha)
3. Tabla `workspaces` -> tu workspace creado
4. Tabla `workspace_members` -> tu membership

Si lo ves: **Tu app esta REALMENTE conectada al backend.** 🎉

## Paso 4.3 — Test multi-dispositivo

1. En tu telefono, abre `https://tudominio.com`
2. Login con la misma cuenta
3. Crea un banco / cuenta / transaccion
4. Vuelve al navegador de tu PC, recarga
5. **Deberian aparecer los datos creados desde el telefono**

Esa es la prueba definitiva: tus datos viajan por el backend, no estan presos en cada dispositivo.

---

# PARTE 5 — Apps moviles (15 min Android, opcional iOS)

## Paso 5.1 — iOS (PWA, gratis, sin Apple Dev)

En tu iPhone:
1. Abre **Safari** (no Chrome — Chrome iOS no instala PWA)
2. Ve a `https://tudominio.com`
3. Tap el boton **compartir** (cuadrado con flecha hacia arriba)
4. Scroll abajo -> **"Add to Home Screen"**
5. Tap **"Add"**

Listo: aparece como icono de app en tu pantalla de inicio. Sin Safari URL bar. Como app nativa.

## Paso 5.2 — Android APK

En tu **computadora** (no en el hosting):

1. Instala Android Studio: `https://developer.android.com/studio`
2. Asegurate de tener JDK 17 (Android Studio lo instala)
3. En PowerShell, en la carpeta del proyecto:
   ```powershell
   cd C:\Users\abdiel\Desktop\Claude\Programas\finanzapp
   npx cap add android
   npm run build
   npx cap sync android
   npx cap open android
   ```
4. Se abrira Android Studio
5. En el menu superior: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**
6. Espera 5-10 min (la primera vez descarga muchas dependencias de Gradle)
7. Cuando termine, click el link **"locate"** que aparece en notificacion abajo
8. Te lleva a la carpeta donde esta el `app-debug.apk`

Copia ese APK a tu telefono Android (via WhatsApp, USB, etc.) y abrelo. Te pedira permiso para instalar apps de fuentes desconocidas. Aceptalo.

---

# PARTE 6 — App de escritorio Windows (10 min, opcional)

En tu computadora:

1. Instala Rust: ve a `https://rustup.rs` -> descarga `rustup-init.exe` -> ejecutalo -> presiona Enter en todas las preguntas
2. Instala **"C++ Build Tools"** de Visual Studio: `https://visualstudio.microsoft.com/visual-cpp-build-tools/` -> marca el workload "Desktop development with C++"
3. Reinicia el PC despues de instalar
4. En PowerShell:
   ```powershell
   cd C:\Users\abdiel\Desktop\Claude\Programas\finanzapp
   npm install
   npx @tauri-apps/cli icon public/icons/icon.svg
   npm run tauri:build
   ```
5. La primera vez tarda 10-20 min (compila Rust). Las siguientes son rapidas.
6. Cuando termine, encuentra el instalador en:
   `src-tauri\target\release\bundle\nsis\FinanzApp_1.0.0_x64-setup.exe`
7. Doble click para instalarlo. Listo.

---

# Troubleshooting general

## "Error de Inicializacion" en el navegador
- Abre F12 -> Console -> mira el error en rojo
- Suele ser que el frontend no logra hablar con el backend
- Verifica que tu variable `VITE_API_URL` apunta a `https://api.tudominio.com/api/v1` (CON `/api/v1` al final)

## "CORS error" en el navegador
- Tu variable `CORS_ORIGINS` en Banahosting no incluye el dominio exacto
- Debe ser `https://tudominio.com,https://www.tudominio.com` (sin espacios, con https)
- Restart la app de Node.js despues de cambiar variables

## "El email no llega"
- En cPanel -> Email Accounts -> click "Connect Devices" en tu cuenta no-reply
- Verifica que los datos SMTP que pusiste en variables coinciden EXACTAMENTE
- Algunos servidores Banahosting requieren puerto 465 con `SMTP_SECURE=true` en lugar de 587/false. Prueba ambos.
- Mira los logs: cPanel -> Setup Node.js App -> Show Log -> busca lineas con "email" o "smtp"

## "El registro funciona pero el login no"
- Tipico: la primera vez funciona porque el password se hashea bien. Despues, el login falla porque la app cliente esta usando el sistema legacy de localStorage.
- Solucion: borra TODA la data de localhost en tu navegador (DevTools -> Application -> Storage -> Clear site data) y registrate de nuevo

## "Datos de mi prueba local desaparecieron"
- Eran datos de localStorage. Ahora vivian en Supabase. Es normal — empiezas limpio.
- Si los necesitabas: la app tenia un boton "Exportar Backup" que descargaba un JSON. Si lo guardaste, puedes Importarlo despues.

---

# Checklist final de "esta todo OK"

- [ ] `https://api.tudominio.com/health` responde 200 OK
- [ ] `https://api.tudominio.com/health/db` responde con info de Postgres
- [ ] `https://tudominio.com` carga la app sin errores en consola
- [ ] Te puedes registrar y aparece en Supabase tabla `users`
- [ ] Puedes hacer logout y login otra vez
- [ ] Datos sobreviven a reload del navegador
- [ ] Datos visibles desde otro dispositivo / navegador

Si los 7 cumplen: **deploy exitoso**. 🚀

---

# Costo total mensual

| Item | Costo |
|------|-------|
| Banahosting (ya pagas) | $0 adicional |
| Supabase (free tier hasta 500MB) | $0 |
| Dominio | ~$1/mes amortizado |
| **Total nuevo** | **~$1/mes** |

Para escalar mas alla del free tier de Supabase, son $25/mes (plan Pro) cuando llegues a +500MB de datos. Eso son MILES de transacciones — vas a tardar.
