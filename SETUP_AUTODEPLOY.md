# Setup auto-deploy (5 minutos, una sola vez)

Despues de esto, cada `git push` despliega web + backend automaticamente.

## Paso 1 - Abre este link

https://github.com/AbdielPena/Finanzas-App/settings/secrets/actions

## Paso 2 - Crea estos 4 secrets

Click el boton verde **"New repository secret"** y crea uno por uno:

### Secret 1
- **Name**: `FTP_SERVER`
- **Secret**: `ftp.abbypixel.com`
- Click "Add secret"

### Secret 2
- **Name**: `FTP_USER`
- **Secret**: `sjjxfogj`
- Click "Add secret"

### Secret 3
- **Name**: `FTP_PASSWORD`
- **Secret**: tu password FTP de Banahosting (el que tienes en cPanel - FTP Accounts)
- Click "Add secret"

### Secret 4
- **Name**: `VITE_API_URL`
- **Secret**: `https://apifi.abbypixel.com/api/v1`
- Click "Add secret"

## Paso 3 - Verifica que se crearon

Deberias ver los 4 listados como:
- FTP_SERVER  Updated XXX
- FTP_USER  Updated XXX
- FTP_PASSWORD  Updated XXX
- VITE_API_URL  Updated XXX

(Los valores apareceran como `***` por seguridad)

## Paso 4 - Prueba el auto-deploy

En tu computadora:
```bash
cd C:\Users\abdiel\Desktop\Claude\Programas\finanzapp
echo "// test auto deploy" >> src/main.js
git add src/main.js
git commit -m "test: primer auto-deploy"
git push
```

Inmediatamente abre: https://github.com/AbdielPena/Finanzas-App/actions

Veras el workflow "Deploy Web Frontend" corriendo en verde. En 2-3 min termina y los cambios estan en `https://fi.abbypixel.com`.

---

## Despues de configurar - flujo dia a dia

### Cambios al frontend o backend
```bash
git add .
git commit -m "lo que sea"
git push
```
Auto-desplegado en 2-3 min. Cero clicks adicionales.

### Nueva version del .exe / APK
```bash
git tag v1.0.1
git push --tags
```
GitHub Actions compila ambos binarios (10-30 min) y publica en Releases.
Las apps instaladas detectan y muestran banner para actualizar.

---

## Seguridad

Despues del setup:
1. Rota el password FTP en cPanel - "FTP Accounts" - Change Password
2. Actualiza el secret `FTP_PASSWORD` en GitHub con el nuevo
3. El password viejo (que compartiste en chat) queda inutil
