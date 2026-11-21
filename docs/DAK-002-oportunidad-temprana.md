# DAK-002 · Oportunidad temprana y criterios de investigación

- **Estado** — Propuesta pendiente de aprobación.
- **Versión** — 0.1.
- **Fecha** — 20 de noviembre de 2026.
- **Criterio de finalización** — Criterios con métricas, fuentes y ejemplos.
- **Dependencias** — Alcance aprobado en DAK-001. Proveedores y protocolos se concretarán en DAK-003.

## Definición

Una oportunidad temprana es un candidato de Solana cuyo inicio de negociación conocido está dentro de las últimas 24 horas y que reúne condiciones medibles para investigar su actividad y riesgos.

La etiqueta indica prioridad de investigación. La evaluación mostrará evidencia, incertidumbres y el resultado de cada regla. Toda operación del alcance inicial se realiza en simulación.

Los umbrales de este documento son hipótesis de producto propuestas para calibración. Su utilidad deberá medirse con observaciones y simulaciones. Las fuentes citadas documentan datos y capacidades técnicas.

## Antigüedad y cobertura

Guardar por separado la creación del mint, la creación del pool, la primera negociación conocida, la detección por Dakoorp y la recepción de cada observación.

La antigüedad se calcula con la primera negociación verificada en los mercados cubiertos. Una migración o un nuevo pool del mismo mint conserva la historia previa del token. Si solo conocemos la fecha de un pool, mostrar “pool reciente; antigüedad del token pendiente”.

| Segmento | Antigüedad conocida |
|---|---|
| Lanzamiento | Desde 0 hasta menos de 1 hora |
| Temprano | Desde 1 hasta 6 horas, inclusive |
| Reciente | Más de 6 y hasta 24 horas, inclusive |
| Seguimiento posterior | Más de 24 horas |

Los candidatos nuevos se capturan desde su detección, aunque todavía carezcan de liquidez o actividad suficiente. La etiqueta temporal incluye siempre la cobertura conocida. La selección de protocolos y las curvas de lanzamiento anteriores a la creación del pool se resolverá en DAK-003.

Objetivo inicial de latencia de detección P95 de 120 segundos desde el evento on-chain hasta su persistencia. Es un objetivo a validar según infraestructura y cobertura. Guardar firma, slot, nivel de confirmación y estado de reconciliación. Verificar los eventos confirmados al alcanzar finalización.

## Paso a investigación

Las ventanas se calculan respecto a la hora de evaluación, en UTC. Los límites indicados son inclusivos. Cada candidato puede acumular varios motivos de espera.

| Métrica | Propuesta inicial | Fuente y cálculo |
|---|---|---|
| Identidad | Mint y pool verificables en Solana | Cuentas y transacción de creación on-chain |
| Antigüedad | Hasta 24 horas | Primera negociación conocida y cobertura registrada |
| Liquidez del pool evaluado | Al menos USD 20.000 | Reservas o posiciones según protocolo, con valoración y hora; DEX Screener como enriquecimiento |
| Volumen de 5 minutos | Al menos USD 5.000 | Swaps únicos del pool en la ventana, convertidos a USD al momento de cada operación |
| Actividad de 5 minutos | Al menos 30 swaps y 15 wallets operadoras distintas | Transacciones indexadas, deduplicadas por firma e índice de instrucción |
| Frescura de mercado | Observación de hace 60 segundos o menos | Hora del dato suministrada o reconstruida |
| Cobertura temporal | Ventana completa de 5 minutos | Historial recuperado y validado |

Una wallet operadora representa la dirección que inicia el swap según el parser del protocolo. Los routers, firmantes compartidos y operaciones de varios saltos requieren normalización. La diversidad de wallets se considera una señal observable y puede estar manipulada.

Para pools con menos de cinco minutos, registrar la actividad disponible y mantener el estado de observación hasta completar la ventana. Si falta historial, conservar “datos insuficientes”. La hora de descarga de una API se guarda aparte de la hora del dato. Una respuesta reciente con frescura desconocida conserva esa incertidumbre.

Los agregados de DEX Screener sirven para una evaluación preliminar. La regla de wallets distintas requiere indexación on-chain o un proveedor que entregue ese dato. Conservar identificadores y ventana de cada agregado para evitar mezclar pools o intervalos.

## Comprobaciones de riesgo

Las siguientes comprobaciones se ejecutan sobre candidatos investigables. Cada una produce un resultado favorable, desfavorable o desconocido. Un dato desconocido impide avanzar a simulación.

| Comprobación | Regla propuesta para avanzar | Si falla |
|---|---|---|
| Autoridad de emisión | Revocada | Descartado por política inicial |
| Autoridad de congelación | Revocada | Descartado por política inicial |
| Programa y extensiones del token | Interpretados por el analizador y compatibles con la ruta de negociación | Revisión requerida o datos insuficientes |
| Concentración individual | Ningún propietario externo supera el 10% del suministro actual | Descartado por concentración |
| Concentración de los diez principales propietarios externos | Como máximo 35% del suministro actual | Descartado por concentración |
| Control de liquidez | Identificación del mecanismo de retiro, controladores y posibilidad de retiro unilateral | Revisión requerida si existe control discrecional o evidencia incompleta |
| Cotizaciones de entrada y salida | Ruta disponible para una entrada simulada de USD 100 y la salida de los tokens resultantes | Reintentar ante error temporal; revisión requerida si el fallo persiste |
| Impacto de precio cotizado | Como máximo 3% por dirección para ese monto | Mantener en observación por profundidad insuficiente |

Agrupar cuentas de tokens por propietario y documentar las exclusiones de vaults de pools identificados. El denominador es el suministro actual del mint. Guardar tanto la concentración bruta como la ajustada y las direcciones excluidas. La pertenencia de varias wallets a una persona puede permanecer desconocida.

El método getTokenLargestAccounts devuelve las 20 mayores cuentas de tokens. Calcular concentración por propietario exige una cobertura adicional suficiente; un muestreo parcial mantiene el resultado incompleto. [Documentación de Solana](https://solana.com/docs/rpc/http/gettokenlargestaccounts)

Las autoridades del mint controlan emisión y congelación. Los programas con extensiones pueden tener otras autoridades que deben inspeccionarse. [Autoridades de tokens en Solana](https://solana.com/docs/tokens/basics/set-authority)

Registrar el proveedor, slot o momento de cotización, ruta, importe, comisiones e impacto. Una cotización favorable conserva el riesgo de cambios de estado y fallos durante una ejecución. Los USD 100 son un importe de prueba propuesto, sujeto a la definición de simulación de DAK-049.

La valoración de liquidez necesita adaptadores por protocolo, especialmente para posiciones concentradas y migraciones. La cantidad total en USD se complementa con las cotizaciones para medir profundidad utilizable.

## Estados y orden de evaluación

1. **Detectado** — Identidad inicial recibida y persistida.
2. **Fuera de ventana inicial** — Antigüedad conocida superior a 24 horas. Conserva historial y seguimiento existente.
3. **Datos insuficientes** — Falta algún dato obligatorio o su frescura no es verificable.
4. **En observación** — Datos disponibles, pero liquidez, actividad o profundidad todavía incumplen umbrales.
5. **En investigación** — Supera los filtros iniciales y tiene evaluación de riesgo en curso.
6. **Revisión requerida** — Existe una propiedad que requiere intervención o un analizador adicional.
7. **Descartado** — Se confirma un incumplimiento de una regla de descarte.
8. **Elegible para simulación** — Cumple todos los filtros y comprobaciones de la versión de reglas aplicada.

Los riesgos confirmados se conservan y tienen prioridad sobre la ausencia de otros datos. El estado almacena todos los motivos relevantes. Una reevaluación puede modificar la decisión y genera una nueva entrada de historial.

## Prioridad y seguimiento

Investigar primero candidatos con filtros completos, ordenados por antigüedad conocida ascendente y después por hora de detección. Los casos con datos faltantes tienen su cola de recuperación.

Propuesta de reevaluación cada 60 segundos durante la primera hora, cada 5 minutos hasta las 6 horas y cada 15 minutos hasta las 24 horas. El planificador ajustará los intervalos al presupuesto y las cuotas, registrando el retraso real.

Una caída del 30% o más en liquidez valorada en USD respecto a cinco minutos antes genera una revisión. Analizar reservas y precio para identificar la causa. También reabrir evaluación ante cambios de autoridades, restricciones, concentración o pérdida de ruta de salida.

Enviar una alerta al pasar a elegible para simulación o al detectar un cambio material en un candidato seguido. Deduplicar por candidato, transición y versión de evaluación.

## Evidencia mínima por decisión

- Red, mint, pool y protocolo.
- Fuente y cobertura de mercados.
- Hora de origen, hora de recepción y hora de evaluación.
- Datos utilizados, unidad, ventana y método de cálculo.
- Firma y slot cuando exista evidencia on-chain.
- Reglas aplicadas, versión y resultado individual.
- Datos faltantes, contradicciones y límites de cobertura.
- Motivo de decisión, próxima revisión e intervención requerida.

La IA puede explicar los resultados y proponer investigaciones adicionales. Los umbrales numéricos se calculan mediante código y quedan registrados junto a los valores observados.

## Ejemplos ficticios para verificar las reglas

| Caso | Datos | Resultado esperado |
|---|---|---|
| A | Token de 18 minutos; liquidez USD 32.000; volumen 5m USD 8.000; 65 swaps; 28 wallets; ventana completa; datos de hace 20 segundos | En investigación. Si todas las comprobaciones de riesgo resultan favorables, elegible para simulación |
| B | Token de 4 minutos; liquidez USD 40.000; actividad prometedora | En observación hasta completar la ventana de 5 minutos |
| C | Token de 40 minutos; liquidez USD 9.000; resto de datos completo | En observación por liquidez |
| D | Filtros iniciales completos; autoridad de emisión activa y confirmada | Descartado por política inicial |
| E | Filtros iniciales completos; concentración por propietario desconocida | Datos insuficientes para avanzar a simulación |
| F | Pool creado hace 10 minutos; el mismo token negociaba hace 3 días | Fuera de ventana inicial; conservar antigüedad previa |
| G | Alta actividad; última observación de mercado de hace 4 minutos | Datos insuficientes por antigüedad del dato |
| H | Riesgo favorable; cotización de salida con impacto del 8% | En observación por profundidad insuficiente |
| I | Exactamente 24 horas; liquidez USD 20.000; volumen USD 5.000; 30 swaps; 15 wallets; datos de hace 60 segundos | Cumple los límites iniciales inclusivos; pasa a investigación |

Los ejemplos son datos ficticios de aceptación y no representan activos ni resultados observados.

## Fuentes técnicas y dependencias

- DEX Screener ofrece datos de pares, perfiles y otros endpoints. Los perfiles y boosts se registrarán como contexto cuando se utilicen. La antigüedad se verificará con evidencia del mercado. [Referencia de API](https://docs.dexscreener.com/api/reference)
- Solana permite suscribirse a logs de transacciones mediante filtros. Interpretar la creación de pools requiere parsers de los programas elegidos. [logsSubscribe](https://solana.com/docs/rpc/websocket/logssubscribe)
- DAK-003 deberá seleccionar RPC o indexador, protocolos, fuente de swaps y proveedor de cotizaciones. Debe comprobar que entreguen los datos y la frescura exigidos.
- DAK-044 y DAK-045 evaluarán estos umbrales mediante casos históricos y observación en directo.

## Validación y aprobación

Antes de considerar los umbrales estables, medir durante un periodo inicial propuesto de 14 días la cobertura, latencia P50/P95, candidatos por filtro, datos faltantes, coste por candidato y resultados simulados. Conservar candidatos descartados para estudiar el efecto de los filtros.

El periodo de calibración es una propuesta operativa. La representatividad de la muestra se evaluará antes de sacar conclusiones.

La especificación contiene métricas, fuentes y ejemplos. Queda pendiente la aprobación del propietario de la ventana de 24 horas, los umbrales iniciales y el importe simulado de USD 100. Su aprobación permitirá cerrar DAK-002 como definición de producto; la implementación y calibración se gestionarán en sus tareas correspondientes.
