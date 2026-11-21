# DAK-007 · Compartir tipos y validaciones

- **Fecha** — 21 de noviembre de 2026.
- **Estado** — Implementado y verificado localmente.

packages/contracts contiene los esquemas activitySchema, activityInsertSchema y activityListSchema. Activity y ActivityInsert se infieren de los esquemas Zod.

El worker valida antes de persistir. La API valida antes de responder. La web valida antes de actualizar el estado. La forma pública de la respuesta conserva los campos existentes y elimina columnas adicionales.

Los esquemas aceptan timestamps ISO con UTC u offset, incluyendo precisión de microsegundos del historial. Los estados admitidos son success y error. La validación rechaza UUID inválido, fecha imposible, campos ausentes y tipos incorrectos.

Las pruebas automáticas cubren compatibilidad de inserción y lectura, historial vacío, registros históricos y rechazos. Los paquetes se enlazan mediante workspace:* y se compilan en orden de dependencias.
