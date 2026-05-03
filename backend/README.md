# FinanzApp Backend (API)

API REST centralizada para FinanzApp. Todas las plataformas (web, desktop, mobile) consumen este backend.

## Stack

- **Node.js 20** + Express 4
- **PostgreSQL 16**
- **JWT** (access + refresh con rotacion)
- **argon2id** para passwords
- **zod** para validacion
- **Docker** para dev local

## Setup rapido (con Docker - recomendado)

```bash
cd backend

# 1. Crear el archivo .env (ver ENV_SETUP.md para la plantilla)

# 2. Levantar Postgres + API
docker compose up -d

# 3. Ver logs
docker compose logs -f api

# 4. Probar
# GET http://localhost:4000/health
# GET http://localhost:4000/health/db
```

## Setup manual (sin Docker)

Necesitas Postgres 16 corriendo en tu maquina o accesible por red.

```bash
cd backend
npm install

# Cargar el esquema en tu Postgres:
psql -U postgres -d finanzapp -f db/schema.sql

# Crear .env con la plantilla de ENV_SETUP.md y rellenar valores

npm run dev
```

## Endpoints disponibles (Fase 1)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/health` | Status del servidor |
| GET    | `/health/db` | Status de la base de datos |
| POST   | `/api/v1/auth/register` | Crear usuario + workspace |
| POST   | `/api/v1/auth/login` | Iniciar sesion |
| POST   | `/api/v1/auth/refresh` | Renovar access token |
| POST   | `/api/v1/auth/logout` | Cerrar sesion |
| GET    | `/api/v1/auth/me` | Usuario autenticado |

Resto de endpoints (CRUD por entidad) -> **Fase 4** del roadmap.

## Probar el flujo de auth

Usa Postman, Insomnia, Thunder Client (VS Code) o tu cliente HTTP favorito.

### POST `/api/v1/auth/register`
Header: `Content-Type: application/json`
Body:
```json
{ "email": "test@finanzapp.io", "password": "demo1234", "nombre": "Test User" }
```
Respuesta: `{ user, workspace, accessToken, refreshToken }`

### POST `/api/v1/auth/login`
Header: `Content-Type: application/json`
Body:
```json
{ "email": "test@finanzapp.io", "password": "demo1234" }
```

### GET `/api/v1/auth/me`
Header: `Authorization: Bearer <accessToken>`

## Estructura

```
backend/
- src/
  - server.js              # Entry point
  - config/
    - env.js               # Variables de entorno
    - db.js                # Pool Postgres
  - middleware/
    - auth.js              # JWT verification
    - errorHandler.js      # 404 + error central
  - routes/
    - health.routes.js
    - auth.routes.js
  - services/              # (Fase 4) Logica de dominio
  - utils/                 # Helpers
- db/
  - schema.sql             # DDL completo (28 tablas)
  - migrations/            # (Fase 2) node-pg-migrate
- docker-compose.yml
- Dockerfile
- ENV_SETUP.md             # Como crear el .env
- package.json
```

## Variables de entorno

Ver [`ENV_SETUP.md`](./ENV_SETUP.md) para la plantilla completa.

## Proximas fases

- **Fase 2** - Migrations con `node-pg-migrate` + seed extendido
- **Fase 3** - Auth completo (verificacion email, reset password, 2FA opcional)
- **Fase 4** - CRUD para las 28 entidades
- **Fase 5** - Conectar el frontend (reemplazar `store.js` por `api-client.js`)
