# DAK-006 · Configuración, plantillas y comandos

- **Estado** — Completado para el entorno local implementado.
- **Fecha** — 20 de noviembre de 2026.
- **Criterio** — Un entorno nuevo arranca siguiendo el README.

## Entrega

- README con instalación, configuración, migración, verificación, desarrollo y preview.
- Node 22.23.4 en .nvmrc y engines; pnpm 10.32.1 fijado en packageManager.
- Plantillas apps/api/.env.example y apps/web/.env.example.
- Validador check:env que rechaza valores de ejemplo, URL inválida, clave vacía y puerto fuera de rango sin imprimir secretos.
- API y worker validan configuración al arrancar.
- Variables del entorno del proceso tienen prioridad sobre archivos locales.
- API y worker comparten apps/api/.env para conservar la configuración existente.
- Proxy de Vite configurable mediante API_PROXY_TARGET, tanto en desarrollo como en preview.
- Comando dev:all para ejecutar web, API y worker juntos.

## Verificación realizada

Se copió el código a un directorio temporal limpio, excluyendo Git, dependencias, artefactos de compilación y archivos locales de entorno.

1. pnpm install --frozen-lockfile terminó correctamente.
2. La configuración de ejemplo fue rechazada con mensajes sobre las variables pendientes.
3. La configuración real existente pasó la validación.
4. pnpm build compiló web, API y worker.
5. pnpm worker:once ejecutó una consulta y guardó un evento real.
6. La API y Vite arrancaron con un puerto de API alternativo y proxy configurado.
7. La web respondió HTTP 200 y el proxy recuperó 50 eventos de Supabase.
8. Los procesos de prueba se detuvieron y se eliminó la copia temporal de las credenciales.

Se utilizó el proyecto Supabase existente con su migración ya aplicada. La ejecución de SQL en un proyecto Supabase nuevo queda descrita en el README. La comprobación web fue HTTP; la revisión visual está en DAK-054 y DAK-079.

El presupuesto de DAK-004 es una especificación propuesta. Su control automático se implementará con la orquestación de agentes.
