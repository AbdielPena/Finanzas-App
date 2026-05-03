# Auto-Deploy: 1 push despliega todo

Despues de configurar los secrets una sola vez, cada `git push` a `main` hace:

1. Si tocas `src/`, `styles/`, `public/`, `index.html`, `vite.config.js`:
   - Build del frontend
   - Sube `dist/` a `https://fi.abbypixel.com` por FTP
   - Usuarios ven la nueva version al recargar

2. Si tocas `backend/`:
   - Sube `backend/` a `/finanzapp-api/` en Banahosting
   - Crea `tmp/restart.txt` para forzar restart de Phusion Passenger
   - API actualizada al instante

3. Cuando creas un git tag (ej. `v1.0.1`):
   - Compila `.exe` Windows en runner Windows de GitHub
   - Compila `.apk` Android en runner Linux de GitHub
   - Publica ambos en GitHub Releases con el tag
   - Las apps instaladas detectan la nueva version y muestran banner para actualizar

---

## Setup unico (5 minutos)

### 1. Configurar GitHub Secrets

Ve a `https://github.com/AbdielPena/Finanzas-App/settings/secrets/actions`

Click **"New repository secret"** y crea estos 4:

| Nombre | Valor |
|--------|-------|
| `FTP_SERVER` | `ftp.abbypixel.com` |
| `FTP_USER` | `sjjxfogj` |
| `FTP_PASSWORD` | el password de tu cuenta FTP de Banahosting |
| `VITE_API_URL` | `https://apifi.abbypixel.com/api/v1` |

> Estos secrets solo los puede leer GitHub Actions; nunca aparecen en logs ni en codigo.

### 2. Push los workflows

Ya estan creados en `.github/workflows/`:
- `deploy-web.yml` - frontend automatico
- `deploy-backend.yml` - backend automatico
- `release-apps.yml` - apps al hacer tag

Despues del primer push, ve a `https://github.com/AbdielPena/Finanzas-App/actions` y veras los workflows ejecutandose.

---

## Como usar el sistema

### Caso A - Cambiaste codigo del frontend o backend

```bash
git add .
git commit -m "fix: lo que sea"
git push
```

Listo. En 2-5 min los cambios estan en produccion.

### Caso B - Quieres publicar una nueva version del .exe / APK

Cambia la version en `package.json` y `src/update-checker.js` (constante `APP_VERSION`).
Luego:

```bash
git add .
git commit -m "release: v1.0.1"
git push
git tag v1.0.1
git push --tags
```

GitHub Actions compila los binarios (~20-30 min la primera vez, 10 min despues con cache) y los publica en GitHub Releases. Las apps instaladas en celulares/PCs lo detectan y muestran banner.

---

## Como actualizar el codigo en una sesion de trabajo (flujo dia a dia)

```bash
# 1. Asegurate de tener lo ultimo
git pull

# 2. Haces cambios

# 3. Push
git add .
git commit -m "feat: nueva feature X"
git push

# 4. Listo. Web + backend actualizados automaticamente.
#    Si quieres tambien empujar nueva version a apps:
git tag v1.0.X
git push --tags
```

---

## Troubleshooting

### El workflow falla con "FTP credentials invalid"
- Verifica que los 4 secrets estan creados en Github
- Verifica que el password no tiene espacios extra al copiarlo
- Si rotaste el password en Banahosting, actualiza el secret

### El backend no se actualiza despues del push
- Mira logs en cPanel -> Setup Node.js App -> Show Log
- A veces Passenger tarda en reiniciar - haz un primer request manualmente:
  `curl https://apifi.abbypixel.com/health`

### Las apps no muestran banner de update
- Verifica que el tag se publico: `https://github.com/AbdielPena/Finanzas-App/releases`
- El check corre 1 vez cada 6 horas. Para forzar: cierra y reabre la app
- Verifica en consola (DevTools del .exe / chrome://inspect del APK) si hay errores

---

## Seguridad

- El FTP_PASSWORD esta en GitHub Secrets cifrado, no en el codigo
- Despues de configurar todo, **rota el password de FTP** en Banahosting:
  cPanel -> FTP Accounts -> Change Password
  Luego actualiza el secret `FTP_PASSWORD` en GitHub
- Nunca commitees `.env*` con credenciales
- El `VITE_API_URL` no es secreto (es una URL publica), pero tenerlo en secrets evita ediciones por error
