// Telão do torneio (protótipo): a tela de um campo para TV, projetor ou tablet na parede.
// Só mostra, ninguém mexe. Cada campo tem o seu telão. Sem som (pode atrapalhar o jogo).
// - Jogo rolando no campo: placar enorme, cronômetro, gols e cartões; gol abre a vinheta "GOOOL!".
// - Campo parado: alterna sozinho entre o próximo jogo, a classificação e a artilharia.
// - Torneio acabou: o campeão.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import {
  artilhariaDoTorneio, campeao, classificacao, decorridoNoPeriodo, duracaoDoPeriodo, jogoPorId, nomeDoGrupo, nomeDoPeriodo, placarDosPenaltis,
  proximosPorCampo, quemBate, temposDaFase, timesDoJogo, ultimoPeriodo, vencedor, vencedorDosPenaltis, type LinhaDaTabela,
} from '../../logic/torneio'
import { tempoTotalMs } from '../../logic/cronometro'
import type { Gol, Lado } from '../../types/pelada'
import type { PartidaTorneio, Penaltis, TimeTorneio, Torneio } from '../../types/torneio'
import { completar } from '../../store/torneio'
import { luminancia } from '../../utils/cores'
import { formatarTempo, minutoDoGol } from '../../utils/formatar'
import { nomeDoJogo, timePorId } from './nomes'

/** Quanto tempo cada quadro fica na tela quando o campo está parado. */
const TEMPO_DO_QUADRO_MS = 12_000
/** Quanto tempo a vinheta do gol fica na tela. */
const TEMPO_DA_VINHETA_MS = 6_000

/** Relógio da tela: redesenha a cada meio segundo. */
function useAgora(intervaloMs = 500) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}

/** Quanto tempo o resultado final fica na tela depois que o jogo do campo acaba. */
const TEMPO_DO_FIM_DE_JOGO_MS = 45_000

export function TelaoTorneio({ torneio, campo }: { torneio: Torneio; campo: number }) {
  const agora = useAgora()
  const partida = torneio.emAndamento.find((emJogo) => emJogo.campo === campo) ?? null
  const idDoCampeao = campeao(torneio)
  const campos = Math.max(1, torneio.regras.campos)
  const encerrado = useJogoQueAcabou(torneio, partida)

  return (
    // só o painel: sem barra do topo nem rodapé (o campo aparece na linha da fase)
    <div className="telao">
      {idDoCampeao ? <Campeao torneio={torneio} idDoTime={idDoCampeao} />
        : partida ? <JogoNoTelao torneio={torneio} partida={partida} agora={agora} campo={campos > 1 ? campo : null} />
          : encerrado ? <FimDeJogoNoTelao torneio={torneio} jogoId={encerrado} campo={campos > 1 ? campo : null} />
            : <CampoParado torneio={torneio} campo={campo} agora={agora} />}
    </div>
  )
}

/**
 * O jogo que acabou de terminar neste campo (por alguns segundos, para mostrar o resultado final).
 * Quando o jogo some de "em andamento" e já tem resultado, guarda o id até o tempo passar ou outro jogo começar.
 */
function useJogoQueAcabou(torneio: Torneio, partida: PartidaTorneio | null): string | null {
  const [encerrado, setEncerrado] = useState<{ jogoId: string; ate: number } | null>(null)
  const ultimoJogo = useRef<string | null>(partida?.jogoId ?? null)
  useEffect(() => {
    if (partida) {
      ultimoJogo.current = partida.jogoId
      setEncerrado(null)
      return
    }
    const anterior = ultimoJogo.current
    if (anterior && jogoPorId(torneio, anterior)?.resultado) {
      setEncerrado({ jogoId: anterior, ate: Date.now() + TEMPO_DO_FIM_DE_JOGO_MS })
      ultimoJogo.current = null
    }
  }, [partida, torneio])
  useEffect(() => {
    if (!encerrado) return
    const id = setTimeout(() => setEncerrado(null), Math.max(0, encerrado.ate - Date.now()))
    return () => clearTimeout(id)
  }, [encerrado])
  return encerrado?.jogoId ?? null
}

function FimDeJogoNoTelao({ torneio, jogoId, campo }: { torneio: Torneio; jogoId: string; campo: number | null }) {
  const jogo = jogoPorId(torneio, jogoId)!
  const resultado = jogo.resultado!
  const ids = timesDoJogo(torneio, jogo)
  const times: Record<Lado, TimeTorneio | undefined> = { A: timePorId(torneio, ids.A), B: timePorId(torneio, ids.B) }
  const ladoQueGanhou = vencedor(jogo, torneio)
  const duracao = torneio.regras.tempoMin
  return (
    <main className="telao-jogo">
      <div className="telao-fase">{campo ? `Campo ${campo} · ` : ''}{nomeDoJogo(torneio, jogo)}</div>
      <div className="telao-fim">Fim de jogo</div>
      <div className="telao-placar">
        <TimeNoTelao time={times.A} />
        <div className="telao-gols"><span>{resultado.placar[0]}</span><span className="telao-x">x</span><span>{resultado.placar[1]}</span></div>
        <TimeNoTelao time={times.B} />
      </div>
      {resultado.penaltis && <div className="telao-situacao">Pênaltis: {resultado.penaltis[0]} x {resultado.penaltis[1]}</div>}
      <div className="telao-lances">
        <Lances partida={{ gols: resultado.gols, cartoes: resultado.cartoes }} lado="A" duracao={duracao} />
        <Lances partida={{ gols: resultado.gols, cartoes: resultado.cartoes }} lado="B" duracao={duracao} />
      </div>
      <div className="telao-vez vencedor parado">{ladoQueGanhou ? `${times[ladoQueGanhou]?.nome} venceu` : 'Empate'}</div>
    </main>
  )
}

// ---------- Jogo rolando ----------

function JogoNoTelao({ torneio, partida, agora, campo }: { torneio: Torneio; partida: PartidaTorneio; agora: number; campo: number | null }) {
  const { regras } = torneio
  const jogo = jogoPorId(torneio, partida.jogoId)!
  const ids = timesDoJogo(torneio, jogo)
  const times: Record<Lado, TimeTorneio | undefined> = { A: timePorId(torneio, ids.A), B: timePorId(torneio, ids.B) }
  const duracao = duracaoDoPeriodo(regras, partida)
  const totalMs = tempoTotalMs(duracao, partida.crono)
  const decorrido = decorridoNoPeriodo(partida, agora)
  const noIntervalo = partida.intervaloAte != null
  const acabouGols = regras.gols !== null && (partida.placar[0] >= regras.gols || partida.placar[1] >= regras.gols)
  const fim = (decorrido >= totalMs && ultimoPeriodo(regras, partida)) || acabouGols
  const variosTempos = temposDaFase(regras, partida) > 1 || partida.prorrogacao
  // acréscimo só quando foi dado (sem ele, passar do tempo é só o mesário que ainda não confirmou o fim)
  const acrescimoDado = partida.crono.acrescimoMin ?? 0
  const acrescimo = Math.min(Math.max(0, decorrido - duracao * 60_000), acrescimoDado * 60_000)

  const situacao = noIntervalo ? `Intervalo · volta em ${formatarTempo(Math.max(0, partida.intervaloAte! - agora))}`
    : fim ? 'Fim de jogo'
      : partida.crono.rodando ? '● Ao vivo' : 'Pausado'

  const vinheta = useVinhetaDoGol(partida)

  if (partida.penaltis) return <PenaltisNoTelao torneio={torneio} partida={partida} penaltis={partida.penaltis} times={times} campo={campo} />

  return (
    <main className="telao-jogo">
      <div className="telao-fase">{campo ? `Campo ${campo} · ` : ''}{nomeDoJogo(torneio, jogo)}{variosTempos ? ` · ${nomeDoPeriodo(regras, partida)}` : ''}</div>
      <div className={'telao-situacao' + (partida.crono.rodando && !fim ? ' ao-vivo' : '')}>{situacao}</div>
      <div className={'telao-relogio' + (decorrido >= duracao * 60_000 ? ' passou' : '')}>{formatarTempo(Math.min(decorrido, duracao * 60_000))}</div>
      <div className="telao-acrescimo">
        {(partida.crono.acrescimoMin || acrescimo >= 1000) ? `+${formatarTempo(Math.max(0, acrescimo))}${partida.crono.acrescimoMin ? ` de +${partida.crono.acrescimoMin} min` : ''} de acréscimo` : ' '}
      </div>
      <div className="telao-placar">
        <TimeNoTelao time={times.A} />
        <div className="telao-gols">
          <span>{partida.placar[0]}</span><span className="telao-x">x</span><span>{partida.placar[1]}</span>
        </div>
        <TimeNoTelao time={times.B} />
      </div>
      <div className="telao-lances">
        <Lances partida={partida} lado="A" duracao={duracao} />
        <Lances partida={partida} lado="B" duracao={duracao} />
      </div>
      <div className="telao-barra"><div style={{ width: `${Math.min(100, (decorrido / (duracao * 60_000)) * 100)}%` }} /></div>
      {vinheta && partida.gols[vinheta.indiceDoGol] && (
        <VinhetaDoGol time={times[partida.gols[vinheta.indiceDoGol].lado]} gol={partida.gols[vinheta.indiceDoGol]} placar={partida.placar} />
      )}
    </main>
  )
}

function TimeNoTelao({ time }: { time: TimeTorneio | undefined }) {
  return (
    <div className="telao-time">
      <Camisa cor={time?.cor ?? '#ffffff'} uniforme={time?.uniforme} tamanho={150} contorno="#ffffff" />
      <div className="telao-nome">{time?.nome ?? 'A definir'}</div>
    </div>
  )
}

/** Gols e cartões de um lado: "Zé 3'", "🟨 Beto". */
function Lances({ partida, lado, duracao }: { partida: Pick<PartidaTorneio, 'gols' | 'cartoes'>; lado: Lado; duracao: number }) {
  const gols = partida.gols.filter((gol) => gol.lado === lado)
  const cartoes = partida.cartoes.filter((cartao) => cartao.lado === lado)
  return (
    <ul className={'telao-lista lado-' + lado}>
      {gols.map((gol, indice) => (
        <li key={'gol' + indice}>
          <Icone nome="bola" tamanho={26} /> {gol.autor ?? 'Gol'}{gol.contra ? ' (contra)' : ''} <b>{minutoDoGol(gol.tempoMs, duracao) ?? ''}</b>
          {gol.assistencia && <small className="telao-passe">passe de {gol.assistencia}</small>}
        </li>
      ))}
      {cartoes.map((cartao, indice) => (
        <li key={'cartao' + indice}><span className={'telao-cartao ' + cartao.cor} /> {cartao.nome}</li>
      ))}
    </ul>
  )
}

/**
 * Mostra a vinheta quando o placar sobe (não na primeira vez que a tela abre). Guarda só qual gol foi:
 * o autor e o passe são lidos do jogo a cada atualização, porque no app o passe é marcado logo depois do gol.
 */
function useVinhetaDoGol(partida: PartidaTorneio) {
  const [vinheta, setVinheta] = useState<{ indiceDoGol: number; ate: number } | null>(null)
  const anterior = useRef({ jogoId: partida.jogoId, total: partida.placar[0] + partida.placar[1] })
  const total = partida.placar[0] + partida.placar[1]
  useEffect(() => {
    const mesmoJogo = anterior.current.jogoId === partida.jogoId
    if (mesmoJogo && total > anterior.current.total) {
      if (partida.gols.length) setVinheta({ indiceDoGol: partida.gols.length - 1, ate: Date.now() + TEMPO_DA_VINHETA_MS })
    }
    anterior.current = { jogoId: partida.jogoId, total }
  }, [partida.jogoId, total, partida.gols])
  useEffect(() => {
    if (!vinheta) return
    const id = setTimeout(() => setVinheta(null), Math.max(0, vinheta.ate - Date.now()))
    return () => clearTimeout(id)
  }, [vinheta])
  return vinheta
}

/** Cor que some no fundo escuro do telão (preto, quase preto). */
const ESCURA_DEMAIS = 0.02

/**
 * Cor do fundo da vinheta: a da camisa; se a camisa for preta e o uniforme tiver uma segunda cor
 * que apareça (a faixa branca do Vasco, por exemplo), usa a segunda.
 */
function corDoFundoDoGol(time: TimeTorneio | undefined): string {
  const cor = time?.cor ?? '#ffd23f'
  const segunda = time?.uniforme?.segunda
  if (luminancia(cor) < ESCURA_DEMAIS && segunda && luminancia(segunda) >= ESCURA_DEMAIS) return segunda
  return cor
}

/** Cores do time que aparecem no fundo escuro (a camisa e a segunda cor do uniforme); sem nenhuma, branco. */
function coresQueAparecem(time: TimeTorneio | undefined): string[] {
  const cores = [time?.cor, time?.uniforme?.segunda].filter((cor): cor is string => !!cor && luminancia(cor) >= ESCURA_DEMAIS)
  return cores.length ? [...new Set(cores)] : ['#ffffff']
}

/**
 * O desenho do uniforme em tela cheia, no mesmo sentido da camisa (as listras horizontais do Flamengo
 * ficam horizontais, a faixa do Vasco desce no mesmo lado). Camisa lisa: sem desenho, só a luz na cor do time.
 */
function desenhoDoUniforme(time: TimeTorneio | undefined): string | null {
  const uniforme = time?.uniforme
  if (!time || !uniforme) return null
  const cor = time.cor
  const segunda = uniforme.segunda
  switch (uniforme.modelo) {
    case 'horizontais': return `repeating-linear-gradient(180deg, ${cor} 0 10%, ${segunda} 10% 20%)`
    case 'verticais': return `repeating-linear-gradient(90deg, ${cor} 0 6.25%, ${segunda} 6.25% 12.5%)`
    case 'faixaHorizontal': return `linear-gradient(180deg, ${cor} 0 42%, ${segunda} 42% 58%, ${cor} 58%)`
    case 'duasFaixas': return `linear-gradient(180deg, ${cor} 0 36%, ${segunda} 36% 44%, ${cor} 44% 56%, ${segunda} 56% 64%, ${cor} 64%)`
    case 'faixaVertical': return `linear-gradient(90deg, ${cor} 0 44%, ${segunda} 44% 56%, ${cor} 56%)`
    case 'duasFaixasVerticais': return `linear-gradient(90deg, ${cor} 0 30%, ${segunda} 30% 37%, ${cor} 37% 63%, ${segunda} 63% 70%, ${cor} 70%)`
    // a faixa da camisa desce do ombro esquerdo para o lado direito (diagonal) ou o contrário (invertida)
    case 'diagonal': return `linear-gradient(60deg, ${cor} 0 42%, ${segunda} 42% 58%, ${cor} 58%)`
    case 'diagonalInvertida': return `linear-gradient(-60deg, ${cor} 0 42%, ${segunda} 42% 58%, ${cor} 58%)`
    case 'meioAMeio': return `linear-gradient(90deg, ${cor} 0 50%, ${segunda} 50%)`
    case 'mangas': return `linear-gradient(90deg, ${segunda} 0 22%, ${cor} 22% 78%, ${segunda} 78%)`
    case 'metadeEmCima': return `linear-gradient(180deg, ${cor} 0 50%, ${segunda} 50%)`
    case 'ombros': return `linear-gradient(180deg, ${segunda} 0 28%, ${cor} 28%)`
    case 'faixaEmV': {
      // um V de ombro a ombro, com a ponta no meio do peito (desenhado num SVG esticado na tela)
      const desenhoDoV = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 18 L50 46 L100 18 L100 30 L50 58 L0 30 Z" fill="${segunda}"/></svg>`
      return `url("data:image/svg+xml,${encodeURIComponent(desenhoDoV)}") center / 100% 100% no-repeat, ${cor}`
    }
    case 'xadrez': return `repeating-conic-gradient(${cor} 0 25%, ${segunda} 0 50%) 0 0 / calc(var(--u) * 12.5) calc(var(--u) * 12.5)`
    default: return null
  }
}

const QUANTOS_CONFETES = 70

/** Papel picado: posição, atraso, duração, giro e cor sorteados uma vez por gol. */
function sortearConfetes(cores: string[]) {
  const todas = [...cores, '#ffd23f', '#ffffff']
  return Array.from({ length: QUANTOS_CONFETES }, (_, indice) => ({
    esquerda: Math.random() * 100,
    atrasoS: Math.random() * 1.6,
    duracaoS: 2.6 + Math.random() * 2.2,
    giro: Math.round(Math.random() * 720 - 360),
    deriva: Math.round(Math.random() * 16 - 8),
    largura: 0.6 + Math.random() * 0.7,
    cor: todas[indice % todas.length],
    redondo: indice % 5 === 0,
  }))
}

/** Papel picado caindo pela tela toda (sorteado uma vez quando aparece). */
function Confetes({ cores }: { cores: string[] }) {
  const [confetes] = useState(() => sortearConfetes(cores))
  return (
    <div className="telao-confetes" aria-hidden="true">
      {confetes.map((confete, indice) => (
        <span key={indice} className={confete.redondo ? 'redondo' : ''} style={{
          left: `${confete.esquerda}%`, background: confete.cor, animationDelay: `${confete.atrasoS}s`, animationDuration: `${confete.duracaoS}s`,
          width: `calc(var(--u) * ${confete.largura})`, ['--giro' as string]: `${confete.giro}deg`, ['--deriva' as string]: `calc(var(--u) * ${confete.deriva})`,
        }} />
      ))}
    </div>
  )
}

function VinhetaDoGol({ time, gol, placar }: { time: TimeTorneio | undefined; gol: Gol; placar: [number, number] }) {
  const autor = gol.autor ? `${gol.autor}${gol.contra ? ' (contra)' : ''}` : null
  const cores = coresQueAparecem(time)
  const desenho = desenhoDoUniforme(time)
  return (
    // com o desenho do uniforme no fundo, sem a luz na cor do time (somadas, camisas claras ficavam lavadas)
    <div className="telao-vinheta" style={{ ['--cor-do-time' as string]: desenho ? '#0a0f14' : corDoFundoDoGol(time) }}>
      {desenho && <div className="telao-uniforme" aria-hidden="true" style={{ background: desenho }} />}
      <Confetes cores={cores} />
      <div className="telao-vinheta-texto">GOOOL!</div>
      <div className="telao-vinheta-time"><Camisa cor={time?.cor ?? '#ffffff'} uniforme={time?.uniforme} tamanho={120} contorno="#ffffff" />{time?.nome}</div>
      {autor && <div className="telao-vinheta-autor">{autor}</div>}
      {gol.assistencia && <div className="telao-vinheta-passe">Assistência: <b>{gol.assistencia}</b></div>}
      <div className="telao-vinheta-placar">{placar[0]} x {placar[1]}</div>
    </div>
  )
}

// ---------- Pênaltis ----------

/** Quanto tempo o "GOL!" / "PERDEU!" de cada cobrança fica na tela. */
const TEMPO_DA_COBRANCA_MS = 3_000

function PenaltisNoTelao({ torneio, partida, penaltis, times, campo }: {
  torneio: Torneio; partida: PartidaTorneio; penaltis: Penaltis; times: Record<Lado, TimeTorneio | undefined>; campo: number | null
}) {
  const jogo = jogoPorId(torneio, partida.jogoId)!
  const [golsA, golsB] = placarDosPenaltis(penaltis)
  const vencedor = vencedorDosPenaltis(penaltis)
  const vez = quemBate(penaltis)
  const ultima = useUltimaCobranca(penaltis)
  return (
    <main className="telao-jogo telao-penaltis">
      <div className="telao-fase">{campo ? `Campo ${campo} · ` : ''}{nomeDoJogo(torneio, jogo)} · Pênaltis</div>
      <div className="telao-situacao">No jogo: {partida.placar[0]} x {partida.placar[1]}</div>
      <div className="telao-placar">
        <TimeNoTelao time={times.A} />
        <div className="telao-gols"><span>{golsA}</span><span className="telao-x">x</span><span>{golsB}</span></div>
        <TimeNoTelao time={times.B} />
      </div>
      <div className="telao-cobrancas">
        <Cobrancas penaltis={penaltis} lado="A" />
        <Cobrancas penaltis={penaltis} lado="B" />
      </div>
      {vencedor ? (
        <div className="telao-vez vencedor">{times[vencedor]?.nome} venceu nos pênaltis!</div>
      ) : (
        <div className="telao-vez" style={{ ['--cor-do-time' as string]: corDoFundoDoGol(times[vez]) }}>Vez do {times[vez]?.nome}</div>
      )}
      {vencedor && <Confetes cores={coresQueAparecem(times[vencedor])} />}
      {ultima && !vencedor && <VinhetaDaCobranca cobranca={ultima} time={times[ultima.lado]} />}
    </main>
  )
}

/** As bolinhas de um lado: verde = gol, vermelha = perdeu, vazia = ainda vai bater (as normais; depois, uma a uma). */
function Cobrancas({ penaltis, lado }: { penaltis: Penaltis; lado: Lado }) {
  const doLado = penaltis.cobrancas.filter((cobranca) => cobranca.lado === lado)
  const vagas = Math.max(penaltis.quantidade, doLado.length)
  return (
    <div className={'telao-bolinhas lado-' + lado}>
      {Array.from({ length: vagas }, (_, indice) => {
        const cobranca = doLado[indice]
        return (
          <span key={indice} className={cobranca ? (cobranca.gol ? 'gol' : 'perdeu') : ''} title={cobranca?.nome ?? ''}>
            {cobranca ? (cobranca.gol ? '✓' : '✕') : ''}
          </span>
        )
      })}
    </div>
  )
}

/** A cobrança que acabou de acontecer (por alguns segundos), para a vinheta. */
function useUltimaCobranca(penaltis: Penaltis) {
  const [ultima, setUltima] = useState<{ cobranca: Penaltis['cobrancas'][number]; ate: number } | null>(null)
  const quantas = useRef(penaltis.cobrancas.length)
  useEffect(() => {
    if (penaltis.cobrancas.length > quantas.current) {
      setUltima({ cobranca: penaltis.cobrancas[penaltis.cobrancas.length - 1], ate: Date.now() + TEMPO_DA_COBRANCA_MS })
    }
    if (penaltis.cobrancas.length < quantas.current) setUltima(null) // voltou a última cobrança
    quantas.current = penaltis.cobrancas.length
  }, [penaltis.cobrancas])
  useEffect(() => {
    if (!ultima) return
    const id = setTimeout(() => setUltima(null), Math.max(0, ultima.ate - Date.now()))
    return () => clearTimeout(id)
  }, [ultima])
  return ultima?.cobranca ?? null
}

function VinhetaDaCobranca({ cobranca, time }: { cobranca: Penaltis['cobrancas'][number]; time: TimeTorneio | undefined }) {
  return (
    <div className={'telao-vinheta telao-cobranca ' + (cobranca.gol ? 'gol' : 'perdeu')}>
      <div className="telao-vinheta-texto">{cobranca.gol ? 'GOL!' : 'PERDEU!'}</div>
      <div className="telao-vinheta-time"><Camisa cor={time?.cor ?? '#ffffff'} uniforme={time?.uniforme} tamanho={120} contorno="#ffffff" />{time?.nome}</div>
      {cobranca.nome && <div className="telao-vinheta-autor">{cobranca.nome}</div>}
    </div>
  )
}

// ---------- Campo parado: quadros que se revezam ----------

type Quadro = { chave: string; titulo: string; conteudo: ReactNode }

function CampoParado({ torneio, campo, agora }: { torneio: Torneio; campo: number; agora: number }) {
  const quadros: Quadro[] = []
  const proximo = proximosPorCampo(torneio).find((item) => item.campo === campo)?.jogo
  quadros.push({
    chave: 'proximo', titulo: 'Próximo jogo',
    conteudo: proximo ? <ProximoJogo torneio={torneio} idDoJogo={proximo.id} /> : <div className="telao-aviso">Aguardando o próximo jogo</div>,
  })
  if (torneio.regras.formato === 'pontos') {
    // pontos corridos: até 10 times numa coluna; até 20 em duas (1º a 10º | 11º a 20º); mais que isso, outro quadro
    const tabela = classificacao(torneio)
    const paginas = Math.ceil(tabela.length / TIMES_POR_QUADRO)
    for (let pagina = 0; pagina < paginas; pagina++) {
      const inicio = pagina * TIMES_POR_QUADRO
      quadros.push({
        chave: 'tabela' + pagina, titulo: paginas > 1 ? `Classificação · ${inicio + 1}º a ${Math.min(tabela.length, inicio + TIMES_POR_QUADRO)}º` : 'Classificação',
        conteudo: <TabelaCorrida torneio={torneio} linhas={tabela.slice(inicio, inicio + TIMES_POR_QUADRO)} inicio={inicio} />,
      })
    }
  }
  if (torneio.regras.formato === 'grupos' && torneio.grupos.length) {
    // até 4 grupos por quadro
    for (let inicio = 0; inicio < torneio.grupos.length; inicio += 4) {
      const grupos = torneio.grupos.slice(inicio, inicio + 4).map((_, indice) => inicio + indice)
      quadros.push({ chave: 'grupos' + inicio, titulo: torneio.grupos.length === 1 ? 'Classificação' : 'Grupos', conteudo: <Tabelas torneio={torneio} grupos={grupos} /> })
    }
  }
  const artilheiros = artilhariaDoTorneio(torneio).slice(0, 8)
  if (artilheiros.length) quadros.push({ chave: 'artilharia', titulo: 'Artilharia', conteudo: <Artilharia torneio={torneio} /> })

  const indice = Math.floor(agora / TEMPO_DO_QUADRO_MS) % quadros.length
  const quadro = quadros[indice]
  return (
    <main className="telao-parado">
      <div className="telao-quadro-titulo">{torneio.regras.campos > 1 ? `Campo ${campo} · ` : ''}{quadro.titulo}</div>
      <div className="telao-quadro" key={quadro.chave}>{quadro.conteudo}</div>
      {quadros.length > 1 && (
        <div className="telao-pontos">{quadros.map((item, posicao) => <span key={item.chave} className={posicao === indice ? 'on' : ''} />)}</div>
      )}
    </main>
  )
}

function ProximoJogo({ torneio, idDoJogo }: { torneio: Torneio; idDoJogo: string }) {
  const jogo = jogoPorId(torneio, idDoJogo)!
  const ids = timesDoJogo(torneio, jogo)
  return (
    <div className="telao-proximo">
      <div className="telao-fase">{nomeDoJogo(torneio, jogo)}</div>
      <div className="telao-placar">
        <TimeNoTelao time={timePorId(torneio, ids.A)} />
        <div className="telao-gols"><span className="telao-x">x</span></div>
        <TimeNoTelao time={timePorId(torneio, ids.B)} />
      </div>
    </div>
  )
}

/** Times por quadro na tabela de pontos corridos (duas colunas de 10). */
const TIMES_POR_QUADRO = 20
const TIMES_POR_COLUNA = 10

function TabelaCorrida({ torneio, linhas, inicio }: { torneio: Torneio; linhas: LinhaDaTabela[]; inicio: number }) {
  const colunas = Math.ceil(linhas.length / TIMES_POR_COLUNA)
  return (
    // uma coluna só fica mais estreita e no meio (sem um vão grande entre o nome e os números)
    <div className="telao-tabelas" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, maxWidth: colunas === 1 ? 'calc(var(--u) * 62)' : undefined }}>
      {Array.from({ length: colunas }, (_, coluna) => (
        <TabelaDoTelao key={coluna} torneio={torneio} titulo={null} linhas={linhas.slice(coluna * TIMES_POR_COLUNA, (coluna + 1) * TIMES_POR_COLUNA)}
          destaque={1} inicio={inicio + coluna * TIMES_POR_COLUNA} compacta />
      ))}
    </div>
  )
}

function Tabelas({ torneio, grupos }: { torneio: Torneio; grupos: (number | null)[] }) {
  const destaque = torneio.regras.formato === 'grupos' ? torneio.regras.classificamPorGrupo : 1
  return (
    <div className="telao-tabelas" style={{ gridTemplateColumns: `repeat(${grupos.length > 1 ? 2 : 1}, minmax(0, 1fr))` }}>
      {grupos.map((grupo) => (
        <TabelaDoTelao key={grupo ?? 'liga'} torneio={torneio} titulo={grupo === null || torneio.grupos.length === 1 ? null : nomeDoGrupo(grupo)}
          linhas={classificacao(torneio, grupo)} destaque={destaque} compacta={grupos.length > 1} />
      ))}
    </div>
  )
}

function TabelaDoTelao({ torneio, titulo, linhas, destaque, compacta, inicio = 0 }: {
  torneio: Torneio; titulo: string | null; linhas: LinhaDaTabela[]; destaque: number; compacta: boolean
  /** posição do primeiro da lista menos 1 (a tabela longa é dividida em colunas e quadros) */
  inicio?: number
}) {
  return (
    <table className={'telao-tabela' + (compacta ? ' compacta' : '')}>
      {/* larguras fixas: posição e números estreitos, o nome do time fica com o resto */}
      <colgroup><col className="coluna-posicao" /><col /><col className="coluna-numero" /><col className="coluna-numero" /><col className="coluna-numero" /><col className="coluna-numero" /></colgroup>
      <thead>
        <tr><th colSpan={2} className="esquerda">{titulo ?? 'Time'}</th><th>P</th><th>J</th><th>V</th><th>SG</th></tr>
      </thead>
      <tbody>
        {linhas.map((linha, posicao) => {
          const time = timePorId(torneio, linha.time)
          return (
            <tr key={linha.time} className={inicio + posicao < destaque ? 'passa' : ''}>
              <td className="posicao">{inicio + posicao + 1}</td>
              <td className="esquerda nome"><span className="telao-time-linha"><Camisa cor={time?.cor ?? '#fff'} uniforme={time?.uniforme} tamanho={compacta ? 26 : 34} contorno="#fff" /><span>{time?.nome}</span></span></td>
              <td><b>{linha.pontos}</b></td><td>{linha.jogos}</td><td>{linha.vitorias}</td><td>{linha.saldo > 0 ? `+${linha.saldo}` : linha.saldo}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Artilharia({ torneio }: { torneio: Torneio }) {
  const artilheiros = artilhariaDoTorneio(torneio).slice(0, 8)
  return (
    <ol className="telao-artilharia">
      {artilheiros.map((artilheiro, posicao) => {
        const time = timePorId(torneio, artilheiro.time)
        return (
          <li key={artilheiro.id}>
            <span className="posicao">{posicao + 1}</span>
            <Camisa cor={time?.cor ?? '#fff'} uniforme={time?.uniforme} tamanho={34} contorno="#fff" />
            <span className="nome">{artilheiro.nome}<small>{time?.nome}</small></span>
            <b>{artilheiro.gols}</b>
          </li>
        )
      })}
    </ol>
  )
}

// ---------- Campeão ----------

function Campeao({ torneio, idDoTime }: { torneio: Torneio; idDoTime: string }) {
  const time = timePorId(torneio, idDoTime)
  return (
    <main className="telao-campeao">
      <Icone nome="trofeu" tamanho={160} />
      <div className="telao-campeao-titulo">Campeão</div>
      <div className="telao-campeao-time"><Camisa cor={time?.cor ?? '#fff'} uniforme={time?.uniforme} tamanho={110} contorno="#fff" />{time?.nome}</div>
    </main>
  )
}

// ---------- Protótipo: telão do torneio deste aparelho ----------

/**
 * Só no desenvolvimento (`?telao=local&campo=1`): mostra o torneio guardado neste navegador.
 * Abrindo o app em outra aba e marcando o jogo, o telão acompanha (o navegador avisa as outras abas).
 * O telão de verdade vai ler o torneio compartilhado na nuvem, com o pareamento pelo código.
 */
export function TelaoLocal({ campo }: { campo: number }) {
  const [torneio, setTorneio] = useState<Torneio | null>(() => lerTorneioLocal())
  useEffect(() => {
    const atualizar = () => setTorneio(lerTorneioLocal())
    window.addEventListener('storage', atualizar)
    const id = setInterval(atualizar, 1000)
    return () => { window.removeEventListener('storage', atualizar); clearInterval(id) }
  }, [])
  if (!torneio) return <div className="telao"><main className="telao-parado"><div className="telao-aviso">Nenhum torneio neste aparelho</div></main></div>
  return <TelaoTorneio torneio={torneio} campo={campo} />
}

function lerTorneioLocal(): Torneio | null {
  try {
    const salvo = localStorage.getItem('torneio:v1')
    return salvo ? completar(JSON.parse(salvo) as Torneio) : null
  } catch {
    return null
  }
}
