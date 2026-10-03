import { Camisa } from '../../components/Camisa'
import type { Colete, Estado, Time } from '../../types/pelada'
import { formatarTempo } from '../../utils/formatar'

// Painel do placar: tempo, times e gols.
export function Placar({ estado, decorrido, rodando, fim }: {
  estado: Estado; decorrido: number; rodando: boolean; fim: boolean
}) {
  const { config, placar, emCampo } = estado
  const totalMs = config.tempoMin * 60_000
  if (!emCampo) return null

  return (
    <section className="led" style={{ padding: '12px 12px 14px' }}>
      <div className="row num" style={{ justifyContent: 'space-between', color: '#c9d4e3', fontWeight: 700, letterSpacing: 1, fontSize: 15 }}>
        <span>{config.tempoMin} MIN</span>
        {fim
          ? <span className="alerta" style={{ color: 'var(--amarelo)', fontSize: 18 }}>FIM DE JOGO!</span>
          : <span style={{ color: rodando ? 'var(--amarelo)' : '#c9d4e3' }}>{rodando ? '● AO VIVO' : 'PAUSADO'}</span>}
        <span>{config.gols} GOLS</span>
      </div>
      <div className="num" style={{ textAlign: 'center', fontSize: 44, marginTop: 6, color: decorrido >= totalMs ? 'var(--vermelho)' : 'var(--amarelo)' }}>
        {formatarTempo(Math.min(decorrido, totalMs))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'center', textAlign: 'center', marginTop: 8 }}>
        <TimeNoPlacar time={emCampo.A} colete={config.coletes.A} />
        <div className="num" style={{ fontSize: 64 }}>
          {placar[0]}<span style={{ color: '#5e6a76', fontSize: 40, margin: '0 6px' }}>-</span>{placar[1]}
        </div>
        <TimeNoPlacar time={emCampo.B} colete={config.coletes.B} />
      </div>
      <div style={{ height: 6, borderRadius: 2, background: '#26313c', marginTop: 12, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (decorrido / totalMs) * 100)}%`, height: '100%', background: 'var(--amarelo)' }} />
      </div>
    </section>
  )
}

// "TIME 3" e, embaixo, a camisa e a cor do colete.
function TimeNoPlacar({ time, colete }: { time: Time; colete: Colete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span className="num" style={{ fontSize: 24, color: '#fff', textTransform: 'uppercase' }}>Time {time.numero}</span>
      <Camisa cor={colete.cor} tamanho={36} contorno="#fff" />
      <span className="num" style={{ fontSize: 15, color: '#c9d4e3', textTransform: 'uppercase', letterSpacing: 1 }}>{colete.nome}</span>
    </div>
  )
}
