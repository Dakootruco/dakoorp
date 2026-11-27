import AgentChat from './AgentChat'
import Research, { Report } from './Research'
import { researchReportSchema } from '@dakoorp/contracts'
import {
  agentListSchema, candidateListSchema, departmentListSchema, taskListSchema, agentWorkSchema,
  type Agent, type Candidate, type Department, type Task, type AgentWork,
} from '@dakoorp/contracts'
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'

const Office = lazy(() => import('./Office'))

const labels: Record<string, string> = {
  pending: 'Pendiente', running: 'En ejecución', waiting: 'Esperando intervención',
  completed: 'Completada', failed: 'Fallida', cancelled: 'Cancelada', detected: 'Detectado',
  insufficient_data: 'Datos insuficientes', observing: 'En observación', investigating: 'En investigación',
  review_required: 'Revisión requerida', discarded: 'Descartado', simulation_eligible: 'Elegible para simulación',
}

export default function Workspace({ accessToken, page, initialCandidate }: { accessToken: string; page: 'candidates' | 'tasks' | 'agents' | 'office'; initialCandidate?: string }) {
  const [selectedCandidate,setSelectedCandidate] = useState(initialCandidate ?? '')
  const [filter,setFilter] = useState('')
  const [agentStates,setAgentStates] = useState<Record<string,string>>({})
  const [work, setWork] = useState<AgentWork | null>(null)
  const [workError, setWorkError] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const tab = page === 'office' ? 'agents' : page
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [offset, setOffset] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [address, setAddress] = useState('')
  const [taskCandidate,setTaskCandidate]=useState('')
  const [taskKey,setTaskKey]=useState(()=>crypto.randomUUID())
  const [departmentId, setDepartmentId] = useState('')
  const [agentId, setAgentId] = useState('')

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch('/api/' + path, {
      ...options,
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? 'No se pudo completar la solicitud.')
    }
    return await response.json()
  }

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      setLoading(true)
      setError('')
      try {
        const headers = { Authorization: 'Bearer ' + accessToken }
        const paths = [tab + '?limit=20&offset=' + offset, 'departments?limit=100', 'agents?limit=100', 'candidates?limit=100']
        const data = await Promise.all(paths.map(async path => {
          const response = await fetch('/api/' + path, { headers, signal: controller.signal })
          if (!response.ok) throw new Error(response.status === 403
            ? 'Esta cuenta no tiene acceso a la oficina.'
            : 'No se pudieron cargar los datos. Comprueba las migraciones y la conexión.')
          return await response.json()
        }))
        if (controller.signal.aborted) return
        if (tab === 'candidates') setCandidates(candidateListSchema.parse(data[0]))
        if (tab === 'tasks') { setTasks(taskListSchema.parse(data[0])); setCandidates(candidateListSchema.parse(data[3])) }
        setDepartments(departmentListSchema.parse(data[1]))
        setAgents(agentListSchema.parse(tab === 'agents' ? data[0] : data[2]))
        const statusResponse=await fetch('/api/agents/status',{headers,signal:controller.signal})
        if(statusResponse.ok){
          const states=await statusResponse.json() as {agent_id:string;status:string}[]
          if(!controller.signal.aborted)setAgentStates(Object.fromEntries(states.map(item=>[item.agent_id,item.status])))
        } else if(!controller.signal.aborted) setAgentStates({})
      } catch (failure) {
        if (!controller.signal.aborted) {
          setCandidates([]); setTasks([]); setAgents([]); setDepartments([])
          setError(failure instanceof Error ? failure.message : 'Error de conexión.')
        }
      } finally {
        if (!controller.signal.aborted) { setLoading(false); timer=setTimeout(load,10000) }
      }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [accessToken, tab, offset, refresh])

  useEffect(() => {
    const controller = new AbortController()
    if (!selectedAgent) return
    let timer: ReturnType<typeof setTimeout>
    async function loadWork() {
      try {
        const response = await fetch('/api/agents/' + selectedAgent + '/work', {
          headers: { Authorization: 'Bearer ' + accessToken }, signal: controller.signal,
        })
        if (!response.ok) throw new Error('No se pudo cargar el trabajo del agente.')
        const data = agentWorkSchema.parse(await response.json())
        if (!controller.signal.aborted) { setWork(data); setWorkError('') }
      } catch (failure) {
        if (!controller.signal.aborted) { setWork(null); setWorkError(failure instanceof Error ? failure.message : 'Error de conexión.') }
      } finally { if(!controller.signal.aborted) timer=setTimeout(loadWork,5000) }
    }
    void loadWork()
    return () => {controller.abort();clearTimeout(timer)}
  }, [selectedAgent, accessToken, refresh])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (tab === 'candidates') {
        await request('candidates', { method: 'POST', body: JSON.stringify({ address: address.trim() }) })
        setAddress(''); setNotice('Candidato registrado. Las direcciones repetidas conservan su registro.')
      } else {
        await request('tasks', { method: 'POST', body: JSON.stringify({
          title:'Investigar candidato', department_id: departmentId, assigned_agent_id: agentId || null, candidate_id:taskCandidate,request_key:taskKey,
        }) })
        setTaskKey(crypto.randomUUID()); setNotice('Investigación enviada a la cola.')
      }
      setOffset(0); setRefresh(value => value + 1)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
    } finally { setBusy(false) }
  }

  async function cancel(task: Task) {
    setBusy(true); setError(''); setNotice('')
    try {
      await request('tasks/' + task.id, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
      setNotice('Tarea marcada como cancelada.'); setRefresh(value => value + 1)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo cancelar.') }
    finally { setBusy(false) }
  }

  const count = tab === 'candidates' ? candidates.length : tab === 'tasks' ? tasks.length : agents.length
  return <>
    {page === 'office' && agents.length > 0 && <Suspense fallback={<p>Cargando oficina…</p>}><Office agents={agents} states={agentStates} onSelect={id => { setSelectedAgent(id); setWork(null); setWorkError('') }} /></Suspense>}
    <section>
    <h2>{tab === 'candidates' ? 'Candidatos' : tab === 'tasks' ? 'Tareas' : 'Agentes'}</h2>
    {tab === 'candidates' && <form onSubmit={event => void submit(event)}>
      <label>Dirección del token en Solana<input required value={address} onChange={event => setAddress(event.target.value)} /></label>
      <button disabled={busy}>Agregar candidato</button>
    </form>}
    {tab === 'tasks' && <form onSubmit={event => void submit(event)}>
      <p>Selecciona un candidato y un agente para ejecutar una investigación por reglas.</p><label>Candidato<select required value={taskCandidate} onChange={event=>setTaskCandidate(event.target.value)}><option value="">Selecciona un candidato</option>{candidates.map(item=><option key={item.id} value={item.id}>{item.tokens.name ?? item.tokens.address}</option>)}</select></label>
      <label>Departamento<select required value={departmentId} onChange={event => { setDepartmentId(event.target.value); setAgentId('') }}>
        <option value="">Selecciona un departamento</option>
        {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Responsable<select required value={agentId} onChange={event => setAgentId(event.target.value)}>
        <option value="">Sin asignar</option>
        {agents.filter(item => item.department_id === departmentId && item.enabled).map(item =>
          <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <button disabled={busy || !departmentId || !agentId || !taskCandidate}>Crear tarea</button>
    </form>}
    {loading && <p role="status">Cargando…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!loading && !error && count === 0 && <p>Todavía no hay registros en esta página.</p>}
    {tab === 'candidates' && <label>Filtrar esta página<input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Nombre, dirección o estado" /></label>}
    {tab === 'candidates' && selectedCandidate && <section><h3>Investigación del candidato</h3><p className="address">{candidates.find(item=>item.id===selectedCandidate)?.tokens.address ?? selectedCandidate}</p><button onClick={()=>setSelectedCandidate('')}>Cerrar informe</button><Research key={selectedCandidate} id={selectedCandidate} accessToken={accessToken}/></section>}
    <ul>
      {tab === 'candidates' && candidates.filter(item=>[item.tokens.name,item.tokens.symbol,item.tokens.address,item.status,labels[item.status]].join(' ').toLowerCase().includes(filter.toLowerCase())).map(item => <li key={item.id}>
        <strong>{item.tokens.name ?? item.tokens.symbol ?? item.tokens.address.slice(0,6)+'…'+item.tokens.address.slice(-4)}</strong>
        <p className="address">{item.tokens.address}</p>
        <span>{labels[item.status] ?? item.status}</span><div><button onClick={()=>setSelectedCandidate(item.id)}>Ver investigación</button></div>
      </li>)}
      {tab === 'tasks' && tasks.map(item => <li key={item.id}>
        <strong>{item.title}</strong><p>{labels[item.status] ?? item.status}</p>
        {['pending', 'waiting', 'running'].includes(item.status) &&
          <button disabled={busy} onClick={() => void cancel(item)}>Cancelar tarea</button>}
      </li>)}
      {tab === 'agents' && agents.map(item => <li key={item.id}>
        <button onClick={() => { setSelectedAgent(item.id); setWork(null); setWorkError('') }}>{item.name}</button><p>{item.role} · {agentStates[item.id] ? (labels[agentStates[item.id]] ?? agentStates[item.id]) : 'Sin ejecución activa'}</p>
        {selectedAgent === item.id && <div>
          <h3>Trabajo del agente</h3><AgentChat key={item.id} id={item.id} accessToken={accessToken}/>
          {workError && <p role="alert">{workError}</p>}
          {!work && !workError && <p>Cargando trabajo…</p>}
          {work && <>
            {work.tasks.length === 0 && <p>Sin tareas asignadas.</p>}
            {work.tasks.map(task => <p key={task.id}>{task.title} · {labels[task.status] ?? task.status}</p>)}
            <h4>Ejecuciones recientes</h4>
            {work.executions.length === 0 && <p>Sin ejecuciones registradas.</p>}
            {work.executions.map(execution => <p key={execution.id}>
              {execution.status} · {new Date(execution.started_at).toLocaleString()}
              {execution.error_message && <span> · {execution.error_message}</span>}
            </p>)}
            <h4>Entregables</h4>
            {work.deliverables.length === 0 && <p>Sin entregables todavía.</p>}
            {work.deliverables.map(deliverable => <details key={deliverable.id}>
              <summary>{deliverable.name} · revisión {deliverable.revision}</summary>
              {researchReportSchema.safeParse(deliverable.content).success ? <Report report={researchReportSchema.parse(deliverable.content)} /> : <pre>{JSON.stringify(deliverable.content, null, 2)}</pre>}
            </details>)}
          </>}
        </div>}
        <span>{item.enabled ? 'Habilitado para recibir tareas' : 'Deshabilitado'}</span>
      </li>)}
    </ul>
    <div className="pagination">
      <button disabled={loading || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 20))}>Anterior</button>
      <span>Página {offset / 20 + 1}</span>
      <button disabled={loading || count < 20} onClick={() => setOffset(value => value + 20)}>Siguiente</button>
      <button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Actualizar</button>
    </div>
  </section></>
}
