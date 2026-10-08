// Tempos do jogo do torneio: tempos regulamentares (1º, 2º…), intervalo e prorrogação
// (PLANO.md, seção 9.5). O relógio da partida corre o jogo todo; cada tempo começa
// em `inicioDoPeriodo` (o intervalo não conta, o relógio fica parado).

import { alternarCrono, tempoDecorrido } from '../cronometro'
import type { JogoTorneio, PartidaTorneio, RegrasTorneio, Torneio } from '../../types/torneio'
import { jogoPorId, precisaDePenaltis } from './jogos'

function comPartida(t: Torneio, jogoId: string, mudar: (p: PartidaTorneio) => PartidaTorneio): Torneio {
  if (!t.emAndamento.some((p) => p.jogoId === jogoId)) throw new Error('Esse jogo não está em andamento')
  return { ...t, emAndamento: t.emAndamento.map((p) => (p.jogoId === jogoId ? mudar(p) : p)) }
}

export const periodoDaPartida = (p: PartidaTorneio) => p.periodo ?? 1

/** Quantos tempos tem a fase atual (regulamentar ou prorrogação). */
export const temposDaFase = (r: RegrasTorneio, p: PartidaTorneio) => Math.max(1, p.prorrogacao ? r.temposProrrogacao : r.tempos)

/** Duração (min) do tempo atual. */
export const duracaoDoPeriodo = (r: RegrasTorneio, p: PartidaTorneio) => (p.prorrogacao ? r.minutosProrrogacao : r.tempoMin)

/** Tempo corrido dentro do tempo atual. */
export const decorridoNoPeriodo = (p: PartidaTorneio, agora = Date.now()) =>
  Math.max(0, tempoDecorrido(p.crono, agora) - (p.inicioDoPeriodo ?? 0))

/** É o último tempo da fase? (acabou ele: fim do jogo, ou prorrogação/pênaltis) */
export const ultimoPeriodo = (r: RegrasTorneio, p: PartidaTorneio) => periodoDaPartida(p) >= temposDaFase(r, p)

/** "1º tempo", "2º tempo da prorrogação", "Prorrogação"… (vazio: jogo de um tempo só, sem prorrogação) */
export function nomeDoPeriodo(r: RegrasTorneio, p: PartidaTorneio, n = periodoDaPartida(p)): string {
  if (p.prorrogacao) return temposDaFase(r, p) > 1 ? `${n}º tempo da prorrogação` : 'Prorrogação'
  return temposDaFase(r, p) > 1 ? `${n}º tempo` : ''
}

/** Rótulo curto para o minuto do gol: "2ºT", "Pror. 1ºT", "Pror." (vazio: um tempo só) */
export function rotuloDoPeriodo(r: RegrasTorneio, p: PartidaTorneio): string {
  const n = periodoDaPartida(p)
  if (p.prorrogacao) return temposDaFase(r, p) > 1 ? `Pror. ${n}ºT` : 'Pror.'
  return temposDaFase(r, p) > 1 ? `${n}ºT` : ''
}

/**
 * Acabado o tempo regulamentar, o jogo vai para a prorrogação? Só no mata-mata decisivo
 * (jogo único ou volta), empatado (no agregado, na volta) e com a prorrogação ligada.
 * A ida nunca tem prorrogação nem pênaltis; não existe gol fora de casa.
 */
export function vaiParaProrrogacao(t: Torneio, jogo: JogoTorneio, p: PartidaTorneio): boolean {
  return t.regras.prorrogacao && !p.prorrogacao && precisaDePenaltis(t, jogo, p.placar)
}

/** Pausa o relógio e zera os acréscimos para o próximo tempo começar do zero. */
const relogioParaNovoTempo = (p: PartidaTorneio, agora: number) =>
  ({ ...alternarCrono(p.crono, false, agora), acrescimoMin: undefined })

/** Fim de um tempo (que não é o último): começa o intervalo (se tem) com o relógio parado. */
export function comecarIntervalo(t: Torneio, jogoId: string, agora = Date.now()): Torneio {
  return comPartida(t, jogoId, (p) => ({
    ...p, crono: relogioParaNovoTempo(p, agora), intervaloAte: agora + t.regras.intervaloMin * 60_000,
  }))
}

/** Começa o próximo tempo (2º, 3º…) da fase atual. O relógio fica parado até o play. */
export function proximoTempo(t: Torneio, jogoId: string, agora = Date.now()): Torneio {
  return comPartida(t, jogoId, (p) => {
    if (ultimoPeriodo(t.regras, p)) throw new Error('Já é o último tempo')
    const crono = relogioParaNovoTempo(p, agora)
    return { ...p, crono, periodo: periodoDaPartida(p) + 1, inicioDoPeriodo: tempoDecorrido(crono, agora), intervaloAte: null }
  })
}

/** Empatou no fim do tempo regulamentar (mata-mata decisivo): começa a prorrogação. */
export function comecarProrrogacao(t: Torneio, jogoId: string, agora = Date.now()): Torneio {
  const jogo = jogoPorId(t, jogoId)
  return comPartida(t, jogoId, (p) => {
    if (!jogo || !vaiParaProrrogacao(t, jogo, p)) throw new Error('Esse jogo não vai para a prorrogação')
    const crono = relogioParaNovoTempo(p, agora)
    return { ...p, crono, prorrogacao: true, periodo: 1, inicioDoPeriodo: tempoDecorrido(crono, agora), intervaloAte: null }
  })
}
