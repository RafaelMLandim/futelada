import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import {
  artilhariaDoTorneio, campeao, cartoesDoTorneio, classificacao, goleirosDoTorneio, nomeDoGrupo, placarDecisivo, vencedor,
  type LinhaDaTabela,
} from '../../logic/torneio'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { SEM_COLETE } from '../../utils/cores'
import { ChaveCompleta } from './ChaveCompleta'
import { descreverOrigem, timePorId } from './nomes'

const COL = { width: 24, textAlign: 'center' as const, flex: 'none' }

// Tabela do torneio: classificação (pontos corridos / grupos), chave do mata-mata e estatísticas.
export function TabelaTorneio({ torneio }: { torneio: Torneio }) {
  const { regras } = torneio
  const mata = torneio.jogos.filter((j) => j.fase === 'mata')
  const vencedorTorneio = campeao(torneio)

  return (
    <div className="scr">
      <Barra titulo="Tabela" sub={torneio.nome} />
      <div className="conteudo">
        {vencedorTorneio && (
          <section className="led num" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 16, color: '#c9d4e3', letterSpacing: 1 }}>CAMPEÃO</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, fontSize: 32, textTransform: 'uppercase' }}>
              <Icone nome="trofeu" tamanho={30} />{timePorId(torneio, vencedorTorneio)?.nome}
            </div>
          </section>
        )}

        {regras.formato === 'pontos' && (
          <Classificacao torneio={torneio} titulo="Classificação" linhas={classificacao(torneio)} destaque={1} />
        )}
        {regras.formato === 'grupos' && torneio.grupos.map((_, g) => (
          <Classificacao key={g} torneio={torneio} titulo={nomeDoGrupo(g)} linhas={classificacao(torneio, g)}
            destaque={regras.classificamPorGrupo} legenda={`Passam ${regras.classificamPorGrupo}`} />
        ))}
        {mata.length > 0 && <Chave torneio={torneio} jogos={mata} />}

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
      <div className="mut" style={{ padding: '6px 10px', fontSize: 11 }}>Desempate: vitórias, saldo, menos vermelhos (CV), menos amarelos (CA).</div>
      <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: '#e3e8d6', gap: 4 }}>
        <span style={{ width: 24 }} /><span className="nome">TIME</span>
        {['P', 'J', 'V', 'E', 'D', 'SG', 'CV', 'CA'].map((c) => <span key={c} style={COL}>{c}</span>)}
      </div>
      {linhas.map((l, i) => {
        const time = timePorId(torneio, l.time)!
        return (
          <div key={l.time} className="tr" style={{ gap: 4, fontSize: 14 }}>
            <span className={'no' + (i < destaque ? ' g' : '')}>{i + 1}</span>
            <span className="row" style={{ gap: 6, flex: 1, minWidth: 0 }}><Camisa cor={time.cor} tamanho={18} /><span className="nome" title={time.nome}>{time.nome}</span></span>
            <span style={{ ...COL, fontWeight: 800 }}>{l.pontos}</span>
            <span style={COL}>{l.jogos}</span><span style={COL}>{l.vitorias}</span>
            <span style={COL}>{l.empates}</span><span style={COL}>{l.derrotas}</span>
            <span style={COL}>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</span>
            <span style={{ ...COL, color: l.vermelhos ? 'var(--vermelho)' : 'var(--mut)' }}>{l.vermelhos}</span>
            <span style={{ ...COL, color: 'var(--mut)' }}>{l.amarelos}</span>
          </div>
        )
      })}
    </section>
  )
}

/** Chaveamento: uma coluna por rodada, rolando de lado; 3º lugar embaixo. */
function Chave({ torneio, jogos }: { torneio: Torneio; jogos: JogoTorneio[] }) {
  const terceiro = jogos.filter((j) => j.rodada === 'Disputa de 3º lugar')
  const rodadas: { nome: string; jogos: JogoTorneio[] }[] = []
  for (const j of [...jogos].sort((a, b) => a.ordem - b.ordem)) {
    if (j.rodada === 'Disputa de 3º lugar' || j.perna === 'ida') continue // ida e volta: a caixa é da volta (mostra os dois jogos)
    const r = rodadas.find((x) => x.nome === j.rodada)
    if (r) r.jogos.push(j)
    else rodadas.push({ nome: j.rodada, jogos: [j] })
  }
  const [telaCheia, setTelaCheia] = useState(false)
  return (
    <section className="panel">
      <div className="ph">Mata-mata
        <button className="tag t-y" style={{ border: 0, cursor: 'pointer', height: 26 }} onClick={() => setTelaCheia(true)}>Tela cheia ⤢</button>
      </div>
      {telaCheia && <ChaveCompleta torneio={torneio} onFechar={() => setTelaCheia(false)} />}
      <div className="chave" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: 10, background: '#f6f7f2' }}>
        {rodadas.map((r) => (
          <div key={r.nome} style={{ display: 'flex', flexDirection: 'column', minWidth: 168, flex: 'none' }}>
            <div className="num" style={{ fontSize: 14, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{r.nome}</div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 10 }}>
              {r.jogos.map((j) => <Confronto key={j.id} torneio={torneio} jogo={j} />)}
            </div>
          </div>
        ))}
      </div>
      {terceiro.map((j) => (
        <div key={j.id} style={{ padding: '0 10px 10px', background: '#f6f7f2' }}>
          <div className="num" style={{ fontSize: 14, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Disputa de 3º lugar</div>
          <div style={{ maxWidth: 220 }}><Confronto torneio={torneio} jogo={j} /></div>
        </div>
      ))}
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
        <Camisa cor={o.time?.cor ?? SEM_COLETE} tamanho={16} />
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
      <div style={{ height: 1, background: '#e3e8d6' }} />
      {linha('B')}
    </div>
  )
}

function Estatisticas({ torneio }: { torneio: Torneio }) {
  const artilheiros = artilhariaDoTorneio(torneio).slice(0, 10)
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
            <Camisa cor={time(a.time)?.cor ?? SEM_COLETE} tamanho={18} />
            <span className="nome">{a.nome} <span className="mut">· {time(a.time)?.nome}</span></span>
            <span className="num" style={{ fontSize: 22 }}>{a.gols}</span>
          </div>
        ))}
      </section>

      {goleiros.length > 0 && (
        <section className="panel">
          <div className="ph">Goleiro menos vazado</div>
          <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: '#e3e8d6' }}>
            <span style={{ width: 24 }} /><span className="nome">GOLEIRO</span>
            <span style={COL}>J</span><span style={COL}>GS</span><span style={{ ...COL, width: 44 }}>MÉDIA</span>
          </div>
          {goleiros.map((g, i) => (
            <div key={g.nome} className="tr">
              <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
              <span className="nome row" style={{ gap: 6 }}><Camisa cor={time(g.time)?.cor ?? SEM_COLETE} tamanho={18} />{g.nome}</span>
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
            <Camisa cor={time(c.time)?.cor ?? SEM_COLETE} tamanho={18} />
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
