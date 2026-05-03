# Variables de entorno del backend

Crea un archivo llamado `.env` en `backend/` y pega el contenido siguiente, ajustando los valores.

> **Importante:** el archivo `.env` ya está en `.gitignore` — NUNCA lo commitees con valores reales.

## Plantilla

```bash
# --- Servidor ---
NODE_ENV=development
PORT=4000

# --- Base de datos PostgreSQL ---
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finanzapp
DB_USER=finanzapp
DB_PASSWORD=cambia_esto

# Alternativa: si tu hosting da una URL completa de conexion (Railway, Render, Supabase),
# usa esa variable en lugar de las cinco DB_* anteriores. Buscala en el panel del proveedor.

# --- JWT ---
# Genera cada secret con:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=PEGAR_VALOR_GENERADO_AQUI
JWT_REFRESH_SECRET=PEGAR_OTRO_VALOR_DISTINTO_AQUI
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# --- CORS ---
# Origenes permitidos separados por coma (sin espacios)
CORS_ORIGINS=http://localhost:5173,http://localhost:1420

# --- Rate limiting ---
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Generar secrets seguros

En la terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Ejecuta DOS veces, una para `JWT_ACCESS_SECRET` y otra para `JWT_REFRESH_SECRET`. Deben ser distintos.

## Variables por entorno

| Entorno | Diferencias clave |
|---------|-------------------|
| `development` | Conexion a Postgres local (docker-compose). CORS abre localhost. |
| `staging` | Conexion al Postgres de staging del hosting. CORS abre el dominio staging. |
| `production` | Conexion productiva. CORS solo el dominio real. Secretos rotados. Logs reducidos. |

## (Opcional) Proxy a IA

Si quieres centralizar la llamada a OpenAI/Claude/etc desde el backend (en lugar del proxy de Vite que ya tienes), agrega manualmente la variable correspondiente al `.env`. No la incluyo en la plantilla porque los hooks de seguridad las bloquean por precaucion.
