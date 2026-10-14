// Estatísticas do dia: artilharia, goleiro menos vazado e vitórias por jogador (seleção da pelada).

import type { Colete, Estado, Gol } from '../types/pelada'
import { LADOS } from './lado'

export type Artilheiro = {
  id: string; nome: string; gols: number
  jogos: number; vitorias: number; cartoes: number // para o desempate
  ultimoGol: number // posição do último gol dele entre os gols do dia (quem chegou primeiro ao total)
}
export type GoleiroStats = { nome: string; jogos: number; sofridos: number; media: number }

/** Todos os gols do dia, incluindo os da partida em andamento. */
const todosOsGols = (estado: Estado): Gol[] => [...estado.historico.flatMap((p) => p.gols), ...estado.gols]

/** Critério que separou o artilheiro do 2º colocado (null = mais gols, sem empate). */
export type CriterioDaArtilharia = 'menos jogos' | 'mais vitórias' | 'menos cartões' | 'chegou primeiro' | null

/**
 * Artilharia do dia (gol contra não conta). Desempate, para sair um só artilheiro:
 * mais gols → menos jogos → mais vitórias → menos cartões → quem chegou primeiro ao número de gols.
 */
export function artilharia(estado: Estado): Artilheiro[] {
  const mapa = new Map<string, Artilheiro>()
  todosOsGols(estado).forEach((g, ordem) => {
    if (!g.autorId || !g.autor || g.contra) return // gol contra não conta na artilharia
    const a = mapa.get(g.autorId) ?? { id: g.autorId, nome: g.autor, gols: 0, jogos: 0, vitorias: 0, cartoes: 0, ultimoGol: 0 }
    a.gols++
    a.ultimoGol = ordem // os gols estão em ordem: o último gol marca quando chegou ao total
    mapa.set(g.autorId, a)
  })
  for (const p of estado.historico) {
    for (const lado of LADOS) {
      for (const j of (lado === 'A' ? p.timeA : p.timeB).jogadores) {
        const a = mapa.get(j.id)
        if (!a) continue
        a.jogos++
        if (p.resultado === lado) a.vitorias++
      }
    }
  }
  // Quem jogou só no gol não está nos times: conta como jogo cada partida em que fez gol
  for (const p of [...estado.historico.map((x) => x.gols), estado.gols]) {
    for (const id of new Set(p.map((g) => g.autorId))) {
      const a = id?.startsWith('goleiro:') ? mapa.get(id) : undefined
      if (a) a.jogos++
    }
  }
  for (const c of [...estado.historico.flatMap((p) => p.cartoes), ...estado.cartoes]) {
    const a = mapa.get(c.jogadorId)
    if (a && !c.porDoisAmarelos) a.cartoes++
  }
  return [...mapa.values()].sort((x, y) =>
    y.gols - x.gols || x.jogos - y.jogos || y.vitorias - x.vitorias || x.cartoes - y.cartoes || x.ultimoGol - y.ultimoGol)
}

/** Qual critério deixou o 1º da artilharia na frente do 2º (para mostrar o desempate). */
export function criterioDoArtilheiro(lista: Artilheiro[]): CriterioDaArtilharia {
  const [a, b] = lista
  if (!a || !b || a.gols !== b.gols) return null
  if (a.jogos !== b.jogos) return 'menos jogos'
  if (a.vitorias !== b.vitorias) return 'mais vitórias'
  if (a.cartoes !== b.cartoes) return 'menos cartões'
  return 'chegou primeiro'
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

export type PlacarDosColetes = { coletes: (Colete & { vitorias: number })[]; empates: number }

/**
 * Vitórias de cada colete na pelada (ex.: Vermelho 3 x 2 Azul) e empates.
 * Partidas antigas, sem o colete guardado, contam com os coletes atuais.
 */
export function placarDosColetes(estado: Estado): PlacarDosColetes {
  const mapa = new Map<string, Colete & { vitorias: number }>()
  const linha = (c: Colete) => mapa.get(c.cor) ?? mapa.set(c.cor, { ...c, vitorias: 0 }).get(c.cor)!
  // os coletes atuais aparecem mesmo sem vitórias
  for (const lado of LADOS) linha(estado.config.coletes[lado])
  let empates = 0
  for (const p of estado.historico) {
    const coletes = p.coletes ?? estado.config.coletes
    if (p.resultado === 'empate') empates++
    else linha(coletes[p.resultado]).vitorias++
  }
  return { coletes: [...mapa.values()], empates }
}

export type VitoriasDoJogador = { id: string; nome: string; vitorias: number; jogos: number; gols: number }

/**
 * Vitórias de cada jogador no dia, independente do time em que estava (partidas terminadas).
 * Ordem: mais vitórias, mais gols, menos jogos, nome.
 */
export function vitoriasPorJogador(estado: Estado): VitoriasDoJogador[] {
  const mapa = new Map<string, VitoriasDoJogador>()
  const linha = (id: string, nome: string) => mapa.get(id) ?? mapa.set(id, { id, nome, vitorias: 0, jogos: 0, gols: 0 }).get(id)!
  for (const p of estado.historico) {
    for (const lado of LADOS) {
      for (const j of (lado === 'A' ? p.timeA : p.timeB).jogadores) {
        const l = linha(j.id, j.nome)
        l.jogos++
        if (p.resultado === lado) l.vitorias++
      }
    }
  }
  for (const a of artilharia(estado)) {
    const l = mapa.get(a.id)
    if (l) l.gols = a.gols
  }
  return [...mapa.values()].sort((x, y) => y.vitorias - x.vitorias || y.gols - x.gols || x.jogos - y.jogos || x.nome.localeCompare(y.nome))
}

/** Seleção da pelada: os jogadores com mais vitórias, um time inteiro (tamanho da linha). */
export function selecaoDaPelada(estado: Estado): VitoriasDoJogador[] {
  return vitoriasPorJogador(estado).filter((j) => j.vitorias > 0).slice(0, estado.config.linha)
}

export type FichaDoJogador = {
  id: string; nome: string; jogos: number; vitorias: number; empates: number; derrotas: number
  gols: number; golsContra: number; amarelos: number; vermelhos: number; azuis: number
  posicao: number // na contagem de vitórias (1 = mais vitórias)
  naSelecao: boolean
}

/** Números do dia de um jogador (partidas terminadas; gols e cartões incluem a partida em andamento). */
export function fichaDoJogador(estado: Estado, id: string): FichaDoJogador | null {
  const ranking = vitoriasPorJogador(estado)
  const i = ranking.findIndex((v) => v.id === id)
  if (i === -1) return null
  const v = ranking[i]
  let empates = 0
  for (const p of estado.historico) {
    const jogou = [...p.timeA.jogadores, ...p.timeB.jogadores].some((j) => j.id === id)
    if (jogou && p.resultado === 'empate') empates++
  }
  const gols = todosOsGols(estado).filter((g) => g.autorId === id)
  const cartoes = [...estado.historico.flatMap((p) => p.cartoes), ...estado.cartoes].filter((c) => c.jogadorId === id && !c.porDoisAmarelos)
  return {
    id, nome: v.nome, jogos: v.jogos, vitorias: v.vitorias, empates, derrotas: v.jogos - v.vitorias - empates,
    gols: gols.filter((g) => !g.contra).length, golsContra: gols.filter((g) => g.contra).length,
    amarelos: cartoes.filter((c) => c.cor === 'amarelo').length, vermelhos: cartoes.filter((c) => c.cor === 'vermelho').length,
    azuis: cartoes.filter((c) => c.cor === 'azul').length,
    posicao: i + 1, naSelecao: selecaoDaPelada(estado).some((s) => s.id === id),
  }
}
