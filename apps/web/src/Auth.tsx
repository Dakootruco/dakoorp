import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent } from 'react'
import App from './App'

export default function Auth() {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let unsubscribe: (() => void) | undefined
    async function initialize() {
      try {
        const response = await fetch('/api/auth-config', { signal: controller.signal })
        if (!response.ok) throw new Error('El acceso necesita configuración. Revisa el propietario y la clave pública del backend.')
        const config = await response.json() as { url: string; publishableKey: string }
        const supabase = createClient(config.url, config.publishableKey)
        if (controller.signal.aborted) return
        setClient(supabase)
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!controller.signal.aborted) {
            setSession(nextSession)
            setLoading(false)
          }
        })
        unsubscribe = () => data.subscription.unsubscribe()
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'No se pudo iniciar la sesión.')
          setLoading(false)
        }
      }
    }
    void initialize()
    return () => { controller.abort(); unsubscribe?.() }
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    setError('')
    try {
      const result = await client.auth.signInWithPassword({ email, password })
      if (result.error) setError('No se pudo iniciar sesión. Revisa el correo y la contraseña.')
      else setPassword('')
    } catch {
      setError('No se pudo conectar con el servicio de acceso.')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (!client) return
    setError('')
    const { error: failure } = await client.auth.signOut({ scope: 'local' })
    if (failure) setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
  }

  if (loading) return <main className="login-page"><p role="status">Cargando sesión…</p></main>
  if (session && client) return <>
    {error && <p role="alert">{error}</p>}
    <App key={session.user.id} accessToken={session.access_token} email={session.user.email} onLogout={() => void logout()} />
  </>
  return <main className="login-page">
    <header><span>Dakoorp</span><h1>Accede a tu oficina</h1></header>
    <form onSubmit={event => void login(event)}>
      <label>Correo<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button disabled={!client || busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </main>
}
