# Electron Setup for MediPOS

## 1) Install dependencies

```bash
npm install
```

## 2) Run desktop app in development

This command starts:
- backend (`backend/index.js`)
- Next.js frontend (default `http://127.0.0.1:3000`)
- Electron shell window

```bash
npm run dev:desktop
```

## 3) Build desktop installer (Windows)

```bash
npm run build:desktop
```

Build output is generated in:

`desktop-dist/`

## Notes

- Frontend server in desktop mode uses `FRONTEND_PORT` (default `3000`).
- Backend server in desktop mode uses `BACKEND_PORT` (default `8080`).
- Electron binds dev servers with `ELECTRON_BIND_HOST` (default `0.0.0.0`).
- Electron loads frontend URL host from `ELECTRON_APP_HOST` (default `127.0.0.1`).
- You can override these before running commands (PowerShell):

```bash
$env:FRONTEND_PORT=3001
$env:BACKEND_PORT=8081
$env:ELECTRON_BIND_HOST="0.0.0.0"
$env:ELECTRON_APP_HOST="127.0.0.1"
npm run dev:desktop
```

- You can also override the full URL directly:

```bash
$env:ELECTRON_START_URL="http://127.0.0.1:3000"
npm run dev:desktop
```
