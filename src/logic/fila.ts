// A fila de espera: uma fila única de jogadores, cortada em blocos do tamanho da linha.

import type { Estado, Jogador, Time } from '../types/pelada'

/** A fila cortada em blocos do tamanho da linha. Só o último pode ficar incompleto. */
export function blocosDaFila(estado: Estado): Jogador[][] {
  const { fila, config } = estado
  const blocos: Jogador[][] = []
  for (let i = 0; i < fila.length; i += config.linha) {
    blocos.push(fila.slice(i, i + config.linha))
  }
  return blocos
}

export function timesCompletosNaFila(estado: Estado): number {
  return Math.floor(estado.fila.length / estado.config.linha)
}

/** Tira o próximo bloco da fila e transforma num time. */
export function tirarProximoTime(estado: Estado): { time: Time; estado: Estado } {
  const time: Time = {
    numero: estado.proximoNumero,
    jogadores: estado.fila.slice(0, estado.config.linha),
    vitoriasSeguidas: 0,
  }
  return {
    time,
    estado: {
      ...estado,
      fila: estado.fila.slice(estado.config.linha),
      proximoNumero: estado.proximoNumero + 1,
    },
  }
}
