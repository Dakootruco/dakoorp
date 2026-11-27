# MVP local de Dakoorp

Actualizado el 26 de noviembre de 2026.

## Alcance

Investigación preliminar en Solana con fuentes gratuitas, ejecutores deterministas y conversación local de solo lectura. No ejecuta operaciones ni garantiza que un token sea seguro. El modelo no participa en la decisión de las reglas.

## Recorrido

1. Iniciar sesión con el propietario configurado.
2. Abrir Candidatos y registrar una dirección de Solana.
3. Abrir Ver investigación y pulsar Investigar ahora. También se puede crear una investigación desde Tareas, seleccionando candidato, departamento y agente.
4. El worker reclama el trabajo y guarda tarea, ejecución, informe y actividad. El panel se actualiza cada cinco segundos.
5. Consultar métricas, cada comprobación y la evidencia. La clasificación conserva datos insuficientes cuando faltan comprobaciones obligatorias. Una autoridad activa confirmada tiene prioridad y produce descarte por política experimental.
6. Activar seguimiento cada quince minutos si se desea. Pausarlo detiene futuras programaciones, pero no cancela el trabajo que ya esté en cola. Cancelar ese trabajo desde Tareas.
Los informes también comparan la liquidez en USD del mismo pool con la observación anterior. Una caída de al menos el 30% genera revisión, con prioridad inferior a una autoridad activa confirmada. La comparación utiliza el intervalo real entre informes y puede reflejar precio o reservas.

7. Activar o pausar el descubrimiento en Configuración. Consulta hasta cinco perfiles de Solana cada cinco minutos. La misma dirección se deduplica y el descubrimiento investiga como máximo una vez al día cada candidato.
8. Consultar avisos en Actividad o Configuración. Marcar un aviso revisado no cambia la evaluación.
9. Seleccionar un agente desde Oficina o Agentes y escribir en Conversación local. El contexto incluye sus últimas tareas, ejecuciones e informes. El chat no puede ejecutar herramientas ni modificar registros.

## Arranque

Requisitos existentes del monorepo, migraciones SQL aplicadas y apps/api/.env configurado según README.

```sh
pnpm install --frozen-lockfile
pnpm dev:all
```

Abrir http://127.0.0.1:5173. Para conversación local, en otra terminal ejecutar lo siguiente.

```sh
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 OLLAMA_NUM_PARALLEL=1 ollama serve
```

La primera vez instalar el modelo en otra terminal.

```sh
ollama pull qwen3:1.7b
```

Ollama ya está instalado en el equipo inspeccionado, un Apple M1 con 8 GB. Se seleccionó Qwen3 1.7B para limitar el consumo de memoria. La API llama exclusivamente a 127.0.0.1:11434, usa una conversación a la vez, contexto acotado y timeout de 120 segundos. No recibe claves Supabase ni ofrece herramientas al modelo. Si el servicio local falla, muestra un error y no recurre a proveedores externos.

Las conversaciones solo se conservan mientras el panel está montado. La respuesta del modelo puede contener errores y debe contrastarse con el informe original.

## Persistencia y fallos

La migración 202611260001_research_mvp.sql añade trabajos, informes, seguimientos, configuración de descubrimiento y avisos. El propietario confirmó su aplicación y se verificaron las tablas por lectura autenticada.

Solo puede existir un trabajo activo por candidato. Cada solicitud conserva una clave de idempotencia. Los intentos tienen un lease de 90 segundos, timeout de proveedores de 45 segundos y máximo de tres intentos. Un reinicio permite recuperar leases vencidos. La finalización del informe, entregable, tarea y ejecución ocurre en una transacción. Una cancelación invalida el lease y rechaza resultados tardíos.

La API protege todas las rutas de investigación y conversación con la sesión del propietario. Las tablas tienen RLS y acceso de datos reservado al backend.

Los informes mantienen sus propias instantáneas JSON con fuente, hora de recepción y evidencia. El adaptador inicial no normaliza todavía esas instantáneas dentro de pools, market_observations y evaluations. Estos modelos siguen disponibles para la siguiente fase de indexación.

## Límites explícitos del piloto

- Los perfiles recientes de DEX Screener no son un feed completo de nuevos pools. Tampoco garantizan antigüedad ni relevancia de un token.
- La fecha del pool no equivale a la primera negociación del token.
- DEX Screener no aporta hora de origen verificable de estas métricas. Se conserva observed_at nulo y received_at separado.
- La comprobación de autoridades soporta mints SPL clásicos. Token-2022, RPC fallido y respuestas no interpretables quedan desconocidos.
- Concentración por propietario, control de liquidez, cotización de salida, wallets distintas y cobertura completa de ventana permanecen pendientes. Ningún informe del piloto habilita simulación o trading automáticamente.
- Los umbrales de liquidez, volumen, operaciones y antigüedad del pool son experimentales, versionados como pilot-v1 y pendientes de calibración.
- La lista y el historial tienen ventanas acotadas. El filtro de candidatos actúa sobre la página cargada. El selector de tareas carga hasta cien candidatos.
- Se recomienda una sola instancia del worker local para el piloto. Las reservas de base de datos evitan duplicar trabajos, pero todavía no hay un limitador global de cuota por proveedor.
- Requiere mantener el ordenador y los procesos encendidos. No incluye alojamiento permanente, simulación de cartera, backtesting ni trading real.

## Verificación

Pruebas SQL aisladas de deduplicación, cierre atómico, cancelación y resultados tardíos, backoff y recuperación de tres intentos vencidos. Pruebas de reglas con datos ausentes, red equivocada, cero, autoridades y proveedores caídos. Pruebas de autorización y chat local sin credenciales. Flujo de navegador con autenticación y proveedores simulados para registro, investigación, informe, seguimiento, conversación y navegación móvil.

La prueba remota inicial investigó SOL con origen verification_live_sol y produjo un informe real con resultado de datos insuficientes. Ese registro identifica una comprobación técnica y no una oportunidad de inversión. El descubrimiento gratuito se activó y produjo investigaciones reales adicionales.

## Referencias técnicas

- [DEX Screener API](https://docs.dexscreener.com/api/reference)
- [Solana getAccountInfo](https://solana.com/docs/rpc/http/getaccountinfo)
- [Ollama chat](https://docs.ollama.com/api/chat)
- [Ollama configuración local](https://docs.ollama.com/faq)
- [Qwen3 1.7B](https://ollama.com/library/qwen3:1.7b)

La integración API → Supabase → worker → entregable se verificó con datos reales y autenticación simulada únicamente dentro de un servidor de prueba aislado. No sustituye una comprobación manual de inicio de sesión del propietario.
