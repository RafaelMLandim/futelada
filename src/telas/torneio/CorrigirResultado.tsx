import { useState } from 'react'
import { Bola } from '../../components/Bola'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { outro } from '../../logic'
import {
  cartoesAoRemover, corrigirResultado, jogoPorId, placarDosGols, placarTravado, precisaDePenaltis, siglaDoTime, timesDoJogo,
} from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { Cartao as CartaoDoJogo, Gol, Lado, Placar } from '../../types/pelada'
import { useConfirmar } from '../../utils/confirmacao'
import { textoSobre } from '../../utils/cores'
import { nomeDoJogo, timePorId } from './nomes'

/** Escolhendo quem fez o gol que vai ser acrescentado (gol contra: quem fez é do outro time). */
type NovoGol = { lado: Lado; contra: boolean }

/**
 * Corrigir o resultado de um jogo encerrado (só o organizador): tirar ou acrescentar gols, tirar cartões e,
 * no mata-mata empatado, os pênaltis. O placar sai dos gols. Tabela, artilharia, suspensões e chave são refeitas.
 */
export function CorrigirResultado({ hook, jogoId, onFechar }: { hook: TorneioHook; jogoId: string; onFechar: () => void }) {
  const torneio = hook.torneio!
  const jogo = jogoPorId(torneio, jogoId)!
  const resultado = jogo.resultado!
  const confirmar = useConfirmar()
  const ids = timesDoJogo(torneio, jogo)
  const times = { A: timePorId(torneio, ids.A)!, B: timePorId(torneio, ids.B)! }
  const [gols, setGols] = useState<Gol[]>(resultado.gols)
  const [cartoes, setCartoes] = useState<CartaoDoJogo[]>(resultado.cartoes)
  const [penaltis, setPenaltis] = useState<Placar>(resultado.penaltis ?? [0, 0])
  const [novoGol, setNovoGol] = useState<NovoGol | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // o resultado já decidiu um jogo que começou: dá para corrigir quem fez e os cartões, mas o placar fica
  const travado = placarTravado(torneio, jogoId)
  const placar = placarDosGols(gols)
  const comPenaltis = precisaDePenaltis(torneio, jogo, placar)
  const placarMudou = JSON.stringify(placar) !== JSON.stringify(resultado.placar)
    || JSON.stringify(comPenaltis ? penaltis : null) !== JSON.stringify(resultado.penaltis)
  const mudou = JSON.stringify([gols, cartoes, comPenaltis ? penaltis : null]) !== JSON.stringify([resultado.gols, resultado.cartoes, resultado.penaltis])

  // quem entrou em campo naquele jogo (jogos antigos sem essa lista: o time todo)
  const quemJogou = (lado: Lado) => {
    const jogaram = resultado.jogaram[lado]
    return times[lado].jogadores.filter((jogador) => jogaram.length === 0 || jogaram.includes(jogador.id))
  }
  const acrescentarGol = (autor: { id: string; nome: string } | null) => {
    if (!novoGol) return
    const { lado, contra } = novoGol
    const gol: Gol = { lado, autorId: autor?.id ?? null, autor: autor?.nome ?? null, goleiroSofreu: resultado.goleiros[outro(lado)], ...(contra && { contra: true }) }
    setGols([...gols, gol])
    setNovoGol(null)
  }
  const salvar = () => confirmar({
    titulo: 'Salvar a correção?',
    mensagem: `O resultado passa a ser ${times.A.nome} ${placar[0]} x ${placar[1]} ${times.B.nome}${comPenaltis ? ` (pênaltis ${penaltis[0]} x ${penaltis[1]})` : ''}. `
      + 'A tabela, a artilharia, as suspensões e a chave são refeitas.',
    botao: 'Salvar',
    aoConfirmar: () => {
      try {
        hook.aplicar((atual) => corrigirResultado(atual, jogoId, { gols, cartoes, penaltis: comPenaltis ? penaltis : null }))
        onFechar()
      } catch (falha) {
        setErro((falha as Error).message)
      }
    },
  })
  const nomeDoLado = (lado: Lado) => siglaDoTime(times[lado])
  const remover = (rotulo: string, aoRemover: () => void) => (
    <button className="ib s" style={{ width: 32, height: 32, flex: 'none' }} aria-label={rotulo} onClick={aoRemover}><span style={{ fontSize: 20, lineHeight: 1 }}>×</span></button>
  )

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Corrigir resultado" onClick={onFechar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="ph">Corrigir resultado<span className="sub">{nomeDoJogo(torneio, jogo)}</span></div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          <div className="led num row" style={{ justifyContent: 'space-between', padding: '10px 12px', gap: 8 }}>
            <span className="row" style={{ gap: 6, color: '#fff', fontSize: 20 }}><Camisa cor={times.A.cor} uniforme={times.A.uniforme} tamanho={24} />{nomeDoLado('A')}</span>
            <span style={{ fontSize: 36 }}>{placar[0]} <span style={{ color: '#5e6a76' }}>-</span> {placar[1]}</span>
            <span className="row" style={{ gap: 6, color: '#fff', fontSize: 20 }}>{nomeDoLado('B')}<Camisa cor={times.B.cor} uniforme={times.B.uniforme} tamanho={24} /></span>
          </div>

          {travado && (
            <div role="status" style={{ background: '#fff4cc', border: '2px solid var(--borda)', borderRadius: 6, padding: '8px 10px', fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
              Este resultado já decidiu um jogo que começou. Dá para corrigir quem fez os gols e os cartões,
              mas o placar tem que continuar {resultado.placar[0]} x {resultado.placar[1]}{resultado.penaltis ? ` (pênaltis ${resultado.penaltis[0]} x ${resultado.penaltis[1]})` : ''}.
            </div>
          )}
          {travado && placarMudou && (
            <div role="alert" style={{ color: 'var(--vermelho)', fontWeight: 700, fontSize: 14 }}>O placar mudou: acerte os gols para voltar ao placar original.</div>
          )}
          {(
            <>
              <div className="rotulo-de-secao">Gols</div>
              {gols.length === 0 && <div className="mut">Nenhum gol.</div>}
              {gols.map((gol, indice) => (
                <div key={indice} className="row" style={{ gap: 8 }}>
                  <Bola tamanho={18} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                    {gol.autor ?? 'Sem autor'}{gol.contra ? ' (contra)' : ''} <span className="mut">· gol do {nomeDoLado(gol.lado)}</span>
                  </span>
                  {remover(`Tirar o gol de ${gol.autor ?? 'sem autor'}`, () => setGols(gols.filter((_, posicao) => posicao !== indice)))}
                </div>
              ))}
              <div className="row" style={{ gap: 8 }}>
                {(['A', 'B'] as const).map((lado) => (
                  <button key={lado} className="btn w sm" style={{ flex: 1, textTransform: 'none' }} onClick={() => setNovoGol({ lado, contra: false })}>
                    <Camisa cor={times[lado].cor} uniforme={times[lado].uniforme} tamanho={20} /> + Gol {nomeDoLado(lado)}
                  </button>
                ))}
              </div>

              <div className="rotulo-de-secao">Cartões</div>
              {cartoes.length === 0 && <div className="mut">Nenhum cartão.</div>}
              {cartoes.map((cartao, indice) => cartao.porDoisAmarelos ? null : (
                <div key={indice} className="row" style={{ gap: 8 }}>
                  <Cartao cor={cartao.cor} tamanho={18} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                    {cartao.nome}{cartoes[indice + 1]?.porDoisAmarelos && cartoes[indice + 1].jogadorId === cartao.jogadorId ? ' (2º amarelo · expulso)' : ''}
                    {' '}<span className="mut">· {nomeDoLado(cartao.lado)}</span>
                  </span>
                  {remover(`Tirar o cartão de ${cartao.nome}`, () => setCartoes(cartoesAoRemover(cartoes, indice)))}
                </div>
              ))}

              {comPenaltis && (
                <>
                  <div className="rotulo-de-secao">Pênaltis (empatou)</div>
                  <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
                    {([0, 1] as const).map((posicao) => (
                      <div key={posicao} className="row" style={{ gap: 6 }}>
                        <span className="num" style={{ fontSize: 18 }}>{nomeDoLado(posicao === 0 ? 'A' : 'B')}</span>
                        <button className="ib s" aria-label="Menos um" onClick={() => setPenaltis((atual) => atual.map((valor, qual) => (qual === posicao ? Math.max(0, valor - 1) : valor)) as Placar)}>−</button>
                        <span className="num" style={{ fontSize: 26, minWidth: 22, textAlign: 'center' }}>{penaltis[posicao]}</span>
                        <button className="ib s" aria-label="Mais um" onClick={() => setPenaltis((atual) => atual.map((valor, qual) => (qual === posicao ? valor + 1 : valor)) as Placar)}>+</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {erro && <div role="alert" style={{ color: 'var(--vermelho)', fontWeight: 700 }}>{erro}</div>}
              <button className="btn" disabled={!mudou || (comPenaltis && penaltis[0] === penaltis[1]) || (travado && placarMudou)} onClick={salvar}>Salvar correção</button>
            </>
          )}
          <button className="btn w sm" onClick={onFechar}>Voltar</button>
        </div>
      </section>

      {novoGol && (() => {
        const { lado, contra } = novoGol
        const deQuem = contra ? outro(lado) : lado
        const cor = times[lado].cor
        return (
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Gol do ${times[lado].nome}`} onClick={(evento) => { evento.stopPropagation(); setNovoGol(null) }}>
            <section className="panel" onClick={(evento) => evento.stopPropagation()}>
              <div className="ph" style={{ background: cor, color: textoSobre(cor) }}>Gol do {times[lado].nome}</div>
              <div className="pb" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <div className="mut" style={{ gridColumn: '1 / -1', color: 'var(--navy)', fontWeight: 600 }}>
                  {contra ? `Gol contra · quem do ${times[deQuem].nome} fez?` : 'Quem fez?'}
                </div>
                {quemJogou(deQuem).map((jogador) => (
                  <button key={jogador.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => acrescentarGol(jogador)}>{jogador.nome}</button>
                ))}
                <button className="btn sm" style={{ gridColumn: '1 / -1' }} onClick={() => acrescentarGol(null)}>Não sei · só marcar o gol</button>
                {!contra && <button className="btn w sm" style={{ gridColumn: '1 / -1' }} onClick={() => setNovoGol({ lado, contra: true })}>Foi gol contra</button>}
                <button className="btn w sm" style={{ gridColumn: '1 / -1' }} onClick={() => setNovoGol(null)}>Voltar</button>
              </div>
            </section>
          </div>
        )
      })()}
    </div>
  )
}
