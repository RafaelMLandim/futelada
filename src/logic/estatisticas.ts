// Estatísticas do dia: artilharia e goleiro menos vazado.

import type { Estado, Gol } from '../types/pelada'
import { LADOS } from './lado'

export type Artilheiro = { id: string; nome: string; gols: number }
export type GoleiroStats = { nome: string; jogos: number; sofridos: number; media: number }

/** Todos os gols do dia, incluindo os da partida em andamento. */
const todosOsGols = (estado: Estado): Gol[] => [...estado.historico.flatMap((p) => p.gols), ...estado.gols]

export function artilharia(estado: Estado): Artilheiro[] {
  const mapa = new Map<string, Artilheiro>()
  for (const g of todosOsGols(estado)) {
    if (!g.autorId || !g.autor) continue
    const a = mapa.get(g.autorId) ?? { id: g.autorId, nome: g.autor, gols: 0 }
    a.gols++
    mapa.set(g.autorId, a)
  }
  return [...mapa.values()].sort((x, y) => y.gols - x.gols || x.nome.localeCompare(y.nome))
}

/** Goleiros fixos ordenados por menos gols sofridos por jogo (partidas terminadas). */
export function goleirosMenosVazados(estado: Estado): GoleiroStats[] {
  const mapa = new Map<string, GoleiroStats>()
  const stats = (nome: string) => mapa.get(nome) ?? mapa.set(nome, { nome, jogos: 0, sofridos: 0, media: 0 }).get(nome)!
  for (const p of estado.historico) {
    for (const lado of LADOS) {
      const nome = p.goleiros[lado]
      if (nome) stats(nome).jogos++
    }
    for (const g of p.gols) if (g.goleiroSofreu) stats(g.goleiroSofreu).sofridos++
  }
  return [...mapa.values()]
    .map((g) => ({ ...g, media: g.jogos ? g.sofridos / g.jogos : 0 }))
    .sort((x, y) => x.media - y.media || y.jogos - x.jogos || x.nome.localeCompare(y.nome))
}
