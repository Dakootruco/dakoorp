import { useEffect, useRef, useState, type FormEvent } from 'react'
type Message={role:'user'|'assistant';content:string}
export default function AgentChat({id,accessToken}:{id:string;accessToken:string}){
 const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const controller=useRef<AbortController|null>(null)
 useEffect(()=>()=>controller.current?.abort(),[])
 async function send(event:FormEvent){
  event.preventDefault();if(busy||!draft.trim())return
  const next:Message[]=[...messages.slice(-6),{role:'user',content:draft.trim()}]
  while(next.length>1 && next.reduce((total,item)=>total+item.content.length,0)>4000) next.shift()
  setBusy(true);setError('');controller.current=new AbortController()
  try{
   const response=await fetch('/api/agents/'+id+'/chat',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},signal:controller.current.signal,body:JSON.stringify({messages:next})})
   const data=await response.json() as {content?:string;error?:string}
   if(!response.ok||!data.content)throw new Error(data.error??'No se pudo obtener una respuesta.')
   setMessages([...next,{role:'assistant',content:data.content}]);setDraft('')
  }catch(failure){if(!controller.current.signal.aborted)setError(failure instanceof Error?failure.message:'Error de conexión.')}
  finally{setBusy(false)}
 }
 return <section><h3>Conversación local</h3><p className="muted">Qwen3 · Solo consulta. Puede equivocarse; contrasta la respuesta con los informes. Esta conversación se conserva mientras permanezcas en este panel.</p><div aria-live="polite">{messages.map((message,index)=><div className={'chat-message '+message.role} key={index}><strong>{message.role==='user'?'Tú':'Agente'}</strong><p>{message.content}</p></div>)}</div><form onSubmit={event=>void send(event)}><label>Mensaje al agente<textarea required maxLength={2000} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="¿Qué has investigado y qué información falta?"/></label><button disabled={busy||!draft.trim()}>{busy?'Respondiendo en tu ordenador…':'Enviar mensaje'}</button></form>{error&&<p role="alert">{error}</p>}</section>
}
