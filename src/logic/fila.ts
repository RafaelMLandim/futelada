// A fila de espera: uma fila única de jogadores, cortada em blocos do tamanho da linha.
// Cada bloco é um time com número fixo. Os números vêm da lista: um time novo só
// nasce quando chega gente e não há time incompleto para completar.

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

/** Os blocos da fila com o número de cada time. */
export function timesDaFila(estado: Estado): { numero: number; jogadores: Jogador[] }[] {
  return blocosDaFila(estado).map((jogadores, i) => ({ numero: estado.filaTimes[i], jogadores }))
}

export function timesCompletosNaFila(estado: Estado): number {
  return Math.floor(estado.fila.length / estado.config.linha)
}

/**
 * Acerta os números dos blocos depois que a fila mudou.
 * Bloco que sumiu leva o número junto; bloco que surgiu recebe o número `preferido`
 * (o time que acabou de entrar na fila) ou um número novo.
 */
export function numerarFila(estado: Estado, preferido?: number): Estado {
  const blocos = Math.ceil(estado.fila.length / estado.config.linha)
  const numeros = estado.filaTimes.slice(0, blocos)
  let proximo = estado.proximoNumero
  let pref = preferido
  while (numeros.length < blocos) {
    if (pref !== undefined) {
      numeros.push(pref)
      pref = undefined
    } else {
      numeros.push(proximo++)
    }
  }
  return { ...estado, filaTimes: numeros, proximoNumero: proximo }
}

/** Tira o próximo bloco da fila e transforma num time. */
export function tirarProximoTime(estado: Estado): { time: Time; estado: Estado } {
  const time: Time = {
    numero: estado.filaTimes[0],
    jogadores: estado.fila.slice(0, estado.config.linha),
    vitoriasSeguidas: 0,
  }
  return {
    time,
    estado: { ...estado, fila: estado.fila.slice(estado.config.linha), filaTimes: estado.filaTimes.slice(1) },
  }
}

/**
 * O time vai para o fim da fila. Os primeiros dele completam o time incompleto;
 * quem sobra continua com o número do time.
 */
export function entrarNaFila(estado: Estado, time: Time): Estado {
  return numerarFila({ ...estado, fila: [...estado.fila, ...time.jogadores] }, time.numero)
}
