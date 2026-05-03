# FinanzApp - Architecture & Roadmap

> Documento maestro del rediseno enterprise. Generado en Fase 1.

## Tabla de contenido

1. [Estado actual](#estado-actual)
2. [Arquitectura objetivo](#arquitectura-objetivo)
3. [Decisiones tecnicas](#decisiones-tecnicas)
4. [Roadmap por fases](#roadmap-por-fases)
5. [Contrato de API (v1)](#contrato-de-api-v1)
6. [Modelo de datos](#modelo-de-datos)
7. [Seguridad](#seguridad)
8. [Despliegue](#despliegue)
9. [Pendientes y decisiones del usuario](#pendientes-y-decisiones-del-usuario)

---

## Estado actual

| Metrica | Valor |
|---------|-------|
| LOC JavaScript | 12,431 |
| Paginas frontend | 23 |
| Llamadas acopladas a localStorage/store | 309 |
| Entidades en localStorage | ~28 |
| Backend existente | 0 |
| Multi-tenant real | No (todo es localStorage local) |
| Auth real | No (passwords en cliente) |

### Problemas criticos que resuelve este rediseno

1. Datos viven solo en el navegador del usuario - no hay sincronizacion entre dispositivos
2. Cualquier usuario puede modificar saldos, planes y permisos abriendo DevTools
3. El "multi-tenant" es ficticio: solo cambia un prefijo en localStorage
4. No hay forma de tener `nombre.com/admin` real porque no hay servidor
5. No se puede vender como SaaS porque cada cliente tiene un universo aislado

---

## Arquitectura objetivo

```
                     +---------------------------+
                     |   PostgreSQL 16           |
                     |   (Hosting central)       |
                     +-------------+-------------+
                                   |
                     +-------------+-------------+
                     |   Node.js + Express API   |
                     |   /api/v1/*               |
                     |   JWT + rate limit + CORS |
                     +---+----------+--------+---+
                         |          |        |
              +----------+      +---+--+     +------+
              |                 |      |            |
       +------+------+    +-----+--+ +-+----+ +-----+----+
       | Web (Vite)  |    | Tauri  | | Caps. | | Caps.    |
       | nombre.com  |    | .exe   | | APK   | | iOS .ipa |
       +-------------+    +--------+ +-------+ +----------+
```

### Reglas duras

- **NO** hay base de datos local independiente por plataforma
- **TODO** pasa por la API
- **Una** sola base de datos
- Las apps son clientes "tontos" del backend

---

## Decisiones tecnicas

| Capa | Decision | Por que |
|------|----------|---------|
| Runtime backend | Node.js 20 + Express 4 | Mismo lenguaje que el frontend, ecosistema maduro, corre en cualquier hosting |
| BD | PostgreSQL 16 | JSONB, transacciones ACID, mejor que MySQL para datos financieros |
| Driver BD | `pg` con SQL crudo | Control y performance predecibles, sin magia de ORM |
| Auth | JWT access (15min) + refresh rotativo (30d) | Stateless, escalable, refresh evita relogin |
| Hash passwords | argon2id | OWASP 2024 recomendado |
| Validacion | zod | Type-safe, parseo + validacion en una llamada |
| Hardening | helmet + rate-limit | Cabeceras seguras, anti-brute-force |
| Migraciones | node-pg-migrate | Versionadas, con rollback |
| Web frontend | Mantener vanilla + Vite | Reescribir UI seria innecesario; solo cambiar la capa de datos |
| Desktop | Tauri 2 | Binario ~5MB vs Electron ~150MB |
| Mobile | Capacitor 6 | Envuelve la web app actual sin reescribir |
| Hosting backend | Railway o Render | Postgres incluido, deploy por git push, $5/mes |
| Hosting frontend | Vercel o Netlify | Gratis, CDN global, deploy por git push |
| Containerizacion | Docker + docker-compose | Dev local = produccion |

### Lo que NO usamos y por que

- **MongoDB** - datos financieros son relacionales por naturaleza
- **Electron** - obsoleto vs Tauri (10x mas pesado)
- **React Native** - duplicar UI cuando ya tenemos web
- **Laravel/Django** - cambiar de lenguaje aumenta el costo de mantenimiento
- **GraphQL** - REST es suficiente y mas simple para este dominio
- **ORM pesado (Sequelize/Prisma)** - este equipo aun no necesita esa abstraccion

---

## Roadmap por fases

| # | Fase | Entregables | Tiempo |
|---|------|-------------|--------|
| 1 | Audit + esqueleto (HOY) | Doc, schema BD, API contract, server.js, auth basico, Docker | 4-6h |
| 2 | DB completa | Migrations con node-pg-migrate, seeds, indices verificados | 6-10h |
| 3 | Auth completo | Email verification, password reset, 2FA opcional | 8-12h |
| 4 | CRUD API completo | ~150 endpoints REST para 28 entidades | 30-50h |
| 5 | Frontend conectado | Reemplazar `store.js` por `api-client.js`, manejo loading/error | 25-40h |
| 6 | Migracion + tests | Importar localStorage existente, tests integracion | 15-25h |
| 7 | Mobile (Capacitor) | APK Android instalable | 10-15h |
| 8 | Desktop (Tauri) | .exe Windows | 8-12h |
| 9 | DevOps | CI/CD GitHub Actions, deploy automatico, monitoring | 10-15h |
| 10 | Hardening final | Pen test basico, docs ops, hardening produccion | 8-12h |

**Total estimado: 120-200 horas**

---

## Contrato de API (v1)

### Convenciones

- Base URL: `https://api.finanzapp.com/api/v1`
- Auth: `Authorization: Bearer <accessToken>` en cada request autenticado
- Workspace activo: `X-Workspace-Id: <uuid>` (excepto en auth y health)
- Formato: JSON. Money en `NUMERIC` con 2 decimales (string en respuesta para no perder precision)
- Errores: `{ "error": "code", "message": "...", "details": [] }`
- Paginacion: `?page=1&limit=50` -> respuesta `{ data, total, page, limit }`

### Endpoints

#### Auth (publicos / mixtos)
| Metodo | Ruta | Auth |
|--------|------|------|
| POST | `/auth/register` | publico |
| POST | `/auth/login` | publico |
| POST | `/auth/refresh` | refresh token |
| POST | `/auth/logout` | autenticado |
| GET  | `/auth/me` | autenticado |
| POST | `/auth/verify-email/:token` | publico (Fase 3) |
| POST | `/auth/forgot-password` | publico (Fase 3) |
| POST | `/auth/reset-password/:token` | publico (Fase 3) |

#### Workspaces
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/workspaces` | Lista workspaces del usuario |
| POST   | `/workspaces` | Crea nuevo workspace |
| PATCH  | `/workspaces/:id` | Actualiza |
| DELETE | `/workspaces/:id` | Soft delete |
| GET    | `/workspaces/:id/members` | Miembros |
| POST   | `/workspaces/:id/members` | Invitar |
| PATCH  | `/workspaces/:id/members/:userId` | Cambiar rol |
| DELETE | `/workspaces/:id/members/:userId` | Quitar |

#### Recursos de negocio (todos requieren `X-Workspace-Id`)

Patron CRUD estandar para cada uno:
- `GET    /<entidad>` - lista paginada (con filtros via query)
- `GET    /<entidad>/:id` - detalle
- `POST   /<entidad>` - crear
- `PATCH  /<entidad>/:id` - actualizar
- `DELETE /<entidad>/:id` - eliminar

Entidades:
- `/banks`
- `/accounts`
- `/cards`
- `/external-cards`
- `/categories`
- `/beneficiaries`
- `/transactions` (con `?cuentaId=` `?tarjetaId=` `?fechaDesde=` `?fechaHasta=`)
- `/subscriptions`
- `/subscriptions/:id/charges`
- `/debts`
- `/debts/:id/payments`
- `/loans`
- `/loans/:id/payments`
- `/receivables`
- `/payables`
- `/goals`
- `/goals/:id/contributions`
- `/tithe`
- `/notes`
- `/notifications` (+ `PATCH /notifications/:id/read`)
- `/settings`

#### Admin (solo `is_super_admin`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET    | `/admin/users` | Todos los usuarios del sistema |
| PATCH  | `/admin/users/:id/status` | Suspender/activar |
| POST   | `/admin/users/:id/force-reset` | Forzar cambio password |
| GET    | `/admin/audit-logs` | Logs de auditoria |
| GET    | `/admin/plans` | Gestion de planes |
| POST   | `/admin/plans` | Crear plan |
| PATCH  | `/admin/plans/:id` | Modificar plan |

---

## Modelo de datos

Ver [`backend/db/schema.sql`](./backend/db/schema.sql) para el DDL completo.

### Decisiones de modelado

- **PK = UUID v4** generadas en el server (`gen_random_uuid()` de pgcrypto)
- **`workspace_id` en cada tabla de negocio** - aislamiento multi-tenant a nivel de query
- **Timestamps** `created_at` / `updated_at` con trigger automatico
- **Soft delete** (`deleted_at NULL`) en `workspaces` (preservar historico)
- **Dinero como `NUMERIC(14,2)`** - jamas usar `float`/`double` para dinero
- **JSONB** para campos flexibles: `settings`, `metadata`, `beneficiarios`, `limites` de plan
- **Indices** en cada FK y en columnas usadas en `WHERE` frecuentes (workspace_id, fecha)
- **CITEXT** para emails - case-insensitive con uniqueness

### Aislamiento multi-tenant

Todas las queries de negocio incluyen `WHERE workspace_id = $1`. La verificacion de pertenencia ocurre en el middleware: si el usuario no es miembro del workspace solicitado, se rechaza con 403.

Para mayor seguridad en el futuro: Row-Level Security (RLS) de Postgres.

---

## Seguridad

| Capa | Mecanismo |
|------|-----------|
| Transporte | HTTPS obligatorio en produccion |
| Auth | JWT firmado HS256, secrets de 64 bytes, rotacion de refresh tokens |
| Passwords | argon2id (memory=64MB, iterations=3, parallelism=4) |
| SQL Injection | Queries parametrizadas, jamas concatenacion de strings |
| XSS | helmet (CSP, X-Content-Type-Options), sanitizacion en frontend |
| CSRF | SameSite cookies + tokens en headers (no en cookies sin SameSite) |
| Rate limiting | 100 req / 15min global, mas estricto en `/auth/login` (Fase 3) |
| CORS | Lista blanca de origenes via env |
| Secrets | Variables de entorno, jamas en codigo |
| Audit | Tabla `audit_logs` con todas las acciones admin |

### Pendientes de Fase 10

- Pen test basico (OWASP Top 10)
- Logging estructurado (pino) + agregacion (Logtail/Datadog)
- Backup automatico de Postgres
- Plan de recuperacion ante desastres

---

## Despliegue

### Dev local
```
docker compose up -d  (en backend/)
npm run dev           (en raiz, para el frontend)
```

### Staging y Produccion (recomendado)

| Componente | Servicio | Costo aprox |
|------------|----------|-------------|
| Backend | Railway o Render | $5-10 USD/mes |
| Postgres | Incluido en Railway/Render | incluido |
| Frontend | Vercel o Netlify | gratis |
| Dominio | Namecheap, Cloudflare, etc | $10/ano |
| Apple Dev (solo si iOS) | Apple | $99/ano |

### Alternativa cPanel/VPS

Es viable si tu hosting (Hostinger, Bluehost, Namecheap) soporta Node.js. Pasos generales:

1. Subir el contenido de `backend/` via FTP/SSH
2. `npm ci --omit=dev` en el servidor
3. Configurar Postgres (la mayoria de cPanel tiene MySQL pero no Postgres - habria que usar VPS)
4. Configurar reverse proxy (nginx/Apache) hacia el puerto 4000
5. Usar PM2 o systemd para mantener el proceso vivo

**Honestamente**: Railway o Render son 10x mas simples y profesionales. El cPanel tradicional no es ideal para Node + Postgres.

---

## Pendientes y decisiones del usuario

Para desbloquear las fases 2-10 necesito:

| # | Decision | Impacto |
|---|----------|---------|
| 1 | Hosting backend: Railway? Render? VPS Hostinger? | Bloquea Fase 9 |
| 2 | Dominio elegido | Bloquea Fase 9 |
| 3 | Quieres iOS? (requiere $99/ano + Mac) | Bloquea parte de Fase 7 |
| 4 | Idiomas adicionales? (hoy es solo espanol) | Afecta Fase 5 |
| 5 | Migrar los datos existentes en localStorage de tu cuenta de prueba? | Afecta Fase 6 |
| 6 | Email transaccional para verificacion (Resend? SendGrid?) | Bloquea Fase 3 (verificacion) |
| 7 | Stripe/PayPal para cobrar planes? | Fase futura post-roadmap |

Mientras decides estos puntos podemos avanzar con Fases 2, 3, 4, 5 que no dependen de hosting.

---

## Como continuar

Una vez aprobada la Fase 1, dime "**continua a Fase 2**" y procedo con:

- Migrations versionadas (`node-pg-migrate`)
- Seeds extendidos con datos demo (banco, cuentas, transacciones de ejemplo)
- Validacion del schema con queries de prueba
- Refinamiento de indices despues de medir
