// Bolão do torneio (PLANO.md, seção 23): palpites sem dinheiro, só pontos. Cada um palpita o placar de cada jogo, quem
// faz os gols e quem leva cartão (fecha quando o jogo começa) e, antes do 1º jogo, o campeão, o vice, o artilheiro, o
// garçom e quem leva mais cartões. O ranking sai sozinho dos resultados do torneio.

import type { CorCartao, Gol, Cartao, Lado, Placar } from '../../types/pelada'
import type { Torneio } from '../../types/torneio'
import { classificacao } from './classificacao'
import { artilhariaDoTorneio, assistenciasDoTorneio, cartoesDoTorneio } from './estatisticas'
import { campeao, timesDoJogo, vencedor } from './jogos'

export const PONTOS_DO_BOLAO = {
  placarExato: 3, vencedor: 1, gol: 2, cartao: 2, vermelho: 4,
  campeao: 10, vice: 5, artilheiro: 8, garcom: 5, maisCartoes: 5,
} as const

/** Cartões que dá para palpitar em um jogo (sem limite, todo mundo marcaria cartão em todos). */
export const MAXIMO_DE_CARTOES_NO_PALPITE = 2

export type CorDoPalpite = 'amarelo' | 'vermelho'
export type GolDoPalpite = { lado: Lado; jogador: string | null } // null = gol sem escolher quem faz
export type CartaoDoPalpite = { lado: Lado; jogador: string; cor: CorDoPalpite }
export type PalpiteDoJogo = { placar: Placar; gols: GolDoPalpite[]; cartoes: CartaoDoPalpite[]; em: number }

export type PalpiteDoTorneio = {
  campeao: string | null; vice: string | null // ids dos times
  artilheiro: string | null; garcom: string | null; maisCartoes: string | null // ids dos jogadores
  em: number
}

export type ParticipanteDoBolao = { uid: string; nome: string; em: number }

/** O placar do palpite é sempre a soma dos gols (os sem jogador também contam). */
export function placarDoPalpite(gols: GolDoPalpite[]): Placar {
  return [gols.filter((gol) => gol.lado === 'A').length, gols.filter((gol) => gol.lado === 'B').length]
}

/** Como está o jogo para o bolão: null = não começou (os palpites ainda abertos). */
export type SituacaoDoJogo = { placar: Placar; gols: Gol[]; cartoes: Cartao[]; encerrado: boolean }

export function situacaoDoJogo(torneio: Torneio, jogoId: string): SituacaoDoJogo | null {
  const jogo = torneio.jogos.find((item) => item.id === jogoId)
  if (jogo?.resultado) return { placar: jogo.resultado.placar, gols: jogo.resultado.gols, cartoes: jogo.resultado.cartoes, encerrado: true }
  const partida = torneio.emAndamento.find((item) => item.jogoId === jogoId)
  return partida ? { placar: partida.placar, gols: partida.gols, cartoes: partida.cartoes, encerrado: false } : null
}

/** Os palpites do jogo fecham quando ele começa. */
export const palpiteDoJogoFechado = (torneio: Torneio, jogoId: string) => situacaoDoJogo(torneio, jogoId) !== null

/** Os palpites do torneio (campeão, artilheiro…) fecham no 1º jogo. */
export const palpiteDoTorneioFechado = (torneio: Torneio) => torneio.emAndamento.length > 0 || torneio.jogos.some((jogo) => jogo.resultado)

export type GolConferido = { jogador: string; palpite: number; feitos: number; pontos: number }
export type CartaoConferido = { jogador: string; cor: CorDoPalpite; levou: CorCartao | null; pontos: number }
export type PontosDoJogo = {
  placar: number | null // null = só no apito final
  cravou: boolean
  gols: GolConferido[]
  cartoes: CartaoConferido[]
  total: number
}

const sinal = (placar: Placar) => Math.sign(placar[0] - placar[1])

/**
 * Pontos de um palpite. Gols e cartões contam na hora (o que já aconteceu não desacontece); o placar só no fim:
 * exato +3, só o vencedor (ou o empate) +1. Cada gol de jogador acertado +2 (palpitou 2 e ele fez 1: +2). Cartão
 * em quem levou +2; vermelho palpitado em quem foi expulso +4.
 */
export function pontosDoJogo(palpite: PalpiteDoJogo, situacao: SituacaoDoJogo): PontosDoJogo {
  const feitos = new Map<string, number>()
  for (const gol of situacao.gols) if (gol.autorId && !gol.contra) feitos.set(gol.autorId, (feitos.get(gol.autorId) ?? 0) + 1)
  const palpitados = new Map<string, number>()
  for (const gol of palpite.gols) if (gol.jogador) palpitados.set(gol.jogador, (palpitados.get(gol.jogador) ?? 0) + 1)
  const gols = [...palpitados].map(([jogador, quantos]) => {
    const fez = feitos.get(jogador) ?? 0
    return { jogador, palpite: quantos, feitos: fez, pontos: Math.min(quantos, fez) * PONTOS_DO_BOLAO.gol }
  })

  const cartoes = palpite.cartoes.map((cartao) => {
    const dele = situacao.cartoes.filter((real) => real.jogadorId === cartao.jogador)
    const levou: CorCartao | null = dele.some((real) => real.cor === 'vermelho') ? 'vermelho' : dele[0]?.cor ?? null
    const pontos = !levou ? 0 : cartao.cor === 'vermelho' && levou === 'vermelho' ? PONTOS_DO_BOLAO.vermelho : PONTOS_DO_BOLAO.cartao
    return { jogador: cartao.jogador, cor: cartao.cor, levou, pontos }
  })

  const cravou = situacao.encerrado && palpite.placar[0] === situacao.placar[0] && palpite.placar[1] === situacao.placar[1]
  const placar = !situacao.encerrado ? null
    : cravou ? PONTOS_DO_BOLAO.placarExato
    : sinal(palpite.placar) === sinal(situacao.placar) ? PONTOS_DO_BOLAO.vencedor : 0
  const total = (placar ?? 0) + gols.reduce((soma, gol) => soma + gol.pontos, 0) + cartoes.reduce((soma, cartao) => soma + cartao.pontos, 0)
  return { placar, cravou, gols, cartoes, total }
}

/** Quem acertou o quê no torneio, depois que ele acaba (null antes). Empatados no topo valem todos. */
export type RespostasDoTorneio = { campeao: string; vice: string | null; artilheiros: string[]; garcons: string[]; maisCartoes: string[] }

const lideres = <T,>(lista: T[], valor: (item: T) => number, id: (item: T) => string) => {
  const maior = Math.max(0, ...lista.map(valor))
  return maior > 0 ? lista.filter((item) => valor(item) === maior).map(id) : []
}

export function respostasDoTorneio(torneio: Torneio): RespostasDoTorneio | null {
  const primeiro = campeao(torneio)
  if (!primeiro) return null
  let vice: string | null = null
  if (torneio.regras.formato === 'pontos') vice = classificacao(torneio)[1]?.time ?? null
  else {
    const final = torneio.jogos.filter((jogo) => jogo.rodada === 'Final').at(-1)
    const lado = final ? vencedor(final, torneio) : null
    if (final && lado) vice = timesDoJogo(torneio, final)[lado === 'A' ? 'B' : 'A'] ?? null
  }
  return {
    campeao: primeiro, vice,
    artilheiros: lideres(artilhariaDoTorneio(torneio), (linha) => linha.gols, (linha) => linha.id),
    garcons: lideres(assistenciasDoTorneio(torneio), (linha) => linha.assistencias, (linha) => linha.id),
    maisCartoes: lideres(cartoesDoTorneio(torneio), (linha) => linha.amarelos + linha.vermelhos + linha.azuis, (linha) => linha.id),
  }
}

export type PontosDoTorneio = Record<'campeao' | 'vice' | 'artilheiro' | 'garcom' | 'maisCartoes', number> & { total: number }

export function pontosDoTorneio(palpite: PalpiteDoTorneio | undefined, respostas: RespostasDoTorneio | null): PontosDoTorneio {
  const acertou = (escolha: string | null | undefined, certo: boolean, pontos: number) => (escolha && certo ? pontos : 0)
  const pontos = {
    campeao: acertou(palpite?.campeao, palpite?.campeao === respostas?.campeao, PONTOS_DO_BOLAO.campeao),
    vice: acertou(palpite?.vice, palpite?.vice === respostas?.vice, PONTOS_DO_BOLAO.vice),
    artilheiro: acertou(palpite?.artilheiro, !!respostas?.artilheiros.includes(palpite?.artilheiro ?? ''), PONTOS_DO_BOLAO.artilheiro),
    garcom: acertou(palpite?.garcom, !!respostas?.garcons.includes(palpite?.garcom ?? ''), PONTOS_DO_BOLAO.garcom),
    maisCartoes: acertou(palpite?.maisCartoes, !!respostas?.maisCartoes.includes(palpite?.maisCartoes ?? ''), PONTOS_DO_BOLAO.maisCartoes),
  }
  return { ...pontos, total: Object.values(pontos).reduce((soma, valor) => soma + valor, 0) }
}

/**
 * Linha do ranking com o que desempata: `cravados` (placares exatos), `campeao` (acertou o campeão: 1), `gols` (gols
 * de jogador acertados) e `vencedores` (jogos em que acertou quem venceu ou o empate).
 */
export type LinhaDoRanking = {
  uid: string; nome: string; posicao: number; pontos: number
  cravados: number; campeao: number; gols: number; vencedores: number; em: number
}

/** A ordem do desempate (PLANO.md, seção 23); empatou em tudo, divide a posição. */
const CRITERIOS_DO_DESEMPATE = ['pontos', 'cravados', 'campeao', 'gols', 'vencedores'] as const

/**
 * Ranking: mais pontos; empatou, mais placares cravados; depois quem acertou o campeão, mais gols de jogador acertados e
 * mais vencedores acertados. Empatados em tudo dividem a posição (2º e 2º; o próximo é o 4º).
 * `palpites`: por jogo, os palpites de cada participante (só dos jogos que já começaram).
 */
export function rankingDoBolao(torneio: Torneio, participantes: ParticipanteDoBolao[], palpitesDoTorneio: Record<string, PalpiteDoTorneio>,
  palpites: Record<string, Record<string, PalpiteDoJogo>>): LinhaDoRanking[] {
  const respostas = respostasDoTorneio(torneio)
  const situacoes = new Map(Object.keys(palpites).map((jogoId) => [jogoId, situacaoDoJogo(torneio, jogoId)]))
  const linhas = participantes.map((participante) => {
    let pontos = pontosDoTorneio(palpitesDoTorneio[participante.uid], respostas).total
    let cravados = 0
    let gols = 0
    let vencedores = 0
    for (const [jogoId, deCadaUm] of Object.entries(palpites)) {
      const palpite = deCadaUm[participante.uid]
      const situacao = situacoes.get(jogoId)
      if (!palpite || !situacao) continue
      const conta = pontosDoJogo(palpite, situacao)
      pontos += conta.total
      if (conta.cravou) cravados++
      if (conta.placar) vencedores++ // placar exato também acertou quem venceu
      gols += conta.gols.reduce((soma, gol) => soma + Math.min(gol.palpite, gol.feitos), 0)
    }
    const campeao = respostas && palpitesDoTorneio[participante.uid]?.campeao === respostas.campeao ? 1 : 0
    return { uid: participante.uid, nome: participante.nome, pontos, cravados, campeao, gols, vencedores, em: participante.em, posicao: 0 }
  })
  const comparar = (primeiro: LinhaDoRanking, segundo: LinhaDoRanking) => {
    for (const criterio of CRITERIOS_DO_DESEMPATE) if (segundo[criterio] !== primeiro[criterio]) return segundo[criterio] - primeiro[criterio]
    return 0
  }
  // empatados em tudo ficam na ordem alfabética, só para a lista não pular de lugar
  linhas.sort((primeiro, segundo) => comparar(primeiro, segundo) || primeiro.nome.localeCompare(segundo.nome))
  linhas.forEach((linha, indice) => {
    const anterior = linhas[indice - 1]
    linha.posicao = anterior && comparar(anterior, linha) === 0 ? anterior.posicao : indice + 1
  })
  return linhas
}

/** Quantos % palpitaram gol (ou cartão) em cada jogador de um jogo (só depois que o jogo começa). */
export function preferenciasDoBolao(palpitesDoJogo: PalpiteDoJogo[]): { gols: Record<string, number>; cartoes: Record<string, number> } {
  const total = palpitesDoJogo.length
  const contar = (listas: string[][]) => {
    const vezes: Record<string, number> = {}
    for (const lista of listas) for (const jogador of new Set(lista)) vezes[jogador] = (vezes[jogador] ?? 0) + 1
    return Object.fromEntries(Object.entries(vezes).map(([jogador, quantos]) => [jogador, Math.round((quantos / total) * 100)]))
  }
  if (!total) return { gols: {}, cartoes: {} }
  return {
    gols: contar(palpitesDoJogo.map((palpite) => palpite.gols.flatMap((gol) => (gol.jogador ? [gol.jogador] : [])))),
    cartoes: contar(palpitesDoJogo.map((palpite) => palpite.cartoes.map((cartao) => cartao.jogador))),
  }
}
