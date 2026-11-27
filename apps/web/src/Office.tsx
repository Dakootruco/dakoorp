import { Application, Container, Graphics, Text } from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import type { Agent } from '@dakoorp/contracts'

type Props = { agents: Agent[]; onSelect: (id: string) => void; states?: Record<string,string> }

export default function Office({ agents, onSelect, states = {} }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const callback = useRef(onSelect)
  useEffect(() => { callback.current = onSelect }, [onSelect])
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let disposed = false
    let ready = false
    const app = new Application()
    const element = host.current
    if (!element) return
    let observer: ResizeObserver | undefined
    async function initialize() {
      try {
        await app.init({ width: element!.clientWidth, height: 460, background: '#101c24', antialias: false })
        ready = true
        if (disposed) { app.destroy(true, { children: true }); return }
        element!.appendChild(app.canvas)
        app.canvas.setAttribute('aria-hidden', 'true')
        const scene = new Container()
        app.stage.addChild(scene)
        const floor = new Graphics()
        floor.poly([360,150,104,278,104,182,360,54]).fill(0x314653)
        floor.poly([360,150,616,278,616,182,360,54]).fill(0x243a48)
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            const px = 360 + (x - y) * 32
            const py = 150 + (x + y) * 16
            floor.poly([px,py,px+32,py+16,px,py+32,px-32,py+16])
              .fill((x+y)%2 ? 0x24343e : 0x293c47)
              .stroke({ width: 1, color: 0x344952 })
          }
        }
        floor.poly([104,278,360,406,616,278,616,290,360,418,104,290]).fill(0x172831)
        scene.addChild(floor)
        const colors = [0x7dd3b0, 0xb5a2ee, 0xf0be75]
        const places = [[2,2],[5,2],[2,5]]
        agents.slice(0,3).forEach((agent, index) => {
          const [x,y] = places[index]
          const desk = new Container()
          desk.position.set(360+(x-y)*32, 150+(x+y)*16)
          const art = new Graphics()
          art.poly([-36,-14,0,-32,36,-14,0,4]).fill(0x9e795c)
          art.poly([-36,-14,0,4,0,14,-36,-4]).fill(0x705441)
          art.poly([0,4,36,-14,36,-4,0,14]).fill(0x826148)
          art.rect(-26,-3,5,24).fill(0x463d37)
          art.rect(22,-3,5,24).fill(0x463d37)
          art.rect(-14,-44,29,23).fill(0x101820)
          art.rect(-11,-41,23,17).fill(agent.enabled ? 0x7dd3b0 : 0x385460)
          art.rect(-3,-21,5,9).fill(0x111d25)
          art.rect(-9,-12,17,3).fill(0x172831)
          // Original pixel avatar built from square shapes.
          art.rect(-11,6,22,10).fill(0x222434)
          art.rect(-9,14,18,18).fill(0xe8b88e)
          art.rect(-11,11,22,7).fill(0x222434)
          art.rect(-5,22,3,3).fill(0x212631)
          art.rect(4,22,3,3).fill(0x212631)
          art.rect(-12,32,24,20).fill(colors[index])
          art.rect(-17,34,5,15).fill(0xe8b88e)
          art.rect(12,34,5,15).fill(0xe8b88e)
          art.rect(-10,52,8,12).fill(0x18232c)
          art.rect(3,52,8,12).fill(0x18232c)
          art.rect(-13,62,11,4).fill(0x0a1218)
          art.rect(3,62,12,4).fill(0x0a1218)
          desk.addChild(art)
          if (states[agent.id] === 'running' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            app.ticker.add(() => { art.y = Math.sin(performance.now()/250)*2 })
          }
          const label = new Text({ text: agent.name + (states[agent.id] === 'running' ? ' · trabajando' : ''), style: { fontFamily: 'monospace', fontSize: 12, fill: '#e4e9ef' } })
          label.anchor.set(.5,0)
          label.position.set(0,75)
          desk.addChild(label)
          desk.eventMode = 'static'
          desk.cursor = 'pointer'
          desk.on('pointertap', () => callback.current(agent.id))
          scene.addChild(desk)
        })
        function resize() {
          app.renderer.resize(element!.clientWidth, 460)
          scene.position.set((element!.clientWidth - 720) / 2, 0)
          const scale = Math.min(1, element!.clientWidth / 720)
          scene.scale.set(scale)
          scene.position.set((element!.clientWidth - 720 * scale) / 2, (460 - 460 * scale) / 2)
        }
        observer = new ResizeObserver(resize)
        observer.observe(element!)
        resize()
        if (!Object.values(states).includes('running') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) app.stop()
        app.render()
        observer.disconnect()
        observer = new ResizeObserver(() => { resize(); app.render() })
        observer.observe(element!)
      } catch {
        if (!disposed) setError('La vista de oficina no está disponible. Puedes seleccionar los agentes en la lista.')
      }
    }
    void initialize()
    return () => {
      disposed = true
      observer?.disconnect()
      if (ready) app.destroy(true, { children: true })
    }
  }, [agents, states])

  useEffect(() => {
    // CSS zoom preserves the pixel scene while keeping keyboard controls in HTML.
    if (host.current) host.current.style.setProperty('--office-zoom', String(zoom))
  }, [zoom])

  return <section>
    <h2>Oficina</h2>
    <div className="office-controls">
      <button onClick={() => setZoom(value => Math.max(.75, value-.25))} disabled={zoom<=.75}>Alejar</button>
      <button onClick={() => setZoom(value => Math.min(1.5, value+.25))} disabled={zoom>=1.5}>Acercar</button>
      <button onClick={() => setZoom(1)}>Restablecer</button>
    </div>
    <div className="office-scroll"><div ref={host} className="office-canvas" /></div>
    {error && <p role="status">{error}</p>}
    <div className="office-controls">
      {agents.map(agent => <button key={agent.id} onClick={() => onSelect(agent.id)}>{agent.name}</button>)}
    </div>
  </section>
}
