# DAK-009 · Desarrollo, pruebas y producción

- **Fecha** — 21 de noviembre de 2026.
- **Estado** — Parcial. Configuración y validaciones implementadas; proyectos de datos de test y production pendientes.
- **Criterio** — Configuración y datos propios por entorno.

## Diseño

APP_ENV selecciona development, test o production. API y worker comparten el cargador scripts/environment.mjs, ejecutado antes de sus módulos de entrada mediante scripts/load-env.mjs.

Cada entorno dispone de archivo apps/api/.env.<entorno>, puerto predeterminado y URL esperada en config/environments.json. Los valores del proceso tienen prioridad, sujetos a validación de identidad del entorno.

Se asignó el proyecto Supabase existente a development como decisión de implementación. Su archivo histórico apps/api/.env sigue soportado exclusivamente en ese entorno.

Test y production requieren proyectos propios. Las URLs pendientes permanecen como null en el registro. El arranque de esos entornos queda bloqueado hasta configurarlos.

Las URLs del registro son identificadores públicos; las claves permanecen en archivos ignorados o en variables del alojamiento.

## Separación de datos

| Entorno | Uso | Proyecto |
|---|---|---|
| development | Desarrollo y comprobaciones manuales | Proyecto Supabase existente |
| test | Integración y fixtures | Pendiente de crear y aplicar migraciones |
| production | Datos operativos del propietario | Pendiente de crear y aplicar migraciones |

Los tres proyectos reciben las mismas migraciones versionadas. Los datos y las credenciales se administran por separado. CI utiliza fixtures temporales y carece de acceso a estos proyectos.

## Comportamiento verificado

- Carga de tres configuraciones distintas mediante fixtures.
- Rechazo de URL de otro entorno.
- Rechazo de proyectos duplicados en el registro.
- Rechazo de nombres de entorno desconocidos.
- Rechazo de NODE_ENV=production sin APP_ENV.
- Rechazo de entornos sin proyecto registrado.
- Compatibilidad con el archivo histórico de desarrollo.
- Variables de alojamiento admitidas sin archivo local.
- Compilación, análisis estático y pruebas automáticas.
- Escritura real del worker con la configuración de desarrollo.

La web dispone de puertos y archivos de proxy por entorno. Las variables de proxy pertenecen al servidor Vite. El hosting de producción deberá conectar /api al backend correspondiente.

## Pasos pendientes

1. Crear proyectos Supabase independientes para test y production, o proporcionar proyectos ya existentes destinados a estos usos.
2. Aplicar supabase/migrations/202611200001_activity_events.sql en cada proyecto nuevo.
3. Registrar sus URLs en config/environments.json.
4. Completar apps/api/.env.test y apps/api/.env.production desde sus plantillas, o configurar variables del alojamiento.
5. Ejecutar APP_ENV=test pnpm check:env y APP_ENV=test pnpm worker:once.
6. Comprobar lectura y escritura separadas en ambos proyectos y ausencia del evento de prueba en el resto.

La sesión dispone de una clave de datos del proyecto actual. La creación de proyectos requiere acceso de administración de Supabase que todavía no está disponible. El coste de proyectos adicionales debe incluirse en DAK-004.

La tarea se cerrará después de verificar los datos aislados en los tres entornos.
