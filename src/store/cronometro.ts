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
    : { rodando: false, inicio: 0, acumulado: tempoDecorrido(c, agora) }
}
