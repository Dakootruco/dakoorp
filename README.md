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

La web se abre en http://127.0.0.1:5173. La API escucha en http://127.0.0.1:3001. GET /health comprueba el proceso y GET /api/activity comprueba la lectura de Supabase. El worker programa una comprobación por minuto en la cola de Supabase y consulta trabajos disponibles cada 5 segundos. La cola limita los intentos a tres y recupera trabajos cuyo bloqueo temporal vence. El panel actualiza cada 10 segundos.

Ctrl+C detiene el comando de desarrollo. Los eventos permanecen en Supabase. Al cerrar solamente el navegador, el worker continúa mientras su proceso siga ejecutándose.

## Compilación y vista previa

```bash
pnpm build
APP_ENV=development pnpm --filter @dakoorp/api start
```

En otra terminal, ejecutar APP_ENV=development pnpm --filter web preview y abrir http://127.0.0.1:4173. El worker compilado se arranca con pnpm --filter @dakoorp/worker start.

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

## Entornos de datos

APP_ENV selecciona development, test o production. El valor por defecto es development. API y worker cargan apps/api/.env.<entorno>; development acepta también el archivo histórico apps/api/.env cuando falta .env.development.

config/environments.json registra la URL pública del proyecto Supabase esperado por entorno. El proyecto actual está asignado a development. Test y production requieren proyectos propios y figuran pendientes. La validación rechaza proyectos repetidos, URLs de otro entorno y entornos sin registrar.

Para preparar test, crear un proyecto Supabase independiente, aplicar las migraciones y registrar su URL en config/environments.json. Copiar apps/api/.env.test.example a apps/api/.env.test y completar sus credenciales. El mismo procedimiento se aplica a production con su plantilla.

```bash
APP_ENV=test pnpm check:env
APP_ENV=test pnpm dev:all
APP_ENV=test pnpm worker:once
```

La web usa el puerto 5174 y la API 3002 en test. Development usa 5173 y 3001. Production usa 5175 y 3003 para pruebas locales, con preview en 4175. HOST y PORT permiten adaptar el backend al alojamiento.

Para compilar y ejecutar backend de producción, una vez configurado el proyecto correspondiente:

```bash
pnpm build
APP_ENV=production pnpm --filter @dakoorp/api start
APP_ENV=production pnpm --filter @dakoorp/worker start
```

Los despliegues pueden suministrar las credenciales como variables del proceso. El registro de URLs esperadas sigue aplicándose. NODE_ENV=production requiere APP_ENV explícito.

La web utiliza apps/web/.env.local en development y apps/web/.env.test.local o .env.production.local para el proxy de esos entornos. Sus plantillas están versionadas. La variable de proceso API_PROXY_TARGET tiene prioridad. El despliegue debe enrutar /api al backend del entorno correspondiente.

CI ejecuta pruebas con fixtures temporales y sin conexiones a Supabase. Las pruebas de integración con datos persistidos deben usar APP_ENV=test. Los datos de cada proyecto permanecen separados; las migraciones se aplican a cada proyecto y los fixtures se crean expresamente en pruebas.

La autenticación de usuarios sigue pendiente. El despliegue público se realizará al completar las tareas de acceso y autorización.

## Acceso privado

Crear el usuario propietario en Supabase Authentication y guardar su UUID como OWNER_USER_ID en el archivo del backend del entorno correspondiente. Añadir SUPABASE_PUBLISHABLE_KEY con la clave pública de ese mismo proyecto.

La pantalla de acceso utiliza correo y contraseña con Supabase Auth. La sesión se conserva en el navegador y se renueva mediante el SDK. La API valida el token contra Supabase y permite acceso únicamente al propietario configurado.

GET /api/auth-config publica la URL y clave pública del entorno. La clave secreta permanece en el backend. GET /health sigue siendo público. Las rutas de datos requieren Authorization: Bearer seguido del token de sesión.

Aplicar las migraciones nuevas de oficina y mercado para habilitar departamentos, agentes, tareas y candidatos. La entrada manual de candidatos acepta el mint de Solana y deduplica por red y dirección.

## Pruebas de navegador y base de datos

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Las pruebas de navegador simulan las respuestas de autenticación y datos mediante fixtures. Verifican el flujo de la interfaz y la persistencia de sesión. Las pruebas HTTP de la API comprueban rechazos de acceso con servicios simulados.

El job database de CI aplica las migraciones y ejecuta supabase/tests/*.sql sobre PostgreSQL 15 desechable. Cada prueba SQL revierte sus fixtures con rollback.

## Piloto sin consumo de IA de pago

Decisión aprobada el 21 de noviembre de 2026. El piloto usará datos de acceso gratuito confirmado y reglas programadas. El presupuesto de IA es USD 0 por ejecución, día y mes. No hace falta configurar OPENAI_API_KEY. La investigación automática por reglas está en desarrollo; el worker actual comprueba DEX Screener y guarda actividad.

Los servicios pagados requieren aprobación independiente. Consultar docs/DAK-004-presupuesto.md para la decisión vigente y las propuestas históricas.

## MVP de investigación y conversación local

Consulta [la guía del MVP](docs/MVP-local.md) para investigar candidatos, activar seguimiento y descubrimiento, consultar informes y conversar con agentes mediante Ollama. Aplica también `supabase/migrations/202611260001_research_mvp.sql` después de las migraciones anteriores. La investigación funciona sin modelo; el chat requiere el modelo local `qwen3:1.7b` y Ollama en `127.0.0.1:11434`.
