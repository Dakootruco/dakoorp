# DAK-003 · Protocolos, fuentes y organización

- **Fecha** — 20 de noviembre de 2026.
- **Estado** — Propuesta revisada, pendiente de aprobación.
- **Criterio** — Cobertura, retraso, límites y costes documentados.
- **Dependencias** — DAK-001 aprobado; DAK-002 pendiente de aprobación; presupuesto total en DAK-004.
- **Cambio de propuesta** — Se incorporan las herramientas habituales del propietario, Axiom y J7Tracker. La selección de un plan Helius de pago queda pendiente de pruebas y presupuesto.

## Función de cada herramienta

| Fuente | Función en Dakoorp | Estado de integración |
|---|---|---|
| J7Tracker | Señales sociales, publicaciones y contexto para narrativas | Feed oficial documentado; acceso de la cuenta por verificar |
| DEX Screener | Buscar y enriquecer candidatos con datos de mercado | Consulta básica funcionando; correlación pendiente |
| Axiom | Revisión humana de candidatos y entrada manual de direcciones vistas en Pulse | API pública sin verificar |
| RPC Solana, proveedor por decidir | Autoridades, cuentas, transacciones, pools y swaps | Necesario para verificar reglas on-chain de DAK-002 |
| Jupiter | Cotizaciones para simulación | Selección propuesta; integración pendiente |
| Supabase | Persistencia y trazabilidad | Primer evento guardado y recuperado |

Axiom documenta Pulse y filtros como antigüedad, concentración y actividad. El índice oficial consultado contiene documentación de usuario. La disponibilidad de una API para Dakoorp requiere confirmación adicional. La página interactiva proporcionada no pudo inspeccionarse con la herramienta de lectura web. [Pulse](https://docs.axiom.trade/axiom/finding-tokens/pulse) · [Índice oficial](https://docs.axiom.trade/llms.txt)

J7Tracker documenta un feed social sobre Socket.IO v4 autenticado mediante JWT, con eventos iniciales y actualizaciones. Permite recibir datos para construir un análisis de narrativas dentro de Dakoorp. El acceso efectivo de la cuenta del propietario todavía debe verificarse. [Feed oficial](https://docs.j7tracker.io/docs/feed)

## Organización propuesta del departamento

| Agente | Responsabilidad | Entregable |
|---|---|---|
| Descubrimiento | Recibir señales sociales y candidatos de mercado, detectar posibles narrativas y relacionarlas con mints | Candidato con origen, contexto y evidencia de asociación |
| Riesgo | Aplicar comprobaciones de identidad, autoridades, concentración, liquidez y negociación | Evaluación versionada con incertidumbres y motivos |
| Seguimiento | Reevaluar candidatos, detectar cambios, registrar simulaciones y generar alertas | Historial y resultados de seguimiento |

Se conservan los tres roles aprobados en DAK-001. Descubrimiento incorpora tareas especializadas de análisis social. Un cuarto agente de narrativas se podrá considerar cuando el volumen y las evaluaciones lo justifiquen.

Los conectores reciben datos, gestionan cuotas y deduplican. Las reglas numéricas se calculan mediante código. Los agentes interpretan contexto, priorizan investigaciones y explican resultados apoyados en evidencia.

## Flujo de trabajo

1. Recibir una publicación de J7Tracker, detectar un evento on-chain o aceptar un mint introducido por el propietario desde Axiom.
2. Guardar el origen, enlace, identificador, hora de publicación, recepción y cobertura.
3. Crear una narrativa cuando exista un tema identificable. Una narrativa puede existir antes de que haya un token asociado.
4. Resolver candidatos por red y mint. Los nombres y tickers repetidos generan asociaciones ambiguas.
5. Enriquecer cada candidato con mercado e historial.
6. Aplicar las reglas de DAK-002 y enviar los casos completos a riesgo.
7. Seguir cambios, registrar simulaciones y emitir alertas.
8. Mostrar tareas y resultados desde los avatares y paneles de la oficina.

## Narrativas y asociación con tokens

Guardar publicaciones, narrativas, candidatos y asociaciones como entidades distintas.

La asociación conserva su evidencia y categoría:

- **Dirección explícita** — La publicación contiene un mint verificable.
- **Enlace verificable** — El enlace permite resolver red y dirección.
- **Coincidencia contextual** — Nombre, imagen o tema coinciden; requiere confirmación.
- **Sin token asociado** — La narrativa queda disponible para búsquedas posteriores.

Una dirección presente en una publicación acredita que esa publicación la menciona. La autenticidad del autor, del proyecto y de la relación con el meme se evalúa aparte.

Medir publicaciones únicas, autores distintos, hora de primera observación y variación de menciones por ventana. La muestra representa las cuentas cubiertas por J7Tracker. Los reposts y actualizaciones conservan su relación con el original para evitar inflar actividad.

Los criterios de narrativa se añadirán como propuesta complementaria a DAK-002 antes de usarlos como reglas de promoción. Las señales sociales podrán generar investigación con datos pendientes.

## Cobertura de protocolos

Cobertura objetivo propuesta para Solana:

- Raydium CPMM para el primer adaptador de pools y swaps.
- Pump.fun para creación y actividad en curva.
- PumpSwap para pools y seguimiento de migraciones.

Conservar la antigüedad previa del mint al migrar. Las reglas de liquidez de pool se aplican al mercado correspondiente. La evaluación de curvas requiere su propio tratamiento de reservas y profundidad.

Raydium publica documentación de sus programas y Pump publica IDLs y SDKs. Cada adaptador fijará versiones y verificará eventos con transacciones conocidas. Se documentarán programas, instrucciones y tokens de cotización soportados. [Raydium](https://docs.raydium.io/) · [Pump](https://github.com/pump-fun/pump-public-docs)

Otros protocolos y Base quedan como ampliaciones pendientes de alcance. El enlace de Axiom incluye Base, mientras que DAK-001 limita la primera versión a Solana.

## Cobertura, límites y costes

| Fuente | Cobertura y límites | Coste para planificar |
|---|---|---|
| J7Tracker | Cuentas del feed y cuentas habilitadas para el usuario; cobertura social dependiente de cuenta | Precio y derechos de acceso al feed pendientes de verificar en la cuenta |
| DEX Screener | Pares y métricas disponibles en sus endpoints; establecer cuota interna inicial de 30 consultas/minuto | Acceso público utilizado; condiciones de producción por confirmar |
| Axiom | Inspección humana e importación manual de mint; API sin verificar | Costes de integración automática desconocidos |
| Helius Free, opción de prueba | Un millón de créditos/mes y 10 solicitudes RPC/segundo | USD 0 |
| Helius Developer, opción a evaluar | Diez millones de créditos/mes y 50 solicitudes RPC/segundo; métodos especiales tienen cuotas propias | USD 49/mes, pendiente de aprobación |
| Jupiter Free | Una solicitud/segundo | USD 0 |

Helius permite acceso RPC y streaming. El plan se elegirá tras medir consumo y verificar métodos disponibles; su cuota gratuita sirve para ensayos acotados. Developer publica créditos adicionales a USD 5 por millón. [Precios de Helius](https://www.helius.dev/pricing)

El streaming de Helius publica 20 créditos/MB. Filtrar y medir el tráfico es necesario para estimar gasto. Un supuesto de 100.000 MB/mes equivale a dos millones de créditos, antes de RPC y otros métodos. [Tarificación de streaming](https://www.helius.dev/blog/laserstream-websockets)

J7 publica diez conexiones por usuario compartidas con pestañas de la aplicación y quince mensajes cliente-servidor por segundo por socket. Hay una referencia a cinco conexiones en un ejemplo de error de la misma página, por lo que verificaremos el límite efectivo usando inicialmente una sola conexión. [Límites del feed](https://docs.j7tracker.io/docs/errors)

El backlog inicial de J7 contiene hasta cien elementos y tiene condiciones de entrega. Guardaremos los datos recibidos y marcaremos huecos tras desconexiones; la recuperación íntegra de historial necesita verificación. Deduplicar por ID y combinar actualizaciones. [Eventos de J7](https://docs.j7tracker.io/docs/feed-events)

Jupiter Free cubre consultas iniciales con cola. El plan Developer publica USD 25/mes y diez solicitudes/segundo si las mediciones justifican ampliarlo. [Planes](https://developers.jup.ag/docs/portal/plans)

DEX Screener documenta endpoints y cuotas específicas, incluyendo sesenta consultas/minuto para perfiles. Confirmar la cuota del endpoint de mercado al implementarlo y respetar respuestas 429. [Referencia](https://docs.dexscreener.com/api/reference)

El presupuesto total queda abierto hasta conocer el acceso J7 y el volumen de ingesta. Supabase, alojamiento e IA se incluyen en DAK-004.

## Retrasos y calidad de datos

| Flujo | Información disponible | Medición propuesta |
|---|---|---|
| J7 social | Feed en directo; SLA numérico sin verificar | Publicación a recepción, recepción a persistencia, actualizaciones y huecos |
| RPC y streaming | Retraso depende del proveedor y confirmación | Objetivo interno de detección P95 de hasta 120 segundos |
| DEX Screener | Frescura exacta por dato pendiente de verificar | Guardar timestamp de origen cuando exista y recepción aparte |
| Axiom manual | Depende del momento de introducción | Registrar hora de ingreso y origen manual |
| Jupiter | Cotizaciones disponibles según rutas | Objetivo interno de respuesta P95 de hasta 3 segundos; registrar hora y slot disponible |

Los objetivos son propuestas de Dakoorp. La frescura desconocida conserva ese estado aunque la consulta HTTP termine correctamente. La latencia ping/pong mide conexión y se registra aparte del retraso desde la publicación original.

## Validación y orden de implementación

1. Verificar acceso autenticado al feed J7 y forma soportada de renovar sesión.
2. Registrar publicaciones y actualizaciones con deduplicación y persistencia.
3. Añadir candidatos por mint desde la interfaz y enriquecerlos con DEX Screener.
4. Probar asociación narrativa-token con evidencia explícita y casos ambiguos.
5. Medir RPC en un piloto acotado, incluyendo autoridades, inventario de tenedores y recuperación.
6. Elegir proveedor y plan on-chain según cobertura, consumo y presupuesto.
7. Añadir parsers de protocolos y cotizaciones.
8. Medir durante 72 horas errores, retrasos P50/P95, bytes, créditos y huecos de cada fuente.
9. Confirmar cobertura y aprobar presupuesto antes de ampliar la operación continua.

## Decisiones pendientes

- Aceptar esta organización y asignación de fuentes.
- Verificar acceso y precio J7 con la cuenta del propietario.
- Elegir proveedor y plan RPC tras la prueba.
- Aprobar criterios sociales complementarios de DAK-002.
- Mantener DAK-003 pendiente hasta cerrar selección y presupuesto.
