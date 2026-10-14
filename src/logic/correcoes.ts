// Correções feitas no meio da pelada: coletes trocados e quem fez um gol marcado sem autor (PLANO.md, seção 3.8.5).

import type { Estado, Gol, Jogador } from '../types/pelada'

/** Os dois lados trocam de colete (o app estava com as cores ao contrário do campo). */
export function inverterColetes(estado: Estado): Estado {
  const { A, B } = estado.config.coletes
  return { ...estado, config: { ...estado.config, coletes: { A: B, B: A } } }
}

/**
 * Marca (ou troca) quem fez um gol, depois. `partida` = número da partida no histórico; null = a partida em andamento.
 * Gol contra: `autor` é do outro time. O placar e o resultado não mudam.
 */
export function definirAutorDoGol(estado: Estado, partida: number | null, indice: number, autor: Jogador | null, contra = false): Estado {
  const trocar = (gols: Gol[]): Gol[] | null => {
    const g = gols[indice]
    if (!g) return null
    const { contra: _antes, ...resto } = g
    const novo: Gol = { ...resto, autorId: autor?.id ?? null, autor: autor?.nome ?? null, ...(contra && autor && { contra: true }) }
    return gols.map((x, k) => (k === indice ? novo : x))
  }
  if (partida === null) {
    const gols = trocar(estado.gols)
    return gols ? { ...estado, gols } : estado
  }
  const p = estado.historico.find((x) => x.numero === partida)
  const gols = p && trocar(p.gols)
  if (!p || !gols) return estado
  return { ...estado, historico: estado.historico.map((x) => (x === p ? { ...p, gols } : x)) }
}
