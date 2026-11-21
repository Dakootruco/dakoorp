# DAK-008 · Integración continua

- **Fecha** — 21 de noviembre de 2026.
- **Estado** — Configuración implementada y comprobaciones locales aprobadas. Primera ejecución remota pendiente de subir los cambios.

GitHub Actions ejecuta el workflow CI en push, pull_request y workflow_dispatch. Tiene permisos de lectura del repositorio, límite de diez minutos y cancelación de ejecuciones anteriores de la misma referencia.

Utiliza Node indicado en .nvmrc, pnpm indicado en packageManager, caché de dependencias e instalación con frozen-lockfile.

pnpm check ejecuta Oxlint sobre aplicaciones, contratos y scripts, compila todos los paquetes y ejecuta las pruebas de contratos con el runner de Node.

Las pruebas trabajan con datos locales y la compilación funciona sin claves de Supabase. Las comprobaciones de servicios externos se ejecutan por separado con el entorno local.

La revisión visual, las pruebas de agentes futuros y la protección de ramas se gestionan en las tareas correspondientes cuando esas funciones estén disponibles.
