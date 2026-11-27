import ResearchSummary from './ResearchSummary'
import LocalModelStatus from './LocalModelStatus'
import ResearchControls from './ResearchControls'
import Workspace from './Workspace'
import { activityListSchema, type Activity } from '@dakoorp/contracts'
import { useEffect, useState } from 'react'
import './App.css'


const pages = [
  ['dashboard', 'Dashboard', '◫', 'Una vista general de tu departamento.'],
  ['office', 'Oficina', '◇', 'Tu equipo, en un mismo espacio.'],
  ['agents', 'Agentes', '◎', 'Responsabilidades, tareas y entregables.'],
  ['candidates', 'Candidatos', '⌕', 'Organiza los tokens que quieres investigar.'],
  ['tasks', 'Tareas', '☷', 'Asigna trabajo y consulta su progreso.'],
  ['activity', 'Actividad', '↗', 'El registro de lo que ocurre en Dakoorp.'],
  ['settings', 'Configuración', '⚙', 'El alcance y las condiciones de tu piloto.'],
] as const
type Page = typeof pages[number][0]
function readPage(): Page {
  const value = window.location.hash.slice(1).split('/')[0]
  return pages.find(item => item[0] === value)?.[0] ?? 'dashboard'
}

function App({ accessToken, email, onLogout }: { accessToken: string; email?: string; onLogout: () => void }) {
  const [candidateRoute,setCandidateRoute]=useState(()=>window.location.hash.split('/')[1])
  const [page, setPage] = useState(readPage)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const change = () => { setPage(readPage()); setCandidateRoute(window.location.hash.split('/')[1]); setMenuOpen(false) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  const [events, setEvents] = useState<Activity[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      try {
        const response = await fetch('/api/activity', {
          headers: { Authorization: 'Bearer ' + accessToken },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        })
        if (!response.ok) throw new Error(response.status === 403 ? 'Esta cuenta no tiene acceso a la oficina.' : 'No se pudo actualizar la actividad.')
        const data = activityListSchema.parse(await response.json())
        if (controller.signal.aborted) return
        setEvents(data)
        setError('')
      } catch (failure) {
        if (!controller.signal.aborted) {
          setEvents([])
          setError(failure instanceof Error ? failure.message : 'No se pudo actualizar.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          timer = setTimeout(refresh, 10000)
        }
      }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [accessToken])

  const latest = events[0]
  const current = pages.find(item => item[0] === page)!
  const activity = <section className="activity-panel">
    <div className="section-heading"><h2>Actividad reciente</h2><span className="badge">Últimos {events.length} registros</span></div>
    {loading && <p role="status">Cargando actividad…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && events.length === 0 && <div className="empty-state">Tu actividad aparecerá aquí cuando el sistema registre su primera comprobación.</div>}
    <ul>{events.map(event => <li key={event.id} className="event-row">
      <span className={'event-dot ' + event.status} aria-hidden="true" />
      <div><strong>{event.status === 'success' ? 'Actividad completada' : 'Actividad con error'}</strong><p>{event.summary}</p>
      <time dateTime={event.observed_at}>{new Date(event.observed_at).toLocaleString()}</time></div>
    </li>)}</ul>
  </section>
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Ir al contenido</a>
    <aside className={'sidebar ' + (menuOpen ? 'is-open' : '')}>
      <a className="brand" href="#dashboard"><span className="brand-mark">D</span><span>Dakoorp<small>VIRTUAL WORKSPACE</small></span></a>
      <div className="department-switch"><span className="department-icon">◈</span><div>Trading de memecoins<small>Solana · Oficina privada</small></div></div>
      <p className="nav-caption">ESPACIO DE TRABAJO</p>
      <nav aria-label="Navegación principal">{pages.map(([id, label, icon]) => <a key={id} href={'#' + id} aria-current={page === id ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{label}</a>)}</nav>
      <div className="sidebar-bottom"><div className="pilot-note"><span className="status-dot" /> Piloto con reglas<small>IA de pago desactivada</small></div>
      <div className="account"><span className="avatar">D</span><div><strong>Mi oficina</strong><small>{email}</small></div></div><button className="logout" onClick={onLogout}>Cerrar sesión</button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><button className="menu-toggle" aria-expanded={menuOpen} aria-label="Abrir navegación" onClick={() => setMenuOpen(value => !value)}>☰</button><span>Mi oficina <span className="breadcrumb">/ {current[1]}</span></span><span className="badge">Solana · Piloto</span></header>
      <main id="main-content" tabIndex={-1}>
        <div className="page-heading"><div><p className="eyebrow">DEPARTAMENTO DE TRADING</p><h1>{current[1]}</h1><p>{current[3]}</p></div><a className="primary-action" href="#tasks">+ Nueva tarea</a></div>
        {page === 'dashboard' && <>
          <div className="welcome-card"><div><span className="badge">TU CENTRO DE OPERACIONES</span><h2>Todo tu equipo.<br />Una sola oficina.</h2><p>Consulta la actividad, organiza candidatos y prepara el trabajo de tus agentes.</p><a className="primary-action" href="#office">Entrar a la oficina <span aria-hidden="true">↗</span></a></div><div className="welcome-art" aria-hidden="true"><span>◇</span><span>◇</span><span>◇</span></div></div>
          <ResearchSummary accessToken={accessToken}/>
          <div className="dashboard-grid">{activity}<section><p className="eyebrow">ESTADO DEL PILOTO</p><h2>Investigación por reglas</h2><p>Solicita una investigación desde Candidatos. El worker ejecuta las reglas y guarda el informe.</p><div className="info-row"><span>Fuente inicial</span><strong>DEX Screener</strong></div><div className="info-row"><span>Presupuesto de IA</span><strong>USD 0</strong></div><p className="muted">{latest ? 'Última observación · ' + new Date(latest.observed_at).toLocaleString() : 'Sin observaciones disponibles.'}</p><a className="text-link" href="#agents">Ver agentes →</a></section></div>
        </>}
        {page === 'activity' && <>{activity}<ResearchControls accessToken={accessToken}/></>}
        {['office', 'agents', 'candidates', 'tasks'].includes(page) && <Workspace key={page + (candidateRoute ?? '')} initialCandidate={candidateRoute} accessToken={accessToken} page={page as 'office' | 'agents' | 'candidates' | 'tasks'} />}
        {page === 'settings' && <><ResearchControls accessToken={accessToken}/><section><h2>Condiciones del piloto</h2><LocalModelStatus accessToken={accessToken}/><p>La primera versión utiliza fuentes gratuitas confirmadas y reglas programadas.</p><div className="info-row"><span>Red</span><strong>Solana</strong></div><div className="info-row"><span>IA de pago</span><strong>Desactivada · USD 0</strong></div><div className="info-row"><span>Modelo local</span><strong>Qwen3 · Ollama local</strong></div><p className="muted">La conversación está disponible en el panel de cada agente cuando Ollama está ejecutándose en tu ordenador.</p></section></>}
      </main>
    </div>
  </div>
}
export default App
