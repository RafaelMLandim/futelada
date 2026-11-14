import type { Lado, Placar } from '../types/pelada'
import { formatarTempo } from '../utils/formatar'
import { Camisa } from './Camisa'
import type { Uniforme } from '../types/torneio'

export type LadoDoPlacar = { titulo: string; sub?: string; cor: string; uniforme?: Uniforme }

// Painel do placar (pelada e torneio): tempo, times e gols.
export function PlacarLed({ lados, placar, tempoMin, gols, decorrido, rodando, fim, acrescimoMin, periodo, textoFim = 'FIM DE JOGO!' }: {
  lados: Record<Lado, LadoDoPlacar>; placar: Placar; tempoMin: number; gols: number | null // null = só o tempo
  decorrido: number; rodando: boolean; fim: boolean
  acrescimoMin?: number // acréscimos dados: o relógio para em 10:00 e embaixo corre o acréscimo
  periodo?: string // torneio com vários tempos: "2º tempo", "Prorrogação"…
  textoFim?: string // ex.: "FIM DO 1º TEMPO"
}) {
  const totalMs = tempoMin * 60_000
  return (
    <section className="led" style={{ padding: '12px 12px 14px' }}>
      {/* três colunas: o do meio fica no centro do placar, mesmo com os textos dos lados de larguras diferentes */}
      <div className="num" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, color: '#c9d4e3', fontWeight: 700, letterSpacing: 1, fontSize: 15 }}>
        <span>{tempoMin} MIN</span>
        {fim
          ? <span className="alerta" style={{ color: 'var(--amarelo)', fontSize: 18 }}>{textoFim}</span>
          : <span style={{ color: rodando ? 'var(--amarelo)' : '#c9d4e3' }}>{rodando ? '● AO VIVO' : 'PAUSADO'}</span>}
        <span style={{ textAlign: 'right' }}>{gols === null ? 'SÓ TEMPO' : `${gols} GOLS`}</span>
      </div>
      {periodo && (
        <div className="num" style={{ textAlign: 'center', fontSize: 16, letterSpacing: 1, color: '#fff', textTransform: 'uppercase', marginTop: 6 }}>{periodo}</div>
      )}
      <div className="num" style={{ textAlign: 'center', fontSize: 44, marginTop: periodo ? 0 : 6, color: decorrido >= totalMs ? 'var(--vermelho)' : 'var(--amarelo)' }}>
        {formatarTempo(Math.min(decorrido, totalMs))}
      </div>
      {(acrescimoMin || decorrido - totalMs >= 1000) && (
        <div className="num" style={{ textAlign: 'center', fontSize: 18, color: '#ffb39e', marginTop: 2 }} aria-label="Acréscimos">
          +{formatarTempo(Math.min(Math.max(0, decorrido - totalMs), (acrescimoMin ?? Infinity) * 60_000))}
          <span style={{ fontSize: 12, letterSpacing: 1 }}>{acrescimoMin ? ` DE +${acrescimoMin} MIN` : ''} ACRÉSCIMOS</span>
        </div>
      )}
      {/* o placar nunca quebra de linha: os nomes dos lados é que encolhem (com reticências); com dois dígitos, a fonte diminui no celular estreito */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', columnGap: 8, alignItems: 'center', textAlign: 'center', marginTop: 8 }}>
        <TimeNoPlacar lado={lados.A} />
        <div className="num" style={{ fontSize: placar[0] >= 10 || placar[1] >= 10 ? 'clamp(44px, 14vw, 64px)' : 64, whiteSpace: 'nowrap' }}>
          {placar[0]}<span style={{ color: '#5e6a76', fontSize: 40, margin: '0 6px' }}>-</span>{placar[1]}
        </div>
        <TimeNoPlacar lado={lados.B} />
      </div>
      <div style={{ height: 6, borderRadius: 2, background: '#26313c', marginTop: 12, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (decorrido / totalMs) * 100)}%`, height: '100%', background: 'var(--amarelo)' }} />
      </div>
    </section>
  )
}

// Nome do time e, embaixo, a camisa e um subtítulo (ex.: a cor do colete).
function TimeNoPlacar({ lado }: { lado: LadoDoPlacar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span className="num" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lado.titulo}</span>
      <Camisa cor={lado.cor} uniforme={lado.uniforme} tamanho={36} contorno="#fff" />
      {lado.sub && <span className="num" style={{ fontSize: 15, color: '#c9d4e3', textTransform: 'uppercase', letterSpacing: 1 }}>{lado.sub}</span>}
    </div>
  )
}
