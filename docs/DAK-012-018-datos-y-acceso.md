# Datos de mercado, acceso privado y API

Fecha de actualización — 21 de noviembre de 2026.

## Estado por tarea

| Tarea | Implementación | Pendiente |
|---|---|---|
| DAK-012 | Tokens, pools, observaciones y evaluaciones en migración SQL | Tablas verificadas en Supabase; validar el flujo de investigación completo |
| DAK-013 | Identidad única por red/dirección, candidato único por token y RPC atómica de registro | Verificación remota |
| DAK-014 | Índices por entidad, estado y fecha; API con limit y offset acotados | Política de conservación y pruebas de volumen |
| DAK-015 | Inicio de sesión por contraseña y persistencia mediante Supabase Auth | Verificación con sesión real del propietario |
| DAK-016 | API valida sesión y UUID del propietario; tablas con RLS y acceso del backend | Políticas directas de usuario si se incorpora Realtime |
| DAK-017 | Credenciales en servidor y plantillas por entorno | Permisos por herramienta cuando se integren los agentes |
| DAK-018 | Listas de oficina y candidatos, creación de tareas, cambio de responsable/estado, historial y resultados | Orquestación, detalle de candidatos y pruebas remotas |
| DAK-053 | Navegación inicial entre candidatos, tareas y agentes | Oficina isométrica inicial disponible; resto de pantallas pendiente |
| DAK-055 | Registro manual y listado paginado de candidatos | Búsqueda, filtros y ordenación configurables |
| DAK-058 | Crear y consultar tareas; cancelación de estado en tareas pendientes o en espera | Cancelación coordinada con ejecución y cola |

## Datos

La migración 202611210002_market_model.sql incorpora tokens, pools, market_observations, candidates y evaluations. Las claves compuestas verifican las relaciones entre candidato, token base del pool y observación.

Los valores desconocidos de mercado permanecen null. Los timestamps de recepción y observación son independientes. La ventana de cinco minutos indica explícitamente si la cobertura está completa.

Las observaciones y evaluaciones se insertan con evidencia y versión. La identidad de fuente y evento evita observaciones duplicadas. El historial de candidatos se registra automáticamente en office_history.

La función register_candidate agrupa el alta de token y candidato en una transacción. Los reintentos recuperan el mismo candidato y preservan su origen inicial.

Las pruebas SQL verifican deduplicación y conservación de observaciones. Las migraciones funcionan en PostgreSQL 15 aislado. La aplicación remota requiere SQL Editor.

## Acceso

Se verificó mediante lectura autenticada que OWNER_USER_ID corresponde a un usuario del proyecto existente. La clave pública previamente configurada se incorporó al entorno local del backend para servir la configuración de acceso al navegador.

Los endpoints de datos requieren una sesión verificada con Supabase y coincidencia con OWNER_USER_ID. El propietario se configura por entorno. La ausencia de configuración devuelve 503; sesión inválida devuelve 401; otro usuario devuelve 403.

La autorización de API utiliza service_role para acceder a los datos después de validar al propietario. Las tablas mantienen RLS y permisos restrictivos para acceso directo. Este modelo corresponde a la oficina privada de un solo propietario aprobada en DAK-001.

## API actual

| Método | Ruta | Uso |
|---|---|---|
| GET | /health | Estado del proceso y entorno |
| GET | /api/auth-config | URL y clave pública de Supabase |
| GET | /api/activity | Actividad paginada |
| GET | /api/departments | Departamentos |
| GET | /api/agents | Agentes |
| GET | /api/tasks | Tareas |
| GET | /api/candidates | Candidatos con token |
| POST | /api/candidates | Registro manual deduplicado |
| POST | /api/tasks | Crear tarea pendiente |
| PATCH | /api/tasks/:id | Cambiar asignación o estado |
| GET | /api/tasks/:id/history | Historial de tarea |
| GET | /api/tasks/:id/results | Entregables de tarea |

Las listas tienen límite máximo de 100 y orden estable por fecha e ID. La paginación por offset puede desplazarse cuando entran registros nuevos; la navegación representa el estado actual del listado.

## Retención pendiente de decisión operativa

Propuesta inicial de conservar indefinidamente tareas, asignaciones, ejecuciones, entregables y evaluaciones durante el piloto. Las observaciones de mercado y actividad se medirán durante el piloto para establecer una ventana de conservación y archivo.

La limpieza futura deberá preservar cualquier observación referenciada por una evaluación. El crecimiento se medirá antes de aprobar o ejecutar borrados. DAK-014 permanece parcial hasta fijar y verificar esa política.

## Avance del 21 de noviembre

La migración de cola está aplicada y la lectura autenticada de jobs devuelve HTTP 200. GET /api/agents/:id/work entrega las últimas 20 tareas, 10 ejecuciones y 20 entregables asociados a esas ejecuciones. El panel de agente muestra estos datos al seleccionarlo en la oficina. Estas ventanas son limitadas y no constituyen un historial completo.
