import { CartoesDoJogador } from '../../components/Cartao'
import { Subiu } from '../../components/Subiu'
import { LADOS, cartoesDoJogador, subiuDe, escolherGoleiro, expulso, restanteAzul, trocarGoleiros } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Colete, Jogador, Lado, Partida } from '../../types/pelada'
import { textoSobre } from '../../utils/cores'
import { formatarTempo } from '../../utils/formatar'

type Resultado = 'venceu' | 'perdeu' | 'empatou'

function resultadoDe(partida: Partida, lado: Lado): Resultado {
  if (partida.resultado === 'empate') return 'empatou'
  return partida.resultado === lado ? 'venceu' : 'perdeu'
}

const ROTULO: Record<Resultado, { texto: string; classe: string }> = {
  venceu: { texto: 'Venceu', classe: 't-ok' },
  perdeu: { texto: 'Perdeu', classe: 't-warn' },
  empatou: { texto: 'Empatou', classe: 't-y' },
}

/** Faixa na cor do colete com o número do time (e a etiqueta do fim de partida). */
function FaixaDoTime({ numero, colete, etiqueta }: { numero: number; colete: Colete; etiqueta: { texto: string; classe: string } | null }) {
  return (
    <div className="num" style={{ padding: '6px 10px', textTransform: 'uppercase', background: colete.cor, color: textoSobre(colete.cor), display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18 }}>Time {numero}</div>
        <div style={{ fontSize: 13, letterSpacing: 1, opacity: .85 }}>{colete.nome}</div>
      </div>
      {etiqueta && <span className={`tag ${etiqueta.classe}`} style={{ border: '1px solid #0b1a2c' }}>{etiqueta.texto}</span>}
    </div>
  )
}

// Os dois times em campo, com goleiro fixo, gols e cartões. Tocar no jogador abre as ações.
export function Escalacoes({ pelada, decorrido, transicao, onJogador }: {
  pelada: Pelada; decorrido: number; transicao: Partida | null; onJogador: (lado: Lado, jogador: Jogador) => void
}) {
  const { app, aplicar } = pelada
  const { estado } = app
  const { emCampo, config, goleiros } = estado
  if (!emCampo) return null

  const { A, B } = emCampo
  const lider = A.vitoriasSeguidas >= B.vitoriasSeguidas ? A : B

  // Fim de partida: por alguns segundos, a coluna de quem saiu recebe um X e os
  // nomes dão lugar aos do time que entra; a coluna de quem ficou mostra o resultado.
  const coluna = (lado: Lado) => {
    const time = emCampo[lado]
    const colete = config.coletes[lado]
    const antes = transicao ? (lado === 'A' ? transicao.timeA : transicao.timeB) : null
    const trocou = antes !== null && antes.numero !== time.numero
    const resultado = transicao ? resultadoDe(transicao, lado) : null
    const etiqueta = trocou ? { texto: '↑ Entra', classe: 't-y' } : resultado ? ROTULO[resultado] : null

    const atual = (
      <div>
        <FaixaDoTime numero={time.numero} colete={colete} etiqueta={etiqueta} />
        {config.goleiros.length > 0 && (
          <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
            <span className="no g">G</span>
            <label className="nome" style={{ display: 'flex' }}>
              <span className="vh">Goleiro do Time {time.numero}</span>
              <select className="sel" value={goleiros[lado] ?? ''}
                onChange={(ev) => aplicar((e) => escolherGoleiro(e, lado, ev.target.value || null))}>
                <option value="">sem goleiro</option>
                {config.goleiros.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        )}
        {time.jogadores.map((j, i) => {
          const fora = expulso(estado, j.id)
          const azul = restanteAzul(estado, j.id, decorrido)
          return (
            <button key={j.id} className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14, opacity: fora ? 0.55 : 1 }}
              aria-label={`Ações de ${j.nome}`} onClick={() => onJogador(lado, j)}>
              <span className="no">{i + 1}</span>
              <span className="nome" style={{ flex: '0 1 auto', textDecoration: fora ? 'line-through' : undefined }}>{j.nome}</span>
              <Subiu de={subiuDe(estado, j.id)} />
              <CartoesDoJogador cores={cartoesDoJogador(estado, j.id).map((c) => c.cor)} expulso={fora} />
              {azul > 0 && !fora && <span className="tag" style={{ background: 'var(--azul)', color: '#fff', height: 20, fontSize: 13 }}>{formatarTempo(azul)}</span>}
            </button>
          )
        })}
      </div>
    )

    return (
      <div key={`${lado}-${transicao?.numero ?? 0}`} className={resultado === 'venceu' && !trocou ? 'coluna-venceu' : undefined}
        style={lado === 'A' ? { borderRight: '2px solid #e3e8d6' } : undefined}>
        {trocou && antes ? (
          <div className="pilha troca">
            <div className="velho" aria-hidden="true">
              <FaixaDoTime numero={antes.numero} colete={colete} etiqueta={resultado ? ROTULO[resultado] : null} />
              {antes.jogadores.map((j, i) => (
                <div key={j.id} className="tr" style={{ minHeight: 40, fontSize: 14 }}>
                  <span className="no">{i + 1}</span><span className="nome">{j.nome}</span>
                </div>
              ))}
            </div>
            <div className="novo">{atual}</div>
            <svg className="xis" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="10" y1="8" x2="90" y2="92" pathLength="1" />
              <line x1="90" y1="8" x2="10" y2="92" pathLength="1" />
            </svg>
          </div>
        ) : atual}
      </div>
    )
  }

  return (
    <section className="panel">
      <div className="ph">
        <span className="row" style={{ gap: 8 }}>
          Escalações
          {goleiros.A && goleiros.B && (
            <button className="tag t-y" style={{ border: 0, cursor: 'pointer' }} onClick={() => aplicar(trocarGoleiros)}>⇄ Trocar G</button>
          )}
        </span>
        {lider.vitoriasSeguidas > 0 && (
          <span className="tag t-y">
            T{lider.numero}: {lider.vitoriasSeguidas} {lider.vitoriasSeguidas > 1 ? 'vitórias seguidas' : 'vitória'}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {LADOS.map(coluna)}
      </div>
    </section>
  )
}
