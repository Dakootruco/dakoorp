import { researchSummarySchema, type ResearchSummary as Summary } from '@dakoorp/contracts'
import { useEffect, useState } from 'react'
export default function ResearchSummary({accessToken}:{accessToken:string}){
 const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(false)
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>
  async function load(){
   try{
    const response=await fetch('/api/research/summary',{headers:{Authorization:'Bearer '+accessToken},signal:controller.signal})
    if(!response.ok)throw new Error()
    const summary=researchSummarySchema.parse(await response.json())
    if(!controller.signal.aborted){setData(summary);setError(false)}
   }catch{if(!controller.signal.aborted){setData(null);setError(true)}}
   finally{if(!controller.signal.aborted)timer=setTimeout(load,30000)}
  }
  void load();return()=>{controller.abort();clearTimeout(timer)}
 },[accessToken])
 return <><div className="stat-grid research-stats">{([
 ['candidates','Candidatos registrados','#candidates'],['reports','Informes completados','#agents'],['active','Investigaciones activas','#tasks'],['alerts','Avisos pendientes','#activity'],
 ] as const).map(([key,label,href])=><section key={key}><span>{label}</span><strong>{data?.[key]??'—'}</strong><a className="text-link" href={href}>Consultar →</a></section>)}</div>{error&&<p role="status">No se pudieron actualizar los totales de investigación.</p>}</>
}
