import { researchDetailSchema, type ResearchDetail, type ResearchReport } from '@dakoorp/contracts'
import { useEffect, useState } from 'react'

const statuses: Record<string,string> = {pending:'En cola',running:'Investigando',succeeded:'Completada',failed:'Fallida',cancelled:'Cancelada',insufficient_data:'Datos insuficientes',discarded:'Descartado',review_required:'Revisión requerida',observing:'En observación'}
export function Report({ report }: { report: ResearchReport }) {
  const money = (value: number | null) => value === null ? 'No disponible' : new Intl.NumberFormat('es',{style:'currency',currency:'USD',maximumFractionDigits:6}).format(value)
  return <article className="research-report">
    <h3>{report.market?.name ?? report.market?.symbol ?? "Informe del token"} · {statuses[report.outcome]}</h3><p className="address">{report.address}</p><p>{report.summary}</p>
    <p className="muted">Recibido {new Date(report.received_at).toLocaleString('es')} · Reglas {report.rules_version} · Hora de origen desconocida</p>
    {report.market ? <><div className="report-metrics"><div>Precio<strong>{money(report.market.price_usd)}</strong></div><div>Liquidez<strong>{money(report.market.liquidity_usd)}</strong></div><div>Volumen 5m<strong>{money(report.market.volume_5m_usd)}</strong></div><div>Operaciones 5m<strong>{report.market.swaps_5m ?? 'No disponible'}</strong></div></div><p className="address">Pool · {report.market.pair}</p><p>Protocolo · {report.market.protocol}</p><a className="text-link" href={"https://dexscreener.com/solana/"+encodeURIComponent(report.market.pair)} target="_blank" rel="noreferrer">Ver pool en DEX Screener ↗</a></> : <p>No se encontraron pools compatibles para este token.</p>}
    <ul>{report.checks.map(check=><li key={check.key}><span className={'check-result '+check.result}>{check.result==='pass'?'Cumple':check.result==='fail'?'No cumple':'Pendiente'}</span> <strong>{check.label}</strong><p>{check.detail}</p></li>)}</ul>
    <details><summary>Cobertura y límites</summary><ul>{report.limitations.map(item=><li key={item}>{item}</li>)}</ul></details>
    <details><summary>Evidencia consultada</summary><pre>{JSON.stringify(report.evidence,null,2)}</pre></details>
  </article>
}
export default function Research({id,accessToken}:{id:string;accessToken:string}) {
  const [data,setData]=useState<ResearchDetail|null>(null)
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [requestKey,setRequestKey]=useState(()=>crypto.randomUUID())
  useEffect(()=>{
    const controller=new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load(){
      try {
        const response=await fetch('/api/candidates/'+id+'/research',{headers:{Authorization:'Bearer '+accessToken},signal:controller.signal})
        if(!response.ok) throw new Error('No se pudo cargar la investigación. Comprueba la conexión y la migración del MVP.')
        const next=researchDetailSchema.parse(await response.json())
        if(!controller.signal.aborted){setData(next);setError('')}
      }catch(failure){if(!controller.signal.aborted){setData(null);setError(failure instanceof Error?failure.message:'Error de conexión.')}}
      finally{if(!controller.signal.aborted)timer=setTimeout(load,5000)}
    }
    void load()
    return()=>{controller.abort();clearTimeout(timer)}
  },[id,accessToken,revision])
  async function action(kind:'research'|'watch'){
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/candidates/'+id+'/'+kind,{method:kind==='watch'?'PUT':'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(kind==='watch'?{enabled:!data?.watch?.enabled,interval_minutes:15}:{request_key:requestKey})})
      if(!response.ok)throw new Error('No se pudo guardar la solicitud. Inténtalo de nuevo.')
      if(kind==='research')setRequestKey(crypto.randomUUID())
      setRevision(value=>value+1)
    }catch(failure){setError(failure instanceof Error?failure.message:'Error de conexión.')}
    finally{setBusy(false)}
  }
  const active=data?.jobs.some(job=>['pending','running'].includes(job.status))
  return <div className="research-panel">
    <div className="office-controls"><button disabled={busy || !data || active} onClick={()=>void action('research')}>{active?'Investigación en curso':'Investigar ahora'}</button><button disabled={busy || !data} onClick={()=>void action('watch')}>{data?.watch?.enabled?'Pausar seguimiento':'Seguir cada 15 minutos'}</button></div>
    {error&&<p role="alert">{error}</p>}
    {!data&&!error&&<p role="status">Cargando investigación…</p>}
    {data?.watch?.enabled&&<p>Seguimiento activo. Próxima revisión a partir de {new Date(data.watch.next_run_at).toLocaleString('es')}.</p>}
    {data?.jobs[0]&&<p role="status">Último trabajo · {statuses[data.jobs[0].status]} · Intentos {data.jobs[0].attempts}/3</p>}
    {data&&data.reports.length===0&&<p>Aún no hay informes. Solicita una investigación para recopilar evidencia.</p>}
    {data?.reports[0]&&<Report report={data.reports[0].report}/>}
    {data&&data.reports.length>1&&<details><summary>Informes anteriores ({data.reports.length-1})</summary>{data.reports.slice(1).map(item=><Report key={item.id} report={item.report}/>)}</details>}
  </div>
}
