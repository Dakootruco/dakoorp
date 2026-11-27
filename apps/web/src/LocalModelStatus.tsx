import { useEffect, useState } from 'react'
export default function LocalModelStatus({accessToken}:{accessToken:string}){
 const [available,setAvailable]=useState<boolean|null>(null)
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>
  async function load(){
   try{
    const response=await fetch('/api/local-model',{headers:{Authorization:'Bearer '+accessToken},signal:controller.signal})
    if(!response.ok)throw new Error()
    const data=await response.json() as {available:boolean}
    if(!controller.signal.aborted)setAvailable(data.available)
   }catch{if(!controller.signal.aborted)setAvailable(null)}
   finally{if(!controller.signal.aborted)timer=setTimeout(load,15000)}
  }
  void load();return()=>{controller.abort();clearTimeout(timer)}
 },[accessToken])
 return <div className="info-row"><span>Conversación local</span><strong>{available===null?'Estado no disponible':available?'Qwen3 disponible':'Inicia Ollama e instala qwen3:1.7b'}</strong></div>
}
