// Movimentação do campo: quem entra, quem sai e o registro das partidas.
// Usado pelas regras de vitória e de empate.

import type { Estado, Lado, Partida, Time } from '../types/pelada'
import { entrarNaFila, tirarProximoTime } from './fila'

/** Guarda a partida que acabou no histórico. */
export function registrarPartida(estado: Estado, resultado: Partida['resultado'], sairam: number[]): Estado {
  const { emCampo } = estado
  if (!emCampo) return estado
  const partida: Partida = {
    numero: estado.historico.length + 1,
    timeA: emCampo.A,
    timeB: emCampo.B,
    placar: estado.placar,
    resultado,
    sairam,
    gols: estado.gols,
    cartoes: estado.cartoes,
    goleiros: estado.goleiros,
    coletes: estado.config.coletes,
  }
  return { ...estado, historico: [...estado.historico, partida] }
}

/** Mantém `fica` em campo e coloca os próximos da fila nos lados indicados (na ordem dada). */
export function substituirTimes(estado: Estado, lados: Lado[], fica?: { lado: Lado; time: Time }): Estado {
  let atual = estado
  const campo = { ...estado.emCampo! }
  if (fica) campo[fica.lado] = fica.time
  for (const lado of lados) {
    if (atual.fila.length === 0) continue
    const r = tirarProximoTime(atual)
    atual = r.estado
    campo[lado] = r.time
  }
  return { ...atual, emCampo: campo, placar: [0, 0], gols: [], cartoes: [] }
}

/** Manda os times para o fim da fila, na ordem dada (cada um mantém o número). */
export function mandarParaFila(estado: Estado, ...times: Time[]): Estado {
  return times.reduce(entrarNaFila, estado)
}
