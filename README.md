# Dakoorp

Oficina virtual de agentes. La versión actual incluye una web de actividad, una API local y un worker que consulta pares de SOL en DEX Screener y guarda el resultado en Supabase.

## Requisitos

- Node.js 22.23.4, indicado en .nvmrc.
- pnpm 10.32.1, indicado en packageManager.
- Proyecto de Supabase y su clave privada de backend.
- Conexión a Internet para instalación, Supabase y DEX Screener.

Con nvm instalado se puede ejecutar nvm install y nvm use desde esta carpeta. Instalar pnpm 10.32.1 mediante npm install --global pnpm@10.32.1 si hace falta.

## Instalación

Clonar el repositorio y entrar en su carpeta.

```bash
git clone https://github.com/Dakootruco/dakoorp.git
cd dakoorp
pnpm install --frozen-lockfile
```

Crear la configuración local solo cuando los archivos todavía no existan.

```bash
cp -n apps/api/.env.example apps/api/.env
cp -n apps/web/.env.example apps/web/.env.local
```

Editar apps/api/.env con la URL del proyecto y la clave secreta. API y worker comparten este archivo en desarrollo. Las variables del entorno del proceso tienen prioridad y permiten configurar despliegues sin archivos locales.

La web actual usa la API. API_PROXY_TARGET configura el proxy de desarrollo y preview. Las variables VITE_SUPABASE_* de instalaciones anteriores pueden permanecer en el entorno, aunque esta versión usa el backend para consultar actividad. El proxy mantiene la clave secreta en el proceso servidor.

Los archivos .env están ignorados por Git. Las plantillas .env.example se versionan.

## Preparar Supabase

En un proyecto nuevo, ejecutar en SQL Editor el archivo supabase/migrations/202611200001_activity_events.sql. Aplicarlo una sola vez. En el proyecto existente de Dakoorp ya se aplicó.

La tabla permite acceso al backend mediante service_role y tiene RLS habilitado. Una clave de API permite usar la tabla existente. Aplicar migraciones requiere el editor SQL o credenciales administrativas de base de datos.

## Verificación inicial

```bash
pnpm check:env
pnpm build
pnpm worker:once
```

check:env valida configuración y formatos sin imprimir valores secretos. worker:once realiza una consulta real y escribe un evento. Un estado success confirma respuesta válida de DEX Screener y persistencia. Un evento error significa que la consulta de mercado falló y su resultado quedó registrado. Un fallo de escritura termina con código de salida 1.

## Desarrollo

Arrancar los tres procesos en una terminal.

```bash
pnpm dev:all
```

También pueden ejecutarse por separado.

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev
```

La web se abre en http://127.0.0.1:5173. La API escucha en http://127.0.0.1:3001. GET /health comprueba el proceso y GET /api/activity comprueba la lectura de Supabase. El worker consulta cada 60 segundos después de terminar el ciclo previo. El panel actualiza cada 10 segundos.

Ctrl+C detiene el comando de desarrollo. Los eventos permanecen en Supabase. Al cerrar solamente el navegador, el worker continúa mientras su proceso siga ejecutándose.

## Compilación y vista previa

```bash
pnpm build
pnpm --filter @dakoorp/api start
```

En otra terminal, ejecutar pnpm --filter web preview y abrir http://127.0.0.1:4173. El worker compilado se arranca con pnpm --filter @dakoorp/worker start.

El alojamiento de producción deberá configurar el enrutamiento /api. El acceso autenticado a la aplicación está pendiente en DAK-015 y DAK-016; estos comandos están preparados para uso local.

## Problemas habituales

| Síntoma | Acción |
|---|---|
| Validación de variables falla | Revisar apps/api/.env y reemplazar los valores de ejemplo |
| Supabase devuelve 404 en el worker | Comprobar la migración y que el proyecto de la URL sea el correcto |
| Supabase devuelve 401 o 403 | Verificar clave privada, permisos y proyecto |
| Web muestra error de actualización | Arrancar la API y revisar API_PROXY_TARGET |
| Puerto ocupado | Detener el proceso previo o cambiar PORT y el destino del proxy |
| Evento con estado error | Revisar disponibilidad de DEX Screener y acceso a Internet |

## Estructura

- apps/web contiene React y Vite.
- apps/api contiene Express y la consulta de actividad.
- apps/worker contiene el monitor periódico.
- supabase/migrations contiene el esquema versionado.
- docs contiene alcance, criterios, fuentes y presupuesto.

## Contratos compartidos y comprobaciones

packages/contracts define los tipos y validadores Zod para los eventos de actividad. El worker valida cada inserción, la API valida las filas recuperadas y la web valida la respuesta antes de actualizar el panel. Los tipos se infieren de los esquemas.

pnpm build compila primero los contratos según las dependencias del workspace. Los comandos de arranque compilan también ese paquete. Después de editar un contrato durante desarrollo, reiniciar los procesos para reconstruirlo.

```bash
pnpm check
```

Este comando ejecuta análisis estático, compilación y pruebas automáticas. También están disponibles pnpm lint y pnpm test. Las pruebas de contratos utilizan datos locales y pueden ejecutarse sin credenciales.

.github/workflows/ci.yml ejecuta pnpm check en cada push y pull request, y permite ejecución manual desde GitHub Actions. El primer resultado remoto estará disponible después de subir el workflow.
