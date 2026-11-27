# DAK-004 · Presupuestos de infraestructura, datos e IA

- **Fecha** — Actualizado el 21 de noviembre de 2026.
- **Estado** — Inicio sin consumo de IA de pago aprobado por el propietario. Presupuestos de servicios pagados pendientes de aprobación.
- **Criterio** — Límites mensuales y por ejecución documentados.
- **Moneda** — USD; cifras de planificación antes de impuestos y conversión bancaria.
- **Aplicación** — Los límites descritos requieren implementación en las tareas de orquestación y observabilidad. El worker actual realiza consultas de mercado y persistencia.

## Decisión vigente aprobada

El 21 de noviembre de 2026 el propietario aprobó comenzar sin consumo de IA de pago.

| Concepto | Límite vigente |
|---|---:|
| IA por investigación, incluidos reintentos | USD 0 |
| IA diaria | USD 0 |
| IA mensual | USD 0 |
| Llamadas a modelos de pago | 0 |
| Entrenamiento de modelos de pago | USD 0 |

La primera versión obtiene datos desde fuentes con acceso gratuito confirmado y usa reglas programadas para filtrar candidatos, calcular métricas, registrar evidencia y producir informes mediante plantillas. No requiere OPENAI_API_KEY. Una clave presente en el entorno no constituye autorización para usar servicios pagados.

DEX Screener es la fuente inicial. J7Tracker se incorporará cuando se confirme que el acceso automatizado disponible es gratuito y esté autorizado. Axiom continúa como herramienta de revisión manual. Las fuentes ausentes producen datos insuficientes y sus comprobaciones pendientes quedan explícitas.

La oficina, la cola, las tareas y los entregables pueden funcionar con ejecutores deterministas. La presentación visual debe reflejar únicamente actividad real. Los resultados de reglas no acreditan que una moneda sea segura.

Desde el 26 de noviembre el worker ejecuta investigaciones por reglas, descubrimiento y seguimiento. El chat utiliza Ollama en el ordenador, con un modelo local y sin proveedor de IA de pago. Las reglas se ejecutan independientemente del modelo.

Cualquier futura incorporación de IA pagada o contratación de datos requiere aprobación explícita de presupuesto y controles de admisión implementados antes de su activación. Los planes gratuitos de infraestructura tienen sus propias cuotas; este acuerdo no autoriza ampliarlos a planes de pago.

## Propuesta histórica de presupuesto — no autorizada

Las cifras que siguen se conservan como referencia de planificación. No son límites vigentes ni autorizaciones de gasto. Los límites de IA vigentes son USD 0.

### Estimación histórica mensual

| Partida | Piloto local | Operación continua inicial |
|---|---:|---:|
| Supabase | 0 | 25 |
| Alojamiento API, web y worker | 0 | 15 |
| RPC de Solana | 0, ensayo en cuota gratuita | 0, sujeto a volumen medido |
| DEX Screener y Jupiter | 0, acceso público o plan gratuito | 0, sujeto a cuotas |
| J7Tracker | Reserva de 20 | Reserva de 20 |
| IA | 20 | 20 |
| Reserva para ajustes | 10 | 20 |
| **Techo de planificación** | **50** | **100** |

Los USD 20 de J7 son una reserva propuesta. El precio y el acceso de la cuenta requieren confirmación. Si la cuota excede la reserva o el RPC gratuito resulta insuficiente, se reajustará el alcance o presupuesto antes de contratar.

Helius Developer añadiría USD 49/mes. Con todas las demás asignaciones intactas, el techo de operación pasaría a USD 149/mes. Esta ampliación necesita aprobación. El coste de entrenamiento específico se presupuesta como USD 0 hasta que las evaluaciones justifiquen una partida.

## Referencias de precios

- Supabase Free publica 500 MB de base de datos y 5 GB de salida. Pro comienza en USD 25/mes e incluye el primer proyecto. Revisar consumo y extras al desplegar. [Precios](https://supabase.com/pricing)
- Railway Hobby publica un mínimo de USD 5 que incluye USD 5 de consumo. El resto depende de recursos. Los USD 15 asignados son un límite propuesto a contrastar con medición del worker y la API. [Precios](https://railway.com/pricing)
- Helius Free publica un millón de créditos y 10 solicitudes RPC/segundo. Developer publica USD 49, diez millones de créditos y 50 solicitudes/segundo. [Precios](https://www.helius.dev/pricing)
- Jupiter Free publica una solicitud/segundo y USD 0 mensuales. [Planes](https://developers.jup.ag/docs/portal/plans)
- El coste de IA depende del modelo, tokens y herramientas contratadas. La elección del modelo se hará mediante evaluación con la tabla de precios vigente. [Precios OpenAI API](https://developers.openai.com/api/docs/pricing)

Revisar tarifas al contratar y antes de cada cambio de plan. Los servicios adicionales, impuestos y dominio deben caber en la reserva o motivar un ajuste aprobado.

## Unidad de ejecución

Una ejecución es una tarea del agente con sus llamadas al modelo, herramientas, delegaciones y reintentos. Todos los descendientes heredan el presupuesto restante de la tarea raíz. El monitoreo determinista de mercado se contabiliza por ciclo y por proveedor.

## Límites por ejecución propuestos

| Tipo | Coste máximo variable | Llamadas al modelo | Herramientas | Duración máxima |
|---|---:|---:|---:|---:|
| Clasificar lote de hasta 20 publicaciones | USD 0,01 | 1 | 0 | 30 segundos |
| Investigar un candidato | USD 0,05 | 3 | 10 | 120 segundos |
| Explicar evaluación de riesgo | USD 0,05 | 2 | 10 | 120 segundos |
| Resumen de seguimiento | USD 0,02 | 1 | 5 | 60 segundos |
| Flujo completo por candidato, incluidos hijos | USD 0,15 | 8 | 25 | 300 segundos |

Los máximos son techos de admisión. El planificador reserva el coste máximo estimado de la siguiente acción y solo la admite si cabe en todos los límites aplicables.

Presupuesto de tokens por llamada de hasta 8.000 de entrada y 1.000 de salida, con el límite monetario como restricción adicional. Si la tarifa del modelo hace que esos tokens excedan el presupuesto de la tarea, reducir contexto o detener la ejecución. Incluir tokens facturables de razonamiento y herramientas en la estimación según el proveedor.

Fórmula de coste del modelo:

```text
coste = tokens_entrada / 1.000.000 × tarifa_entrada
      + tokens_salida / 1.000.000 × tarifa_salida
      + herramientas_facturadas
```

Usar inicialmente tarifa de entrada sin descuento de caché para reservar fondos. Reconciliar con el uso real. Un error con resultado incierto conserva su reserva hasta conciliación.

## Límites de uso de datos

- Una conexión J7 del worker, compartida internamente por los agentes.
- DEX Screener hasta 30 solicitudes/minuto en el piloto, respetando cuotas específicas.
- Jupiter hasta 0,5 solicitudes/segundo en la cola compartida.
- RPC gratuito con tope interno de 5 solicitudes/segundo y alerta al 70% y 90% de créditos mensuales. Los métodos especiales respetan sus cuotas.
- Un ciclo del monitor actual realiza una consulta de mercado y una escritura, aproximadamente cada 60 segundos más duración del ciclo. Con 30 días son como máximo unas 43.200 comprobaciones para una sola instancia.
- Hasta dos reintentos por operación futura con backoff y respeto de Retry-After, incluidos en el presupuesto original.
- Concurrencia inicial de dos tareas de IA, usando reservas atómicas en base de datos para evitar sobreasignación.

## Límites diarios y mensuales de IA

Propuesta de USD 1/día y USD 20/mes. Se aplica siempre el saldo menor disponible. Reinicio diario a medianoche de America/Santo_Domingo y mensual el primer día del mes. Conservar registros en UTC y convertir para determinar el periodo presupuestario.

Ejemplo de planificación de 30 días:

- 300 clasificaciones a USD 0,01 consumen hasta USD 3.
- 200 investigaciones a USD 0,05 consumen hasta USD 10.
- 100 resúmenes a USD 0,02 consumen hasta USD 2.
- Saldo de USD 5 para otras ejecuciones admitidas.

El ejemplo describe volumen compatible con el presupuesto; las alertas y el saldo determinan la admisión real.

## Comportamiento ante límites

- Al 70%, informar consumo y proyección.
- Al 90%, priorizar tareas existentes y reducir frecuencia de trabajos opcionales.
- Antes de superar el límite, suspender nuevas llamadas facturables y mostrar “esperando presupuesto”.
- Registrar tareas pausadas, motivo, saldo y acción requerida.
- La infraestructura fija puede seguir generando cargos. Configurar límites del proveedor donde existan y vigilar proyecciones de facturación.
- Los límites de aplicación son controles de admisión. Los cargos retrasados, cambios de tarifas e impuestos se concilian con la facturación y la reserva disponible.

## Registro mínimo

Guardar proveedor, modelo, tarea raíz, llamada, fecha, tokens, créditos, coste reservado, coste real y motivo de reintento. Registrar gasto fijo por servicio y periodo de facturación por separado. Evitar incluir credenciales o contenido sensible en logs de costes.

## Revisión futura de servicios pagados

Confirmar techo piloto de USD 50/mes, operación inicial de USD 100/mes y límites por ejecución. Verificar precio J7 y factibilidad del RPC gratuito. Implementar controles en DAK-019, DAK-041 y DAK-074 antes de activar agentes con consumo continuo.
