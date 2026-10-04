// Chegadas e saídas de jogadores.

import type { Estado, Jogador } from '../types/pelada'
import { numerarFila } from './fila'
import { LADOS } from './lado'

let seq = 0
export const novoJogador = (nome: string): Jogador => ({
  id: `${Date.now().toString(36)}-${(seq++).toString(36)}`,
  nome: nome.trim(),
})

/** Quem chega (inclusive atrasado) entra no fim da fila. */
export function adicionarJogador(estado: Estado, jogador: Jogador): Estado {
  return numerarFila({ ...estado, fila: [...estado.fila, jogador] })
}

/** Todos os jogadores da sessão: em campo e na fila. */
export function todosOsJogadores(estado: Estado): Jogador[] {
  const campo = estado.emCampo ? [...estado.emCampo.A.jogadores, ...estado.emCampo.B.jogadores] : []
  return [...campo, ...estado.fila]
}

/**
 * Alguém foi embora. Na fila: sai e a fila sobe.
 * Em campo: o primeiro da fila entra no lugar dele (e a fila sobe).
 */
export function removerJogador(estado: Estado, id: string): Estado {
  if (estado.fila.some((j) => j.id === id)) {
    return numerarFila({ ...estado, fila: estado.fila.filter((j) => j.id !== id) })
  }
  const { emCampo } = estado
  if (!emCampo) return estado
  for (const lado of LADOS) {
    const time = emCampo[lado]
    const i = time.jogadores.findIndex((j) => j.id === id)
    if (i === -1) continue
    const [substituto, ...resto] = estado.fila
    const jogadores = substituto
      ? time.jogadores.map((j, k) => (k === i ? substituto : j))
      : time.jogadores.filter((_, k) => k !== i)
    return numerarFila({
      ...estado,
      fila: substituto ? resto : estado.fila,
      emCampo: { ...emCampo, [lado]: { ...time, jogadores } },
    })
  }
  return estado
}
