// Suspensões: vermelho suspende o próximo jogo do time; 3 amarelos acumulados também
// (e a contagem zera). O vermelho zera os amarelos acumulados.

import type { Torneio } from '../../types/torneio'
import { timesDoJogo } from './jogos'

export type SituacaoDisciplinar = {
  suspensos: Set<string> // jogadores suspensos no próximo jogo do time deles
  amarelos: Map<string, number> // amarelos acumulados (0 a 2)
}

export function situacaoDisciplinar(torneio: Torneio): SituacaoDisciplinar {
  const timeDoJogador = new Map<string, string>()
  for (const t of torneio.times) for (const j of t.jogadores) timeDoJogador.set(j.id, t.id)

  const suspensos = new Set<string>()
  const amarelos = new Map<string, number>()
  const jogados = torneio.jogos.filter((j) => j.resultado).sort((a, b) => a.resultado!.sequencia - b.resultado!.sequencia)

  for (const jogo of jogados) {
    // Quem estava suspenso e o time jogou: cumpriu a suspensão
    const times = Object.values(timesDoJogo(torneio, jogo))
    for (const id of [...suspensos]) if (times.includes(timeDoJogador.get(id) ?? null)) suspensos.delete(id)

    for (const c of jogo.resultado!.cartoes) {
      if (c.cor === 'vermelho') {
        suspensos.add(c.jogadorId)
        amarelos.set(c.jogadorId, 0)
      } else if (c.cor === 'amarelo') {
        const total = (amarelos.get(c.jogadorId) ?? 0) + 1
        if (total >= 3) {
          suspensos.add(c.jogadorId)
          amarelos.set(c.jogadorId, 0)
        } else {
          amarelos.set(c.jogadorId, total)
        }
      }
    }
  }
  return { suspensos, amarelos }
}
