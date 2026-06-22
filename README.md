# Today
<<<<<<< HEAD
=======

Sandbox local para pulir **Spacework** y **Vida → Hoy** antes de integrar de vuelta en [SOrbitS](../sorbits).

Código extraído de `sorbits/` (mismos paquetes Java `site.sorbits.*` para facilitar el merge).

## Arranque rápido

### 1. Backend (puerto 8082)

```bash
cd backend
mvn spring-boot:run
```

Perfil `dev` por defecto: H2 en `backend/data/today-dev`, `ddl-auto=update`.

**Usuario demo:** `demo` / `demo` (se crea al primer arranque).

### 2. Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 — proxy `/api` → `http://127.0.0.1:8082`.

## Qué incluye

| Área | Backend | Frontend |
|------|---------|----------|
| **Spacework** | `site.sorbits.spacework.*` | `SpaceworkPanel`, kanban, wiki, chat, … |
| **Hoy / Vida** | `site.sorbits.life.*` | `life/LifePanel`, captura, contactos |
| Soporte | auth, user, files, links, folders, tags, notification, mail, apitoken | Login, preview de archivos, API client |

## Qué NO incluye (a propósito)

- Bóveda completa SOrbitS (admin, APS, búsqueda global, automatizaciones)
- Deploy Termux / producción

## Integración a SOrbitS

Ver [INTEGRATION.md](./INTEGRATION.md).

## Variables útiles

| Variable | Default |
|----------|---------|
| `TODAY_PORT` | `8082` |
| `TODAY_UPLOAD_DIR` | `~/var/today-vault/uploads` |
| `TODAY_TIMEZONE` | `America/Mexico_City` |
| `JWT_SECRET` | dev placeholder |
# Today
>>>>>>> 9167f94 (first commit)
