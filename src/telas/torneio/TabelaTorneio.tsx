import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import {
  artilhariaDoTorneio, assistenciasDoTorneio, campeao, cartoesDoTorneio, classificacao, goleirosDoTorneio, nomeDoGrupo, placarDecisivo, vencedor,
  type LinhaDaTabela,
} from '../../logic/torneio'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { SEM_COLETE } from '../../utils/cores'
import { ChaveCompleta } from './ChaveCompleta'
import { descreverOrigem, timePorId } from './nomes'

const COL = { width: 24, textAlign: 'center' as const, flex: 'none' }

// Tabela do torneio: classificação (pontos corridos / grupos), chave do mata-mata e estatísticas.
/** `onEscolherMelhor`: só o organizador (escolhe o melhor jogador do torneio, que vai para a carta). */
export function TabelaTorneio({ torneio, onEscolherMelhor }: { torneio: Torneio; onEscolherMelhor?: (jogadorId: string | null) => void }) {
  const { regras } = torneio
  const mata = torneio.jogos.filter((j) => j.fase === 'mata')
  const vencedorTorneio = campeao(torneio)
  const [escolhendoMelhor, setEscolhendoMelhor] = useState(false)
  const [chaveAberta, setChaveAberta] = useState(false)
  const timeDoMelhor = torneio.times.find((time) => time.jogadores.some((jogador) => jogador.id === torneio.melhorJogador))
  const melhor = timeDoMelhor?.jogadores.find((jogador) => jogador.id === torneio.melhorJogador)

  return (
    <div className="scr">
      <Barra titulo="Tabela" sub={torneio.nome} />
      <div className="conteudo">
        {vencedorTorneio && (
          <section className="led num" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 16, color: 'var(--texto-no-escuro)', letterSpacing: 1 }}>CAMPEÃO</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, fontSize: 30, textTransform: 'uppercase' }}>
              <Icone nome="trofeu" tamanho={30} />{timePorId(torneio, vencedorTorneio)?.nome}
            </div>
          </section>
        )}
        {/* melhor jogador: título que o organizador dá no fim do torneio (vira conquista na carta de quem tem conta) */}
        {vencedorTorneio && (melhor || onEscolherMelhor) && (
          <section className="panel">
            <div className="ph">Melhor jogador<span className="sub">escolhido pelo organizador</span></div>
            {melhor && timeDoMelhor ? (
              <div className="tr" style={{ minHeight: 52 }}>
                <Camisa cor={timeDoMelhor.cor} uniforme={timeDoMelhor.uniforme} tamanho={26} />
                <span className="nome" style={{ fontSize: 18 }}>{melhor.nome}<span className="mut" style={{ fontSize: 13, marginLeft: 8 }}>{timeDoMelhor.nome}</span></span>
                {onEscolherMelhor && <button className="tag t-y" style={{ border: '1px solid #0b1a2c', cursor: 'pointer' }} onClick={() => setEscolhendoMelhor(true)}>Trocar</button>}
              </div>
            ) : (
              <div className="pb"><button className="btn sm" onClick={() => setEscolhendoMelhor(true)}><Icone nome="trofeu" tamanho={20} /> Escolher o melhor jogador</button></div>
            )}
          </section>
        )}
        {escolhendoMelhor && onEscolherMelhor && (
          <div className="modal" role="dialog" aria-modal="true" aria-label="Melhor jogador do torneio" onClick={() => setEscolhendoMelhor(false)}>
            <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 420 }}>
              <div className="ph">Melhor jogador do torneio</div>
              <div style={{ overflowY: 'auto', minHeight: 0 }}>
                {torneio.times.map((time) => (
                  <div key={time.id}>
                    <div className="tr" style={{ minHeight: 30, fontSize: 12, letterSpacing: 1, color: 'var(--mut)', background: 'var(--divisoria)' }}>
                      <Camisa cor={time.cor} uniforme={time.uniforme} tamanho={18} /> {time.nome}
                    </div>
                    {time.jogadores.map((jogador) => (
                      <button key={jogador.id} className="tr linha-jogador" aria-pressed={jogador.id === torneio.melhorJogador}
                        onClick={() => { onEscolherMelhor(jogador.id); setEscolhendoMelhor(false) }}>
                        <span className="nome">{jogador.nome}</span>
                        {jogador.id === torneio.melhorJogador && <span className="tag t-y">Melhor</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="pb" style={{ display: 'grid', gap: 8, borderTop: '2px solid var(--divisoria)' }}>
                {torneio.melhorJogador && <button className="btn w sm" onClick={() => { onEscolherMelhor(null); setEscolhendoMelhor(false) }}>Tirar o título</button>}
                <button className="btn w sm" onClick={() => setEscolhendoMelhor(false)}>Cancelar</button>
              </div>
            </section>
          </div>
        )}

        {regras.formato === 'pontos' && (
          <Classificacao torneio={torneio} titulo="Classificação" linhas={classificacao(torneio)} destaque={1} />
        )}
        {regras.formato === 'grupos' && torneio.grupos.map((_, g) => (
          <Classificacao key={g} torneio={torneio} titulo={nomeDoGrupo(g)} linhas={classificacao(torneio, g)}
            destaque={regras.classificamPorGrupo} legenda={`Passam ${regras.classificamPorGrupo}`} />
        ))}
        {/* a chave do mata-mata abre na tela própria (a mesma da aba Jogos), mais visível que um quadro pequeno aqui */}
        {mata.length > 0 && (
          <button className="btn w sm" style={{ flex: 'none' }} onClick={() => setChaveAberta(true)}>
            <Icone nome="trofeu" tamanho={20} /> Ver chave do mata-mata
          </button>
        )}
        {chaveAberta && <ChaveCompleta torneio={torneio} onFechar={() => setChaveAberta(false)} />}

        <Estatisticas torneio={torneio} />
      </div>
    </div>
  )
}

function Classificacao({ torneio, titulo, linhas, destaque, legenda }: {
  torneio: Torneio; titulo: string; linhas: LinhaDaTabela[]; destaque: number; legenda?: string
}) {
  return (
    <section className="panel">
      <div className="ph">{titulo}{legenda && <span className="sub">{legenda}</span>}</div>
      <div className="mut" style={{ padding: '6px 10px', fontSize: 12 }}>Desempate: vitórias, saldo, menos vermelhos (CV), menos amarelos (CA).</div>
      <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: 'var(--divisoria)', gap: 4 }}>
        <span style={{ width: 24 }} /><span className="nome">TIME</span>
        {['P', 'J', 'V', 'E', 'D', 'SG'].map((c) => <span key={c} style={COL}>{c}</span>)}
        {/* cartões (só desempate): somem no celular estreito para o nome do time caber */}
        {['CV', 'CA'].map((c) => <span key={c} className="coluna-larga" style={COL}>{c}</span>)}
      </div>
      {linhas.map((l, i) => {
        const time = timePorId(torneio, l.time)!
        return (
          <div key={l.time} className="tr" style={{ gap: 4, fontSize: 14 }}>
            <span className={'no' + (i < destaque ? ' g' : '')}>{i + 1}</span>
            <span className="row" style={{ gap: 6, flex: 1, minWidth: 0 }}><Camisa cor={time.cor} uniforme={time.uniforme} tamanho={18} /><span className="nome" title={time.nome}>{time.nome}</span></span>
            <span style={{ ...COL, fontWeight: 800 }}>{l.pontos}</span>
            <span style={COL}>{l.jogos}</span><span style={COL}>{l.vitorias}</span>
            <span style={COL}>{l.empates}</span><span style={COL}>{l.derrotas}</span>
            <span style={COL}>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</span>
            <span className="coluna-larga" style={{ ...COL, color: l.vermelhos ? 'var(--vermelho)' : 'var(--mut)' }}>{l.vermelhos}</span>
            <span className="coluna-larga" style={{ ...COL, color: 'var(--mut)' }}>{l.amarelos}</span>
          </div>
        )
      })}
    </section>
  )
}

/** Caixa de um confronto (ida e volta: ida · volta · agregado; pênaltis entre parênteses). */
export function Confronto({ torneio, jogo }: { torneio: Torneio; jogo: JogoTorneio }) {
  const ganhou = vencedor(jogo, torneio)
  const r = jogo.resultado
  // ida e volta: a caixa é da volta; os lados são os da volta (o lado A da volta é o B da ida)
  const ida = jogo.perna === 'volta' ? torneio.jogos.find((j) => j.id === jogo.outraPerna) : undefined
  const agregado = placarDecisivo(torneio, jogo)
  const linha = (lado: 'A' | 'B') => {
    const o = descreverOrigem(torneio, lado === 'A' ? jogo.casa : jogo.fora)
    const i = lado === 'A' ? 0 : 1
    const golsIda = ida?.resultado ? ida.resultado.placar[1 - i] : null
    const golsVolta = r ? r.placar[i] : null
    const pen = r?.penaltis ? r.penaltis[i] : null
    return (
      <div className="row" style={{ gap: 6, padding: '5px 8px', fontSize: 13, fontWeight: ganhou === lado ? 800 : 600, color: o.time ? 'var(--navy)' : 'var(--mut)', opacity: ganhou && ganhou !== lado ? 0.6 : 1 }}>
        <Camisa cor={o.time?.cor ?? SEM_COLETE} uniforme={o.time?.uniforme} tamanho={16} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nome}</span>
        {ida && <span className="num" style={{ fontSize: 13, color: 'var(--mut)', minWidth: 14, textAlign: 'center' }}>{golsIda ?? '–'}</span>}
        {ida && <span className="num" style={{ fontSize: 13, color: 'var(--mut)', minWidth: 14, textAlign: 'center' }}>{golsVolta ?? '–'}</span>}
        {(ida ? agregado : r) && (
          <span className="num" style={{ fontSize: 16 }}>{ida ? agregado![i] : golsVolta}{pen !== null && <span style={{ fontSize: 12 }}> ({pen})</span>}</span>
        )}
      </div>
    )
  }
  return (
    <div style={{ background: '#fff', border: '2px solid var(--borda)', borderRadius: 5, boxShadow: '0 2px 0 var(--borda)' }}>
      {ida && <div className="mut" style={{ fontSize: 10, padding: '3px 8px 0', textAlign: 'right', letterSpacing: 0.5 }}>IDA · VOLTA · AGREGADO</div>}
      {linha('A')}
      <div style={{ height: 1, background: 'var(--divisoria)' }} />
      {linha('B')}
    </div>
  )
}

function Estatisticas({ torneio }: { torneio: Torneio }) {
  const artilheiros = artilhariaDoTorneio(torneio).slice(0, 10)
  const garcons = assistenciasDoTorneio(torneio).slice(0, 10)
  const goleiros = goleirosDoTorneio(torneio)
  const cartoes = cartoesDoTorneio(torneio)
  const time = (id: string) => timePorId(torneio, id)
  return (
    <>
      <section className="panel">
        <div className="ph">Artilharia<span className="sub">gols</span></div>
        {artilheiros.length === 0 && <div className="pb mut">Nenhum gol com autor ainda.</div>}
        {artilheiros.map((a, i) => (
          <div key={a.id} className="tr">
            <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
            <Camisa cor={time(a.time)?.cor ?? SEM_COLETE} uniforme={time(a.time)?.uniforme} tamanho={18} />
            <span className="nome">{a.nome} <span className="mut">· {time(a.time)?.nome}</span></span>
            <span className="num" style={{ fontSize: 22 }}>{a.gols}</span>
          </div>
        ))}
      </section>

      {(torneio.regras.assistencias || garcons.length > 0) && (
        <section className="panel">
          <div className="ph">Assistências<span className="sub">Troféu Garçom</span></div>
          {garcons.length === 0 && <div className="pb mut">Nenhum passe para gol marcado ainda.</div>}
          {garcons.map((garcom, posicao) => (
            <div key={garcom.id} className="tr">
              <span className={'no' + (posicao === 0 ? ' g' : '')}>{posicao + 1}</span>
              <Camisa cor={time(garcom.time)?.cor ?? SEM_COLETE} uniforme={time(garcom.time)?.uniforme} tamanho={18} />
              <span className="nome">{garcom.nome} <span className="mut">· {time(garcom.time)?.nome}</span></span>
              <span className="num" style={{ fontSize: 22 }}>{garcom.assistencias}</span>
            </div>
          ))}
        </section>
      )}

      {goleiros.length > 0 && (
        <section className="panel">
          <div className="ph">Goleiro menos vazado</div>
          <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: 'var(--divisoria)' }}>
            <span style={{ width: 24 }} /><span className="nome">GOLEIRO</span>
            <span style={COL}>J</span><span style={COL}>GS</span><span style={{ ...COL, width: 44 }}>MÉDIA</span>
          </div>
          {goleiros.map((g, i) => (
            <div key={g.nome} className="tr">
              <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
              <span className="nome row" style={{ gap: 6 }}><Camisa cor={time(g.time)?.cor ?? SEM_COLETE} uniforme={time(g.time)?.uniforme} tamanho={18} />{g.nome}</span>
              <span style={COL}>{g.jogos}</span><span style={COL}>{g.sofridos}</span>
              <span style={{ ...COL, width: 44 }}>{g.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
            </div>
          ))}
        </section>
      )}

      <section className="panel">
        <div className="ph">Cartões<span className="sub">3 amarelos = suspensão</span></div>
        {cartoes.length === 0 && <div className="pb mut">Nenhum cartão no torneio.</div>}
        {cartoes.map((c) => (
          <div key={c.id} className="tr" style={{ gap: 8 }}>
            <Camisa cor={time(c.time)?.cor ?? SEM_COLETE} uniforme={time(c.time)?.uniforme} tamanho={18} />
            <span className="nome">{c.nome}</span>
            {c.suspenso && <span className="tag t-warn">Suspenso</span>}
            {(['amarelo', 'vermelho', 'azul'] as const).map((cor) => {
              const n = cor === 'amarelo' ? c.amarelos : cor === 'vermelho' ? c.vermelhos : c.azuis
              return <span key={cor} className="row" style={{ gap: 3, opacity: n ? 1 : 0.25 }}><Cartao cor={cor} /><span className="num" style={{ fontSize: 16 }}>{n}</span></span>
            })}
            <span className="mut" title="Amarelos acumulados" style={{ width: 30, textAlign: 'right' }}>{c.acumulados}/3</span>
          </div>
        ))}
      </section>
    </>
  )
}
