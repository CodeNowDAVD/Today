# Integrar cambios de Today → SOrbitS

Cuando Spacework y Hoy estén listos en este repo, el merge es por **módulos**, no por copia del proyecto entero.

## Backend

Paquetes que viven aquí y en `sorbits/backend`:

```
site/sorbits/spacework/
site/sorbits/life/
```

Pasos sugeridos:

1. Diff por paquete:
   ```bash
   diff -ru sorbits/backend/src/main/java/site/sorbits/spacework \
              today/backend/src/main/java/site/sorbits/spacework
   diff -ru sorbits/backend/src/main/java/site/sorbits/life \
              today/backend/src/main/java/site/sorbits/life
   ```
2. Copiar o cherry-pick solo los archivos tocados.
3. Si hay migraciones SQL nuevas en Today, añadirlas en `sorbits/deploy/termux/` y en Flyway si aplica.
4. **No** copiar `TodayApplication.java` ni `DevSeedConfig.java` a producción.

## Frontend

Archivos principales a sincronizar:

```
frontend/src/Spacework*.tsx
frontend/src/spacework*
frontend/src/life/
frontend/src/WorkspaceChrome.tsx
frontend/src/AddToSpaceworkDialog.tsx
```

Y las funciones relacionadas en `api.ts` (spacework + life).

El `App.tsx` de Today es **solo sandbox**; en SOrbitS los paneles siguen montados desde el `App.tsx` completo.

## Checklist antes del merge

- [ ] `mvn test` en today/backend
- [ ] `npm run build` en today/frontend
- [ ] Probar flujos: crear espacio personal, Hoy, promover a TEAM, proyecto colaborativo, kanban SSE
- [ ] Revisar que no queden referencias solo-dev (`DevSeedConfig`, puertos 8082)
