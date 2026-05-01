# FinanzApp

Aplicación de finanzas personales: gestiona cuentas bancarias, tarjetas de crédito, transacciones, deudas, suscripciones, metas, diezmo y más.

## Stack

- **JavaScript** vanilla (ESM)
- **Vite 6** como dev server y bundler
- **Chart.js** para gráficos
- **LocalStorage** con namespacing por workspace
- Integración opcional con **OpenAI** vía proxy de Vite

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Scripts

```bash
npm run dev       # arranca el dev server en http://localhost:5173
npm run build     # genera la build en dist/
npm run preview   # sirve la build de producción
```

## Estructura

```
src/
  pages/          # Vistas (dashboard, cuentas, tarjetas, deudas, etc.)
  *.js            # Motores: store, router, auth, balances, préstamos, planes, IA
styles/           # CSS modular por responsabilidad
index.html
vite.config.js
```

## Licencia

Privado.
