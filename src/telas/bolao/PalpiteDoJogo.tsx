// Palpite de um jogo do bolão (PLANO.md, seção 23), com a cara da partida do torneio: o placar preto, os botões de gol,
// o resumo dos gols e as escalações. Antes do jogo: monta e salva o palpite. Depois que começa: o palpite fica travado
// e a tela compara com o jogo (ao vivo ou no fim), com os pontos.

import { useEffect, useState } from 'react'
import { Barra } from '../../components/Barra'
import { Bola } from '../../components/Bola'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { PlacarLed } from '../../components/PlacarLed'
import {
  MAXIMO_DE_CARTOES_NO_PALPITE, PONTOS_DO_BOLAO, artilhariaDoTorneio, assistenciasDoTorneio, cartoesDoTorneio, decorridoNoPeriodo,
  duracaoDoPeriodo, jogoPorId, nomeDoPeriodo, placarDoPalpite, pontosDoJogo, preferenciasDoBolao, situacaoDoJogo, siglaDoTime, timesDoJogo,
  type CartaoDoPalpite, type CorDoPalpite, type GolDoPalpite, type PalpiteDoJogo,
} from '../../logic/torneio'
import type { BolaoHook } from '../../store/bolao'
import type { Lado } from '../../types/pelada'
import type { JogadorDoTime, TimeTorneio, Torneio } from '../../types/torneio'
import { textoSobre } from '../../utils/cores'
import { nomeDoJogo } from '../torneio/nomes'

const LADOS: Lado[] = ['A', 'B']

export function PalpiteDoJogo({ bolao, torneio, jogoId, eu, onVoltar }: {
  bolao: BolaoHook; torneio: Torneio; jogoId: string; eu: string; onVoltar: () => void
}) {
  const jogo = jogoPorId(torneio, jogoId)
  const ids = jogo ? timesDoJogo(torneio, jogo) : null
  const times = ids?.A && ids.B ? { A: torneio.times.find((time) => time.id === ids.A), B: torneio.times.find((time) => time.id === ids.B) } : null
  const situacao = situacaoDoJogo(torneio, jogoId)
  if (!jogo || !times?.A || !times.B) {
    return (
      <div className="scr">
        <Barra titulo="Palpite" sub={torneio.nome} />
        <div className="conteudo">
          <div className="panel pb mut" style={{ color: 'var(--navy)' }}>Os times deste jogo ainda não estão definidos.</div>
          <button className="btn w sm" onClick={onVoltar}>Voltar</button>
        </div>
      </div>
    )
  }
  const doJogo = { A: times.A, B: times.B }
  const titulo = `${siglaDoTime(doJogo.A)} x ${siglaDoTime(doJogo.B)}`
  const sub = `Seu palpite · ${nomeDoJogo(torneio, jogo)}`
  return situacao
    ? <PalpiteTravado bolao={bolao} torneio={torneio} jogoId={jogoId} times={doJogo} eu={eu} titulo={titulo} sub={sub} onVoltar={onVoltar} />
    : <MontarPalpite bolao={bolao} torneio={torneio} jogoId={jogoId} times={doJogo} titulo={titulo} sub={sub} onVoltar={onVoltar} />
}

type Times = Record<Lado, TimeTorneio>

/** Jogadores do time: o goleiro primeiro, depois na ordem da camisa (sem número, no fim). */
const elenco = (time: TimeTorneio) => [...time.jogadores].sort((primeiro, segundo) =>
  Number(!!segundo.goleiro) - Number(!!primeiro.goleiro) || (primeiro.camisa ?? 999) - (segundo.camisa ?? 999))

const nomeDoJogador = (times: Times, id: string) => [...times.A.jogadores, ...times.B.jogadores].find((jogador) => jogador.id === id)?.nome ?? '—'

function PlacarDoPalpite({ times, placar, topo }: { times: Times; placar: [number, number]; topo: React.ReactNode }) {
  return (
    <section className="led" style={{ padding: '12px 12px 14px' }}>
      {topo}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', columnGap: 8, alignItems: 'center', textAlign: 'center', marginTop: 8 }}>
        {LADOS.map((lado, indice) => {
          const lugar = (
            <div key={lado} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0, gridColumn: indice === 0 ? 1 : 3, gridRow: 1 }}>
              <span className="num" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{times[lado].nome}</span>
              <Camisa cor={times[lado].cor} uniforme={times[lado].uniforme} tamanho={36} contorno="#fff" />
            </div>
          )
          return lugar
        })}
        <div className="num" style={{ fontSize: 64, whiteSpace: 'nowrap', gridColumn: 2, gridRow: 1 }}>
          {placar[0]}<span style={{ color: '#5e6a76', fontSize: 40, margin: '0 6px' }}>-</span>{placar[1]}
        </div>
      </div>
    </section>
  )
}

function MontarPalpite({ bolao, torneio, jogoId, times, titulo, sub, onVoltar }: {
  bolao: BolaoHook; torneio: Torneio; jogoId: string; times: Times; titulo: string; sub: string; onVoltar: () => void
}) {
  const salvo = bolao.meus?.[jogoId]
  const [gols, setGols] = useState<GolDoPalpite[]>(salvo?.gols ?? [])
  const [cartoes, setCartoes] = useState<CartaoDoPalpite[]>(salvo?.cartoes ?? [])
  const [golDoLado, setGolDoLado] = useState<Lado | null>(null)
  const [ficha, setFicha] = useState<{ lado: Lado; jogador: JogadorDoTime } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // o palpite salvo chega depois de abrir a tela
  const [carregou, setCarregou] = useState(!!bolao.meus)
  useEffect(() => {
    if (carregou || !bolao.meus) return
    setCarregou(true)
    const lido = bolao.meus[jogoId]
    if (lido) { setGols(lido.gols); setCartoes(lido.cartoes) }
  }, [bolao.meus, carregou, jogoId])

  const placar = placarDoPalpite(gols)
  const mudou = JSON.stringify({ gols, cartoes }) !== JSON.stringify({ gols: salvo?.gols ?? [], cartoes: salvo?.cartoes ?? [] })
  const marcar = (lado: Lado, jogador: string | null) => { setGols([...gols, { lado, jogador }]); setGolDoLado(null); setFicha(null); setAviso(null) }
  const tirarGol = (lado: Lado, jogador: string | null) => {
    const indice = gols.findLastIndex((gol) => gol.lado === lado && gol.jogador === jogador)
    if (indice >= 0) setGols(gols.filter((_, outro) => outro !== indice))
  }
  const darCartao = (lado: Lado, jogador: string, cor: CorDoPalpite) => {
    setCartoes([...cartoes.filter((cartao) => cartao.jogador !== jogador), { lado, jogador, cor }])
    setFicha(null)
  }
  const salvar = async () => {
    setSalvando(true)
    setAviso(null)
    try {
      const palpite: PalpiteDoJogo = { placar, gols, cartoes, em: Date.now() }
      await bolao.salvarPalpite(jogoId, palpite)
      // salvou: volta para os jogos (lá o jogo aparece com o palpite, "✓ 2-1")
      onVoltar()
      return
    } catch {
      // o jogo pode ter começado enquanto montava (a regra recusa), ou caiu a internet
      setAviso(situacaoDoJogo(torneio, jogoId) ? 'O jogo já começou: os palpites fecharam.' : 'Não deu para salvar. Confira a internet e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  // o resumo, como o da partida: quem faz os gols (e os sem jogador) e quem leva cartão, de cada lado
  const coluna = (lado: Lado) => {
    const porJogador = new Map<string | null, number>()
    for (const gol of gols.filter((item) => item.lado === lado)) porJogador.set(gol.jogador, (porJogador.get(gol.jogador) ?? 0) + 1)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: lado === 'A' ? 'flex-start' : 'flex-end', minWidth: 0 }}>
        {[...porJogador].map(([jogador, quantos]) => (
          <button key={jogador ?? 'sem'} className="autor-gol tocavel" style={{ textAlign: lado === 'A' ? 'left' : 'right' }}
            aria-label={`Tirar um gol de ${jogador ? nomeDoJogador(times, jogador) : 'sem jogador'}`} onClick={() => tirarGol(lado, jogador)}>
            <span className="nome-autor">{jogador ? nomeDoJogador(times, jogador) : 'Sem escolher'}</span>{' '}
            <span className="minuto-gol">{'⚽'.repeat(quantos)}</span>
          </button>
        ))}
        {cartoes.filter((cartao) => cartao.lado === lado).map((cartao) => (
          <button key={`c${cartao.jogador}`} className="autor-gol tocavel row" style={{ gap: 4, justifyContent: lado === 'A' ? 'flex-start' : 'flex-end' }}
            aria-label={`Tirar o cartão de ${nomeDoJogador(times, cartao.jogador)}`} onClick={() => setCartoes(cartoes.filter((outro) => outro.jogador !== cartao.jogador))}>
            <span className="nome-autor">{nomeDoJogador(times, cartao.jogador)}</span><Cartao cor={cartao.cor} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="scr">
      <Barra titulo={titulo} sub={sub} />
      <div className="conteudo" style={{ gap: 10 }}>
        <PlacarDoPalpite times={times} placar={placar} topo={
          <>
            <div className="num" style={{ textAlign: 'center', color: '#fff', fontWeight: 700, letterSpacing: 1, fontSize: 15 }}>SEU PALPITE</div>
            <div className="num" style={{ textAlign: 'center', fontSize: 14, letterSpacing: 1, color: 'var(--amarelo)', marginTop: 4 }}>🔒 FECHA QUANDO O JOGO COMEÇAR</div>
          </>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LADOS.map((lado) => (
            <button key={lado} className="btn w sm" style={{ textTransform: 'none', minWidth: 0 }} onClick={() => setGolDoLado(lado)}>
              <Camisa cor={times[lado].cor} uniforme={times[lado].uniforme} tamanho={20} />
              <span style={{ whiteSpace: 'nowrap' }}>Gol {siglaDoTime(times[lado])}</span>
            </button>
          ))}
        </div>

        <section className="panel" aria-label="Seu palpite">
          {gols.length === 0 && cartoes.length === 0
            ? <div className="pb mut" style={{ textAlign: 'center', fontSize: 13 }}>Toque em <b>Gol</b> ou num jogador da escalação para montar o seu palpite.</div>
            : <>
                <div className="pb" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                  {coluna('A')}<div style={{ alignSelf: 'center', display: 'flex' }}><Bola tamanho={18} /></div>{coluna('B')}
                </div>
                <div className="mut" style={{ textAlign: 'center', padding: '0 12px 8px', fontSize: 12 }}>Toque no jogador para tirar o gol ou o cartão</div>
              </>}
        </section>

        <section className="panel">
          <div className="ph">Escalações<span className="sub">toque para ver os números</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {LADOS.map((lado) => (
              <div key={lado} style={lado === 'A' ? { borderRight: '2px solid var(--divisoria)' } : undefined}>
                <div className="num" style={{ padding: '6px 10px', background: times[lado].cor, color: textoSobre(times[lado].cor), textTransform: 'uppercase', fontSize: 17, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{times[lado].nome}</div>
                {elenco(times[lado]).map((jogador) => {
                  const dele = gols.filter((gol) => gol.jogador === jogador.id).length
                  const cartao = cartoes.find((item) => item.jogador === jogador.id)
                  return (
                    <button key={jogador.id} className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14 }} aria-label={`Palpite em ${jogador.nome}`}
                      onClick={() => setFicha({ lado, jogador })}>
                      <NumeroDaCamisa numero={jogador.camisa} goleiro={jogador.goleiro} cor={times[lado].cor} />
                      <span className="nome" style={{ flex: '0 1 auto' }}>{jogador.nome}</span>
                      <span className="row" style={{ marginLeft: 'auto', gap: 2, flex: 'none', fontSize: 12 }}>{'⚽'.repeat(dele)}{cartao && <Cartao cor={cartao.cor} />}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="ph">Pontos<span className="sub">até {MAXIMO_DE_CARTOES_NO_PALPITE} cartões</span></div>
          <div className="pb mut" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--navy)' }}>
            Placar exato <b>+{PONTOS_DO_BOLAO.placarExato}</b> · só o vencedor <b>+{PONTOS_DO_BOLAO.vencedor}</b><br />
            Cada gol de jogador que acertar <b>+{PONTOS_DO_BOLAO.gol}</b><br />
            Cartão certo <b>+{PONTOS_DO_BOLAO.cartao}</b> · vermelho <b>+{PONTOS_DO_BOLAO.vermelho}</b>
          </div>
          <div className="pb" style={{ paddingTop: 0, display: 'grid', gap: 8 }}>
            {aviso && <div role="status" style={{ fontWeight: 700, color: aviso.startsWith('Palpite salvo') ? 'var(--verde)' : 'var(--vermelho)', textAlign: 'center' }}>{aviso}</div>}
            <button className="btn" disabled={salvando || (!mudou && !!salvo)} onClick={() => void salvar()}>{salvando ? 'Salvando…' : salvo && !mudou ? 'Palpite salvo' : 'Salvar palpite'}</button>
            <button className="btn w sm" onClick={onVoltar}>Voltar aos jogos</button>
          </div>
        </section>
      </div>

      {golDoLado && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Quem faz o gol?" onClick={() => setGolDoLado(null)}>
          <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .9)', overflowY: 'auto' }}>
            <div className="ph">Quem faz o gol? · {siglaDoTime(times[golDoLado])}</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {elenco(times[golDoLado]).map((jogador) => (
                  <button key={jogador.id} className="btn w sm" style={{ textTransform: 'none', minWidth: 0 }} onClick={() => marcar(golDoLado, jogador.id)}>{jogador.nome}</button>
                ))}
              </div>
              <button className="btn w sm" onClick={() => marcar(golDoLado, null)}>Gol sem escolher jogador</button>
              <button className="btn w sm" onClick={() => setGolDoLado(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
      {ficha && (
        <FichaDoJogador torneio={torneio} time={times[ficha.lado]} jogador={ficha.jogador} onFechar={() => setFicha(null)}>
          <button className="btn sm" onClick={() => marcar(ficha.lado, ficha.jogador.id)}>⚽ Faz gol</button>
          {(() => {
            const jaTem = cartoes.some((cartao) => cartao.jogador === ficha.jogador.id)
            const pode = jaTem || cartoes.length < MAXIMO_DE_CARTOES_NO_PALPITE
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['amarelo', 'vermelho'] as const).map((cor) => (
                    <button key={cor} className="btn w sm" disabled={!pode} onClick={() => darCartao(ficha.lado, ficha.jogador.id, cor)}>
                      <Cartao cor={cor} /> {cor === 'amarelo' ? 'Amarelo' : 'Vermelho'}
                    </button>
                  ))}
                </div>
                {!pode && <div className="mut" style={{ fontSize: 13, color: 'var(--vermelho)', fontWeight: 600 }}>Até {MAXIMO_DE_CARTOES_NO_PALPITE} cartões por jogo. Tire um para escolher outro.</div>}
              </>
            )
          })()}
        </FichaDoJogador>
      )}
    </div>
  )
}

/** A ficha do jogador: os números dele neste torneio (base para o palpite) e, embaixo, o que dá para fazer. */
function FichaDoJogador({ torneio, time, jogador, onFechar, children }: {
  torneio: Torneio; time: TimeTorneio; jogador: JogadorDoTime; onFechar: () => void; children: React.ReactNode
}) {
  const jogos = torneio.jogos.filter((jogo) => jogo.resultado?.jogaram && [...jogo.resultado.jogaram.A, ...jogo.resultado.jogaram.B].includes(jogador.id)).length
  const artilharia = artilhariaDoTorneio(torneio)
  const gols = artilharia.find((linha) => linha.id === jogador.id)?.gols ?? 0
  const doTime = artilharia.filter((linha) => linha.time === time.id)
  const artilheiroDoTime = gols > 0 && doTime[0]?.gols === gols
  const assistencias = assistenciasDoTorneio(torneio).find((linha) => linha.id === jogador.id)?.assistencias ?? 0
  const cartoes = cartoesDoTorneio(torneio).find((linha) => linha.id === jogador.id)
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, color: 'var(--navy)', borderBottom: '1px solid var(--divisoria)', padding: '5px 0' }}>
      <span className="mut" style={{ fontWeight: 600 }}>{rotulo}</span><b className="row" style={{ gap: 4 }}>{valor}</b>
    </div>
  )
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={jogador.nome} onClick={onFechar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .92)', overflowY: 'auto' }}>
        <div className="ph">{jogador.nome} · {siglaDoTime(time)}</div>
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          <div className="row" style={{ gap: 10 }}>
            <NumeroDaCamisa numero={jogador.camisa} goleiro={jogador.goleiro} cor={time.cor} />
            <div>
              <div className="num" style={{ fontSize: 22, color: 'var(--navy)', textTransform: 'uppercase' }}>{jogador.nome}</div>
              <div className="mut" style={{ fontSize: 13, fontWeight: 600 }}>
                {time.nome}{jogador.goleiro ? ' · goleiro' : ''}{artilheiroDoTime && <> · <b style={{ color: 'var(--verde)' }}>artilheiro do time</b></>}
              </div>
            </div>
          </div>
          <div>
            <div className="mut" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 700 }}>NESTE TORNEIO · {jogos} {jogos === 1 ? 'JOGO' : 'JOGOS'}</div>
            {linha('Gols', <>{gols}{jogos > 0 && <span className="mut" style={{ fontWeight: 600 }}>({(gols / jogos).toFixed(1).replace('.', ',')} por jogo)</span>}</>)}
            {torneio.regras.assistencias && linha('Assistências', assistencias)}
            {linha('Cartões', cartoes && (cartoes.amarelos || cartoes.vermelhos || cartoes.azuis)
              ? <>{cartoes.amarelos > 0 && <><Cartao cor="amarelo" />{cartoes.amarelos}</>}{cartoes.vermelhos > 0 && <><Cartao cor="vermelho" />{cartoes.vermelhos}</>}{cartoes.azuis > 0 && <><Cartao cor="azul" />{cartoes.azuis}</>}</>
              : 'nenhum')}
          </div>
          {children}
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}

/** Depois que o jogo começa: o placar do jogo (ao vivo ou no fim), o meu palpite comparado e o que a galera palpitou. */
function PalpiteTravado({ bolao, torneio, jogoId, times, eu, titulo, sub, onVoltar }: {
  bolao: BolaoHook; torneio: Torneio; jogoId: string; times: Times; eu: string; titulo: string; sub: string; onVoltar: () => void
}) {
  const situacao = situacaoDoJogo(torneio, jogoId)!
  const partida = torneio.emAndamento.find((item) => item.jogoId === jogoId)
  const [, tique] = useState(0)
  useEffect(() => {
    if (!partida?.crono.rodando) return
    const relogio = setInterval(() => tique((vez) => vez + 1), 1000)
    return () => clearInterval(relogio)
  }, [partida?.crono.rodando])

  const meu = bolao.meus?.[jogoId] ?? bolao.palpitesDosJogos[jogoId]?.[eu]
  const conta = meu ? pontosDoJogo(meu, situacao) : null
  const todos = Object.values(bolao.palpitesDosJogos[jogoId] ?? {})
  const galera = preferenciasDoBolao(todos)
  const nome = (id: string) => nomeDoJogador(times, id)
  const lado = (id: string) => (times.A.jogadores.some((jogador) => jogador.id === id) ? times.A : times.B)
  const pontos = (valor: number | null) => (
    <span className="num" style={{ minWidth: 44, textAlign: 'right', fontSize: 18, color: valor === null ? 'var(--mut)' : valor > 0 ? 'var(--verde)' : 'var(--vermelho)' }}>
      {valor === null ? '…' : valor > 0 ? `+${valor}` : '0'}
    </span>
  )
  const linha = (chave: string, palpite: React.ReactNode, real: React.ReactNode, valor: number | null) => (
    <div key={chave} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, padding: '0 12px', minHeight: 44, borderTop: '1px solid var(--divisoria)', fontSize: 14, color: 'var(--navy)' }}>
      <span className="row" style={{ fontWeight: 700, gap: 4 }}>{palpite}</span>
      <span className="mut row" style={{ fontSize: 13, fontWeight: 600, gap: 4 }}>{real}</span>
      {pontos(valor)}
    </div>
  )

  return (
    <div className="scr">
      <Barra titulo={titulo} sub={sub} />
      <div className="conteudo" style={{ gap: 10 }}>
        {partida
          ? <PlacarLed lados={{ A: { titulo: times.A.nome, cor: times.A.cor, uniforme: times.A.uniforme }, B: { titulo: times.B.nome, cor: times.B.cor, uniforme: times.B.uniforme } }}
              placar={partida.placar} tempoMin={duracaoDoPeriodo(torneio.regras, partida)} gols={torneio.regras.gols} decorrido={decorridoNoPeriodo(partida)}
              rodando={partida.crono.rodando} fim={false} acrescimoMin={partida.crono.acrescimoMin}
              periodo={partida.intervaloAte != null ? 'Intervalo' : torneio.regras.tempos > 1 || partida.prorrogacao ? nomeDoPeriodo(torneio.regras, partida) : undefined} />
          : <PlacarDoPalpite times={times} placar={situacao.placar} topo={<div className="num" style={{ textAlign: 'center', color: 'var(--amarelo)', fontSize: 18, letterSpacing: 1 }}>FIM DE JOGO!</div>} />}
        <div style={{ textAlign: 'center' }}>
          {!meu ? <span className="tag" style={{ fontSize: 14, height: 26 }}>Você não palpitou neste jogo</span>
            : conta?.cravou ? <span className="tag t-ok" style={{ fontSize: 15, height: 28 }}>🎯 Cravou o placar!</span>
            : <span className="tag t-y" style={{ fontSize: 14, height: 26 }}>🔒 Seu palpite: {meu.placar[0]} - {meu.placar[1]} · fechado</span>}
        </div>

        {meu && conta && (
          <section className="panel">
            <div className="ph">Seu palpite × o jogo<span className="sub">{situacao.encerrado ? 'final' : 'por enquanto'}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '6px 12px', fontSize: 11, letterSpacing: 1, fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', background: 'var(--zebra)' }}>
              <span>Palpite</span><span>No jogo</span><span style={{ minWidth: 44, textAlign: 'right' }}>Pts</span>
            </div>
            {linha('placar', `Placar ${meu.placar[0]} - ${meu.placar[1]}`, `${situacao.placar[0]} - ${situacao.placar[1]}${situacao.encerrado ? (conta.cravou ? ' ✓' : '') : ''}`, conta.placar)}
            {conta.gols.map((gol) => linha(`g${gol.jogador}`, <>{nome(gol.jogador)} {'⚽'.repeat(gol.palpite)}<small className="mut">{siglaDoTime(lado(gol.jogador))}</small></>,
              gol.feitos ? `⚽ ${gol.feitos} ${gol.feitos === 1 ? 'gol' : 'gols'}${gol.pontos ? ' ✓' : ''}` : situacao.encerrado ? 'não marcou ✗' : 'ainda não',
              gol.pontos || situacao.encerrado ? gol.pontos : null))}
            {conta.cartoes.map((cartao) => linha(`c${cartao.jogador}`, <>{nome(cartao.jogador)} <Cartao cor={cartao.cor} /><small className="mut">{siglaDoTime(lado(cartao.jogador))}</small></>,
              cartao.levou ? <><Cartao cor={cartao.levou} /> levou ✓</> : situacao.encerrado ? 'sem cartão ✗' : 'sem cartão',
              cartao.pontos || situacao.encerrado ? cartao.pontos : null))}
            <div className="row" style={{ justifyContent: 'space-between', padding: '10px 12px', background: 'var(--navy)', color: '#fff' }}>
              <span className="num" style={{ fontSize: 16, letterSpacing: 1 }}>{situacao.encerrado ? 'PONTOS NESTE JOGO' : 'ATÉ AGORA'}</span>
              <b className="num" style={{ fontSize: 28, color: 'var(--amarelo)' }}>+{conta.total}</b>
            </div>
          </section>
        )}
        {!situacao.encerrado && <div className="panel pb mut" style={{ fontSize: 13, color: 'var(--navy)' }}>Os pontos do placar só valem no apito final. Gols e cartões contam na hora.</div>}

        {todos.length > 0 && (Object.keys(galera.gols).length > 0 || Object.keys(galera.cartoes).length > 0) && (
          <section className="panel">
            <div className="ph">O que a galera palpitou<span className="sub">{todos.length} {todos.length === 1 ? 'palpite' : 'palpites'}</span></div>
            {Object.entries(galera.gols).sort((primeiro, segundo) => segundo[1] - primeiro[1]).slice(0, 5).map(([jogador, porcento]) => (
              <div key={`g${jogador}`} className="tr" style={{ minHeight: 40, fontSize: 14 }}>
                <span className="nome">⚽ {nome(jogador)} <small className="mut">{siglaDoTime(lado(jogador))}</small></span><b>{porcento}%</b>
              </div>
            ))}
            {Object.entries(galera.cartoes).sort((primeiro, segundo) => segundo[1] - primeiro[1]).slice(0, 3).map(([jogador, porcento]) => (
              <div key={`c${jogador}`} className="tr" style={{ minHeight: 40, fontSize: 14 }}>
                <span className="nome row" style={{ gap: 4 }}><Cartao cor="amarelo" /> {nome(jogador)} <small className="mut">{siglaDoTime(lado(jogador))}</small></span><b>{porcento}%</b>
              </div>
            ))}
          </section>
        )}
        <button className="btn w sm" onClick={onVoltar}>Voltar aos jogos</button>
      </div>
    </div>
  )
}
