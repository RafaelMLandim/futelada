// Cronômetro da partida. Guarda o início e o tempo acumulado, então continua
// certo mesmo se o app for fechado e aberto de novo.

import type { Cronometro } from '../types/app'

export const cronoZerado: Cronometro = { rodando: false, inicio: 0, acumulado: 0 }

export function tempoDecorrido(c: Cronometro, agora = Date.now()): number {
  return c.acumulado + (c.rodando ? agora - c.inicio : 0)
}

export function alternarCrono(c: Cronometro, rodando: boolean, agora = Date.now()): Cronometro {
  if (rodando === c.rodando) return c
  return rodando
    ? { ...c, rodando: true, inicio: agora }
    : { ...c, rodando: false, inicio: 0, acumulado: tempoDecorrido(c, agora) }
}

/**
 * Para o relógio no fim do tempo. Se o celular estava bloqueado ou com o app em segundo plano, o aviso só
 * chega quando a pessoa volta: o tempo passado do fim não conta (não vira acréscimo que ninguém deu, e os
 * acréscimos dados depois começam do zero).
 */
export function pararNoFim(c: Cronometro, limiteMs: number, agora = Date.now()): Cronometro {
  const parado = alternarCrono(c, false, agora)
  return parado.acumulado > limiteMs ? { ...parado, acumulado: Math.max(c.acumulado, limiteMs) } : parado
}

/** Dá os acréscimos e solta o relógio. */
export const darAcrescimos = (c: Cronometro, min: number, agora = Date.now()): Cronometro =>
  alternarCrono({ ...c, acrescimoMin: min }, true, agora)

/** Tempo total da partida em ms: tempo normal + acréscimos dados. */
export const tempoTotalMs = (tempoMin: number, c: Cronometro): number => (tempoMin + (c.acrescimoMin ?? 0)) * 60_000
