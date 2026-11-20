# DAK-001 · Usuario y alcance inicial

- **Proyecto** — Dakoorp
- **Estado** — Aprobado
- **Fecha de aprobación** — 20 de noviembre de 2026
- **Criterio de finalización** — Existe un alcance aprobado.
- **Aprobación** — El propietario aceptó el alcance en la conversación del proyecto y solicitó guardarlo en este documento.

## Usuario principal

El propietario será el usuario y operador de la oficina. Podrá configurar agentes, consultar candidatos, asignar tareas, revisar resultados y resolver solicitudes de intervención.

La primera versión tendrá una cuenta de propietario y un departamento de investigación de memecoins en Solana. La estructura permitirá añadir departamentos más adelante.

## Objetivo

Detectar candidatos temprano, evaluar señales de riesgo con evidencia y seguir su evolución. Cada resultado mostrará las fuentes consultadas, la fecha del análisis y los datos pendientes.

## Funciones incluidas en la primera versión completa

- **Oficina isométrica con agentes pixelados.** Avatares seleccionables, escritorios y animaciones vinculadas al estado real del trabajo.
- **Tres agentes especializados.** Descubrimiento, riesgo y seguimiento, con instrucciones y herramientas propias.
- **Monitoreo continuo.** Ejecución en un servidor, incluso cuando el propietario cierre la aplicación.
- **Gestión de candidatos.** Lista de tokens y pools con filtros, métricas e historial de evaluaciones.
- **Gestión de tareas.** Asignación, seguimiento, cancelación y solicitudes de intervención.
- **Colaboración observable.** Registro de delegaciones, resultados y dependencias entre agentes.
- **Simulación de operaciones.** Registro de entradas, salidas y resultados con costes estimados.
- **Alertas configurables.** Avisos sobre candidatos y cambios relevantes.
- **Acceso privado y operación fiable.** Autenticación, permisos, registros de errores y recuperación ante fallos.

## Decisiones aprobadas

| Tema | Alcance |
|---|---|
| Dispositivo principal | Navegador de escritorio |
| Red inicial | Solana |
| Departamento inicial | Investigación y seguimiento de memecoins |
| Autonomía | Consulta, análisis, seguimiento y simulación automáticos |
| Intervención del propietario | Cambiar criterios, asignar tareas y resolver aprobaciones |
| Operaciones con fondos reales | Fase posterior con alcance y autorización propios |
| Configuración de agentes | Instrucciones, herramientas y reglas versionadas |
| Entrenamiento específico | Condicionado a resultados de evaluación |
| Protocolos y fuentes concretas | Se definirán en DAK-003 |
| Criterios de oportunidad temprana | Se definirán en DAK-002 |

## Criterio de aceptación del producto

El propietario podrá entrar en Dakoorp, ver qué hacen los tres agentes, abrir un candidato detectado por el sistema, consultar su evaluación y evidencia, seguir su evolución y revisar operaciones simuladas.

La actividad continuará al cerrar el navegador y conservará su historial.

## Seguimiento

DAK-001 queda completada con la aprobación de este alcance. La implementación de las funciones descritas se seguirá mediante las tareas correspondientes del backlog.

Las siguientes definiciones del producto son DAK-002, criterios de oportunidad temprana, y DAK-003, protocolos y fuentes de Solana.
