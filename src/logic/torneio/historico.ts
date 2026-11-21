// Histórico de torneios (PLANO.md, seção 24): quando o torneio acaba, um resumo pequeno vai para a conta de quem
// participou (organizador, quem jogou com conta e quem entrou no bolão). Fica lá mesmo se o organizador apagar o torneio.

import type { Placar } from '../../types/pelada'
import type { JogoTorneio, Torneio, Uniforme } from '../../types/torneio'
import type { LinhaDoRanking } from './bolao'
import { resumoDoTorneioParaAsCartas, viceCampeao } from './carta'
import { classificacao } from './classificacao'
import { artilhariaDoTorneio, assistenciasDoTorneio, cartoesDoTorneio, goleirosDoTorneio } from './estatisticas'
import { campeao, timesDoJogo, vencedor } from './jogos'

export type TimeNoHistorico = { id: string; nome: string; cor: string; uniforme?: Uniforme }
export type JogoNoHistorico = { rodada: string; fase: JogoTorneio['fase']; grupo: number | null; casa: string | null; fora: string | null; placar: Placar; penaltis: Placar | null }
export type JogadorNoHistorico = { time: string; camisa?: number; jogos: number; gols: number; assistencias: number; amarelos: number; vermelhos: number }
export type BolaoNoHistorico = {
  participantes: number
  primeiros: { nome: string; posicao: number; pontos: number }[]
  contas: Record<string, { posicao: number; pontos: number; cravados: number; campeao: boolean }>
}
/** O destaque: quem, de que time (id) e o número. */
export type DestaqueNoHistorico = { nome: string; time: string; valor: number; segundo?: number }

export type TorneioEncerrado = {
  nome: string
  data: number // quando acabou
  organizador: string | null
  formato: Torneio['regras']['formato']
  times: TimeNoHistorico[]
  podio: string[] // ids: campeão, vice e 3º (quando dá para saber)
  final: { placar: Placar; penaltis: Placar | null } | null // o placar da final, do ponto de vista do campeão
  artilheiro: DestaqueNoHistorico | null // valor = gols
  garcom: DestaqueNoHistorico | null // valor = assistências
  luva: DestaqueNoHistorico | null // valor = gols sofridos, segundo = jogos
  cartoes: DestaqueNoHistorico | null // valor = amarelos, segundo = vermelhos
  melhor: { nome: string; time: string } | null
  jogos: JogoNoHistorico[]
  jogadores: Record<string, JogadorNoHistorico> // por conta
  bolao: BolaoNoHistorico | null
}
export type TorneioNoHistorico = TorneioEncerrado & { id: string }

/** O 3º lugar: quem ganhou a disputa de 3º ou o 3º da tabela (pontos corridos). */
function terceiro(torneio: Torneio): string | null {
  if (torneio.regras.formato === 'pontos') return classificacao(torneio)[2]?.time ?? null
  const disputa = torneio.jogos.find((jogo) => jogo.rodada === 'Disputa de 3º lugar')
  const lado = disputa ? vencedor(disputa, torneio) : null
  return disputa && lado ? timesDoJogo(torneio, disputa)[lado] : null
}

/** O resumo do torneio encerrado para o histórico. null = ainda não tem campeão. */
export function torneioParaOHistorico(torneio: Torneio, ranking: LinhaDoRanking[] | null = null): TorneioEncerrado | null {
  const idCampeao = campeao(torneio)
  if (!idCampeao) return null
  const fins = torneio.jogos.flatMap((jogo) => (jogo.resultado?.encerradoEm ? [jogo.resultado.encerradoEm] : []))
  const podio = [idCampeao, viceCampeao(torneio), terceiro(torneio)].filter((time): time is string => !!time)

  // a final do ponto de vista do campeão (em ida e volta, a volta)
  const jogoFinal = torneio.regras.formato === 'pontos' ? undefined : torneio.jogos.filter((jogo) => jogo.rodada === 'Final').at(-1)
  let final: TorneioEncerrado['final'] = null
  if (jogoFinal?.resultado) {
    const { placar, penaltis } = jogoFinal.resultado
    const campeaoEmCasa = timesDoJogo(torneio, jogoFinal).A === idCampeao
    final = campeaoEmCasa ? { placar, penaltis } : { placar: [placar[1], placar[0]], penaltis: penaltis ? [penaltis[1], penaltis[0]] : null }
  }

  const artilheiro = artilhariaDoTorneio(torneio)[0]
  const garcom = assistenciasDoTorneio(torneio)[0]
  const luva = goleirosDoTorneio(torneio)[0]
  const cartoes = cartoesDoTorneio(torneio).sort((x, y) => (y.amarelos + 2 * y.vermelhos) - (x.amarelos + 2 * x.vermelhos) || x.nome.localeCompare(y.nome))[0]
  const timeDoMelhor = torneio.times.find((time) => time.jogadores.some((jogador) => jogador.id === torneio.melhorJogador))
  const melhor = timeDoMelhor?.jogadores.find((jogador) => jogador.id === torneio.melhorJogador)

  const jogadores: Record<string, JogadorNoHistorico> = {}
  for (const resumo of resumoDoTorneioParaAsCartas(torneio)) {
    const time = torneio.times.find((candidato) => candidato.jogadores.some((jogador) => jogador.conta === resumo.conta))
    const camisa = time?.jogadores.find((jogador) => jogador.conta === resumo.conta)?.camisa
    jogadores[resumo.conta] = {
      time: time?.id ?? '', ...(camisa !== undefined && { camisa }),
      jogos: resumo.jogos, gols: resumo.gols, assistencias: resumo.assistencias, amarelos: resumo.amarelos, vermelhos: resumo.vermelhos,
    }
  }

  const bolao: BolaoNoHistorico | null = ranking && ranking.length > 0 ? {
    participantes: ranking.length,
    primeiros: ranking.filter((linha) => linha.posicao <= 3).slice(0, 5).map((linha) => ({ nome: linha.nome, posicao: linha.posicao, pontos: linha.pontos })),
    contas: Object.fromEntries(ranking.map((linha) => [linha.uid, { posicao: linha.posicao, pontos: linha.pontos, cravados: linha.cravados, campeao: linha.campeao > 0 }])),
  } : null

  return {
    nome: torneio.nome,
    data: fins.length ? Math.max(...fins) : 0,
    organizador: torneio.nuvem?.organizador ?? null,
    formato: torneio.regras.formato,
    times: torneio.times.map((time) => ({ id: time.id, nome: time.nome, cor: time.cor, ...(time.uniforme && { uniforme: time.uniforme }) })),
    podio,
    final,
    artilheiro: artilheiro?.gols ? { nome: artilheiro.nome, time: artilheiro.time, valor: artilheiro.gols } : null,
    garcom: garcom?.assistencias ? { nome: garcom.nome, time: garcom.time, valor: garcom.assistencias } : null,
    luva: luva?.jogos ? { nome: luva.nome, time: luva.time, valor: luva.sofridos, segundo: luva.jogos } : null,
    cartoes: cartoes && cartoes.amarelos + cartoes.vermelhos > 0 ? { nome: cartoes.nome, time: cartoes.time, valor: cartoes.amarelos, segundo: cartoes.vermelhos } : null,
    melhor: melhor && timeDoMelhor ? { nome: melhor.nome, time: timeDoMelhor.id } : null,
    jogos: torneio.jogos.filter((jogo) => jogo.resultado).sort((x, y) => (x.resultado!.encerradoEm ?? x.resultado!.sequencia) - (y.resultado!.encerradoEm ?? y.resultado!.sequencia)).map((jogo) => {
      const times = timesDoJogo(torneio, jogo)
      return { rodada: jogo.rodada, fase: jogo.fase, grupo: jogo.grupo, casa: times.A, fora: times.B, placar: jogo.resultado!.placar, penaltis: jogo.resultado!.penaltis }
    }),
    jogadores,
    bolao,
  }
}

export type Colocacao = 'campeao' | 'vice' | 'terceiro' | null

/** O que a pessoa fez no torneio: organizou, jogou (por qual time, em que colocação) e o bolão. */
export function euNoTorneio(torneio: TorneioEncerrado, conta: string) {
  const jogador = torneio.jogadores[conta] ?? null
  const time = jogador ? torneio.times.find((candidato) => candidato.id === jogador.time) ?? null : null
  const lugar = time ? torneio.podio.indexOf(time.id) : -1
  const colocacao: Colocacao = lugar === 0 ? 'campeao' : lugar === 1 ? 'vice' : lugar === 2 ? 'terceiro' : null
  return { organizou: torneio.organizador === conta, jogador, time, colocacao, bolao: torneio.bolao?.contas[conta] ?? null }
}

/** "Seus números" no topo do histórico. */
export function numerosDoHistorico(torneios: TorneioEncerrado[], conta: string) {
  let titulos = 0
  let gols = 0
  let melhorBolao: number | null = null
  for (const torneio of torneios) {
    const eu = euNoTorneio(torneio, conta)
    if (eu.colocacao === 'campeao') titulos++
    gols += eu.jogador?.gols ?? 0
    if (eu.bolao && (melhorBolao === null || eu.bolao.posicao < melhorBolao)) melhorBolao = eu.bolao.posicao
  }
  return { torneios: torneios.length, titulos, gols, melhorBolao }
}
