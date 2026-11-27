import { useEffect, useState } from 'react'

type Alert = {id:string;candidate_id:string;message:string;created_at:string}
export default function ResearchControls({accessToken}:{accessToken:string}){
 const [enabled,setEnabled]=useState<boolean|null>(null),[alerts,setAlerts]=useState<Alert[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{
  const controller=new AbortController()
  let timer: ReturnType<typeof setTimeout>
  async function load(){
   try{
    const results=await Promise.all(['settings','alerts'].map(async path=>{
     const response=await fetch('/api/research/'+path,{headers:{Authorization:'Bearer '+accessToken},signal:controller.signal})
     if(!response.ok)throw new Error('No se pudo cargar el estado de investigación.')
     return response.json()
    }))
    if(!controller.signal.aborted){setEnabled(results[0].enabled);setAlerts(results[1]);setError('')}
   }catch{if(!controller.signal.aborted){setEnabled(null);setAlerts([]);setError('Investigación no disponible. Comprueba la conexión y la migración del MVP.')}}
   finally{if(!controller.signal.aborted)timer=setTimeout(load,10000)}
  }
  void load();return()=>{controller.abort();clearTimeout(timer)}
 },[accessToken])
 async function update(path:string,body:unknown,method:string){
  setBusy(true)
  try{
   const response=await fetch('/api/research/'+path,{method,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)})
   if(!response.ok)throw new Error()
   if(path==='settings')setEnabled(!enabled)
   else setAlerts(values=>values.filter(item=>!path.includes(item.id)))
   setError('')
  }catch{setError('No se pudo guardar el cambio.')}finally{setBusy(false)}
 }
 return <section><h2>Descubrimiento y avisos</h2><p>Consulta hasta cinco perfiles públicos de Solana cada cinco minutos. La cobertura depende de DEX Screener y no incluye todos los lanzamientos. Requiere el worker en ejecución.</p><button disabled={enabled===null||busy} onClick={()=>void update('settings',{enabled:!enabled},'PUT')}>{enabled?'Pausar descubrimiento':'Activar descubrimiento'}</button>{error&&<p role="alert">{error}</p>}<h3>Avisos pendientes</h3>{!error&&alerts.length===0&&<p>No hay avisos pendientes.</p>}<ul>{alerts.map(item=><li key={item.id}><strong>{item.message}</strong><p className="address">Candidato · {item.candidate_id}</p><a className="text-link" href={'#candidates/'+item.candidate_id}>Ver candidato →</a><button disabled={busy} onClick={()=>void update('alerts/'+item.id+'/acknowledge',{},'POST')}>Marcar como revisado</button></li>)}</ul></section>
}
