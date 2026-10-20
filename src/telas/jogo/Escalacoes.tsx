import { CartoesDoJogador } from '../../components/Cartao'
import { Subiu } from '../../components/Subiu'
import { Troca } from '../../components/Machucado'
import { LADOS, cartoesDoJogador, subiuDe, substitutoDe, escolherGoleiro, expulso, restanteAzul, trocarGoleiros } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Colete, Jogador, Lado, Partida, Time } from '../../types/pelada'
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

/** Desfez o fim de uma partida: os times que estavam em campo antes de desfazer (para o efeito de volta). */
export type Volta = { id: number; times: Record<Lado, Time> }

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

/**
 * Linha do goleiro do time que está saindo (só para mostrar): tem a mesma altura da linha de verdade, para as
 * duas colunas ficarem alinhadas durante a troca. `comGoleirosFixos`: aparece como a caixinha de escolher.
 */
function LinhaDoGoleiro({ nome, comGoleirosFixos }: { nome: string | null; comGoleirosFixos: boolean }) {
  return (
    <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
      <span className="no g">G</span>
      {comGoleirosFixos
        ? <span className="nome" style={{ display: 'flex' }}><select className="sel" disabled tabIndex={-1} value=""><option value="">{nome ?? 'sem goleiro'}</option></select></span>
        : <span className="nome mut">Goleiro</span>}
    </div>
  )
}

// Os dois times em campo, com goleiro fixo, gols e cartões. Tocar no jogador abre as ações.
export function Escalacoes({ pelada, decorrido, transicao, volta, onJogador }: {
  pelada: Pelada; decorrido: number; transicao: Partida | null; volta: Volta | null
  onJogador?: (lado: Lado, jogador: Jogador) => void // sem ações (quem só acompanha): os jogadores não abrem nada
}) {
  const { app, aplicar } = pelada
  const { estado } = app
  const { emCampo, config, goleiros } = estado
  if (!emCampo) return null

  const { A, B } = emCampo
  const lider = A.vitoriasSeguidas >= B.vitoriasSeguidas ? A : B
  // O time que acabou de entrar fica piscando até o play da partida (para quem chama os jogadores achar logo)
  const ultima = estado.historico.at(-1)
  const naoComecou = !app.crono.rodando && app.crono.acumulado === 0
  const chamando = (lado: Lado) => !!ultima && naoComecou && !volta
    && emCampo[lado].numero !== ultima.timeA.numero && emCampo[lado].numero !== ultima.timeB.numero

  // Fim de partida: por alguns segundos, a coluna de quem saiu recebe um X e os
  // nomes dão lugar aos do time que entra; a coluna de quem ficou mostra o resultado.
  const coluna = (lado: Lado) => {
    const time = emCampo[lado]
    const colete = config.coletes[lado]
    const antes = transicao ? (lado === 'A' ? transicao.timeA : transicao.timeB) : null
    const trocou = antes !== null && antes.numero !== time.numero
    const resultado = transicao ? resultadoDe(transicao, lado) : null
    const saindo = volta && volta.times[lado].numero !== time.numero ? volta.times[lado] : null
    const etiqueta = volta ? { texto: saindo ? '↶ Voltou' : '↶ Desfeito', classe: 't-y' }
      : trocou || chamando(lado) ? { texto: '↑ Entra', classe: 't-y' } : resultado ? ROTULO[resultado] : null

    const atual = (
      <div>
        <FaixaDoTime numero={time.numero} colete={colete} etiqueta={etiqueta} />
        {/* Sempre aparece: com goleiros fixos, escolhe quem está no gol; sem, fica "Goleiro" (no gol dele, a busca diz quem foi) */}
        <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
          <span className="no g">G</span>
          {config.goleiros.length > 0 ? (
            <label className="nome" style={{ display: 'flex' }}>
              <span className="vh">Goleiro do Time {time.numero}</span>
              <select className="sel" value={goleiros[lado] ?? ''} disabled={!onJogador}
                onChange={(ev) => aplicar((e) => escolherGoleiro(e, lado, ev.target.value || null))}>
                <option value="">sem goleiro</option>
                {config.goleiros.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          ) : <span className="nome mut">Goleiro</span>}
        </div>
        {time.jogadores.map((j, i) => {
          const fora = expulso(estado, j.id)
          const azul = restanteAzul(estado, j.id, decorrido)
          return (
            <button key={j.id} className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14, opacity: fora ? 0.55 : 1 }} disabled={!onJogador}
              aria-label={`Ações de ${j.nome}`} onClick={() => onJogador?.(lado, j)}>
              <span className="no">{i + 1}</span>
              <span className="nome" style={{ flex: '0 1 auto', textDecoration: fora ? 'line-through' : undefined }}>{j.nome}</span>
              {substitutoDe(estado, j.id) ? <Troca de={substitutoDe(estado, j.id)!.jogador.nome} /> : <Subiu de={subiuDe(estado, j.id)} />}
              <CartoesDoJogador cores={cartoesDoJogador(estado, j.id).map((c) => c.cor)} expulso={fora} />
              {azul > 0 && !fora && <span className="tag" style={{ background: 'var(--azul)', color: '#fff', height: 20, fontSize: 13 }}>{formatarTempo(azul)}</span>}
            </button>
          )
        })}
      </div>
    )

    return (
      <div key={`${lado}-${transicao?.numero ?? 0}-${volta?.id ?? 0}`}
        className={chamando(lado) ? (trocou ? 'chamando depois-da-troca' : 'chamando') : undefined}
        style={lado === 'A' ? { borderRight: '2px solid #e3e8d6' } : undefined}>
        {saindo ? (
          // Desfez: o time certo desce de cima e empurra o errado de volta para a fila
          <div className="empurra">
            <div className="trilho">
              <div className="novo">{atual}</div>
              <div className="velho" aria-hidden="true">
                <FaixaDoTime numero={saindo.numero} colete={colete} etiqueta={null} />
                <LinhaDoGoleiro nome={null} comGoleirosFixos={config.goleiros.length > 0} />
                {saindo.jogadores.map((j, i) => (
                  <div key={j.id} className="tr" style={{ minHeight: 40, fontSize: 14 }}>
                    <span className="no">{i + 1}</span><span className="nome">{j.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : trocou && antes ? (
          <div className="pilha troca">
            <div className="velho" aria-hidden="true">
              <FaixaDoTime numero={antes.numero} colete={colete} etiqueta={resultado ? ROTULO[resultado] : null} />
              <LinhaDoGoleiro nome={transicao?.goleiros?.[lado] ?? null} comGoleirosFixos={config.goleiros.length > 0} />
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
          {onJogador && goleiros.A && goleiros.B && (
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
