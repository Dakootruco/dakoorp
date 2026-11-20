import { useEffect, useState } from 'react'
import './App.css'

type Activity = { id: string; observed_at: string; status: string; summary: string }

function App() {
  const [events, setEvents] = useState<Activity[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      try {
        const response = await fetch('/api/activity', {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        })
        if (!response.ok) throw new Error()
        const data: Activity[] = await response.json()
        if (controller.signal.aborted) return
        setEvents(data)
        setError('')
      } catch {
        if (!controller.signal.aborted) setError('No se pudo actualizar. Comprueba que la API esté ejecutándose.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          timer = setTimeout(refresh, 10000)
        }
      }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])

  const latest = events[0]
  return (
    <main>
      <header><span>Dakoorp</span><h1>Departamento de trading</h1></header>
      <section>
        <h2>Monitor de mercado</h2>
        <p>Comprobaciones de DEX Screener para pares de SOL.</p>
        <p aria-live="polite">{loading ? 'Cargando actividad…' : latest
          ? 'Última comprobación · ' + new Date(latest.observed_at).toLocaleString()
          : 'Esperando la primera comprobación.'}</p>
        {error && <p role="alert">{error}</p>}
      </section>
      <section>
        <h2>Actividad reciente</h2>
        <ul>{events.map(event => (
          <li key={event.id}>
            <strong>{event.status === 'success' ? 'Completada' : 'Error'}</strong>
            <p>{event.summary}</p>
            <time dateTime={event.observed_at}>{new Date(event.observed_at).toLocaleString()}</time>
          </li>
        ))}</ul>
      </section>
    </main>
  )
}
export default App
