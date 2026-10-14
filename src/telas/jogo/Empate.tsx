import { useEffect, useRef, useState } from 'react'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { Moeda } from '../../components/Moeda'
import { empate, empateSaemOsDois } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Estado, Lado } from '../../types/pelada'
import { somDeMoeda } from '../../utils/sons'

// Cara = time da esquerda (A), Coroa = time da direita (B)
export function Empate({ pelada, onEncerrar, onFechar }: {
  pelada: Pelada; onEncerrar: (saem: Lado[], encerrar: (e: Estado) => Estado) => void; onFechar: () => void
}) {
  const { estado } = pelada.app
  const [fase, setFase] = useState<'parada' | 'girando' | 'pronta'>('parada')
  const [lado, setLado] = useState<Lado>('A')
  const timer = useRef<number>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!estado.emCampo) return null
  const { coletes } = estado.config
  const saemOsDois = empateSaemOsDois(estado)
  const sorteado = coletes[lado].nome
  const outro = coletes[lado === 'A' ? 'B' : 'A'].nome

  const jogar = () => {
    if (fase === 'girando') return
    setLado(Math.random() < 0.5 ? 'A' : 'B')
    setFase('girando')
    if (estado.config.som) somDeMoeda(1.4)
    timer.current = window.setTimeout(() => setFase('pronta'), 1400)
  }
  const confirmar = () => {
    onFechar()
    onEncerrar(saemOsDois ? ['A', 'B'] : [lado], (e) => empate(e, lado))
  }

  const face = fase === 'parada' ? '?' : lado === 'A' ? 'Cara' : 'Coroa'
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Empate">
      <section className="panel">
        <div className="ph">
          Empate! {estado.placar[0]} - {estado.placar[1]}
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </button>
        </div>
        <div className="pb row" style={{ alignItems: 'flex-start', gap: 8 }}>
          <Icone nome="info" tamanho={20} />
          <span className="mut" style={{ color: 'var(--navy)' }}>
            {saemOsDois
              ? <>Tem 2 times completos esperando: <b>saem os dois</b>. A moeda decide quem entra primeiro na fila.</>
              : <>Não tem 2 times completos esperando: <b>a moeda decide quem sai</b>.</>}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderTop: '2px solid #e3e8d6' }}>
          {([['Cara', 'A'], ['Coroa', 'B']] as const).map(([face, l]) => (
            <div key={face} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10, gap: 4 }}>
              <span className="tag t-y">{face}</span>
              <span className="num" style={{ fontSize: 22, textTransform: 'uppercase' }}>Time {estado.emCampo![l].numero}</span>
              <span className="row num" style={{ gap: 6, fontSize: 15, textTransform: 'uppercase', color: 'var(--mut)' }}>
                <Camisa cor={coletes[l].cor} tamanho={20} />{coletes[l].nome}
              </span>
            </div>
          ))}
        </div>
        <div className="palco" style={{ background: 'var(--grama)' }}>
          <Moeda resultado={fase !== 'parada' && lado === 'B' ? 'coroa' : 'cara'} girando={fase === 'girando'} parada={fase === 'parada'} onClick={jogar} />
          {fase === 'pronta' ? (
            <div className="led" style={{ textAlign: 'center', padding: '10px 18px' }}>
              <div className="num" style={{ fontSize: 26, textTransform: 'uppercase' }}>Deu {face}</div>
              <div style={{ color: '#fff', fontWeight: 600, marginTop: 4 }}>
                {saemOsDois ? `${sorteado} primeiro na fila` : `${outro} fica`}
              </div>
            </div>
          ) : (
            <div style={{ color: '#fff', fontWeight: 600 }}>{fase === 'parada' ? 'Toque na moeda para jogar' : 'Girando…'}</div>
          )}
        </div>
        <div className="pb">
          {fase === 'pronta'
            ? <button className="btn" onClick={confirmar}>Confirmar e seguir <Icone nome="seta" /></button>
            : <button className="btn" onClick={jogar} disabled={fase === 'girando'}>Jogar moeda</button>}
        </div>
      </section>
    </div>
  )
}
