import { useState } from 'react'
import { CartoesDoJogador } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import { LuvaDoGoleiro } from '../../components/LuvaDoGoleiro'
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
function LinhaDoGoleiro({ nome, comGoleirosFixos, cor }: { nome: string | null; comGoleirosFixos: boolean; cor: string }) {
  return (
    <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
      <LuvaDoGoleiro cor={cor} tamanho={24} />
      {comGoleirosFixos && nome ? <span className="nome">{nome}</span> : <span className="nome mut">{comGoleirosFixos ? 'sem goleiro' : 'Goleiro'}</span>}
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
  // goleiros fixos: o lado cujo goleiro está sendo escolhido (a janela de escolher)
  const [goleiroDe, setGoleiroDe] = useState<Lado | null>(null)
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
        {/* Sempre aparece: com goleiros fixos, tocar escolhe quem está no gol (como os outros jogadores, com os 3
            pontinhos); sem, fica "Goleiro" (no gol dele, a busca diz quem foi). A luva na cor do colete. */}
        {config.goleiros.length > 0 ? (
          <button className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14, paddingRight: 4 }} disabled={!onJogador}
            aria-label={`Goleiro do Time ${time.numero}: ${goleiros[lado] ?? 'sem goleiro'}`} onClick={() => setGoleiroDe(lado)}>
            <LuvaDoGoleiro cor={colete.cor} tamanho={24} />
            {goleiros[lado] ? <span className="nome">{goleiros[lado]}</span> : <span className="nome mut">sem goleiro</span>}
            {onJogador && <span style={{ display: 'flex', color: 'var(--navy)' }}><Icone nome="opcoes" tamanho={20} /></span>}
          </button>
        ) : (
          <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
            <LuvaDoGoleiro cor={colete.cor} tamanho={24} />
            <span className="nome mut">Goleiro</span>
          </div>
        )}
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
        style={lado === 'A' ? { borderRight: '2px solid var(--divisoria)' } : undefined}>
        {saindo ? (
          // Desfez: o time certo desce de cima e empurra o errado de volta para a fila
          <div className="empurra">
            <div className="trilho">
              <div className="novo">{atual}</div>
              <div className="velho" aria-hidden="true">
                <FaixaDoTime numero={saindo.numero} colete={colete} etiqueta={null} />
                <LinhaDoGoleiro nome={null} comGoleirosFixos={config.goleiros.length > 0} cor={colete.cor} />
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
              <LinhaDoGoleiro nome={transicao?.goleiros?.[lado] ?? null} comGoleirosFixos={config.goleiros.length > 0} cor={colete.cor} />
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
            <button className="tag t-y" style={{ border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} aria-label="Trocar os goleiros de gol" onClick={() => aplicar(trocarGoleiros)}>⇄ Trocar <LuvaDoGoleiro tamanho={18} /></button>
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
      {goleiroDe && (() => {
        const lado = goleiroDe
        const outroLado: Lado = lado === 'A' ? 'B' : 'A'
        const fechar = () => setGoleiroDe(null)
        const escolher = (nome: string | null) => { aplicar((e) => escolherGoleiro(e, lado, nome)); fechar() }
        const colete = config.coletes[lado]
        const atual = goleiros[lado]
        // goleiros fixos que não estão em nenhum gol (com 3 ou mais)
        const deFora = config.goleiros.filter((nome) => nome !== goleiros.A && nome !== goleiros.B)
        return (
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Goleiro do Time ${emCampo[lado].numero}`} onClick={fechar}>
            <section className="panel" onClick={(evento) => evento.stopPropagation()}>
              <div className="ph" style={{ background: colete.cor, color: textoSobre(colete.cor) }}>
                <span className="row" style={{ gap: 8 }}><LuvaDoGoleiro cor={colete.cor} tamanho={28} />Goleiro do Time {emCampo[lado].numero}</span>
              </div>
              <div className="tr" style={{ minHeight: 48 }}>
                <LuvaDoGoleiro cor={colete.cor} tamanho={28} />
                {atual ? <span className="nome">{atual}</span> : <span className="nome mut">sem goleiro</span>}
                {atual && <span className="tag t-y">no gol</span>}
              </div>
              <div className="pb" style={{ display: 'grid', gap: 8 }}>
                {/* quem está esperando entra no gol (quem estava vai esperar) */}
                {deFora.map((nome) => (
                  <button key={nome} className="btn w sm" style={{ textTransform: 'none', fontSize: 17 }} onClick={() => escolher(nome)}>
                    <LuvaDoGoleiro tamanho={24} /> {atual ? `Trocar com o ${nome}` : `Pôr o ${nome} no gol`}
                  </button>
                ))}
                {/* roubar: troca só com o goleiro do outro gol (o deste time vai para lá) */}
                {goleiros[outroLado] && (
                  <button className="btn w sm" style={{ textTransform: 'none', fontSize: 17, display: 'grid', justifyItems: 'center', gap: 0 }}
                    onClick={() => { aplicar(trocarGoleiros); fechar() }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⇄ Roubar o goleiro do {config.coletes[outroLado].nome}
                      <LuvaDoGoleiro cor={config.coletes[outroLado].cor} tamanho={24} />
                    </span>
                    <small style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>
                      {goleiros[outroLado]} vem para cá{atual ? ` e o ${atual} vai para lá` : ''}
                    </small>
                  </button>
                )}
                {atual && <button className="btn w sm" onClick={() => escolher(null)}>Sem goleiro</button>}
                <button className="btn w sm" onClick={fechar}>Cancelar</button>
              </div>
            </section>
          </div>
        )
      })()}
    </section>
  )
}
