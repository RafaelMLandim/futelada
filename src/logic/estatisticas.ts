// Estatísticas do dia: artilharia, goleiro menos vazado, assistências (Troféu Garçom) e vitórias por jogador (seleção da pelada).

import type { Colete, Estado, Gol } from '../types/pelada'
import { LADOS } from './lado'
import { jogadorGoleiro } from './goleiros'

export type Artilheiro = {
  id: string; nome: string; gols: number
  jogos: number; vitorias: number; cartoes: number // para o desempate
  ultimoGol: number // posição do último gol dele entre os gols do dia (quem chegou primeiro ao total)
}
export type GoleiroStats = { nome: string; jogos: number; sofridos: number; media: number; vitorias: number }

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
  const stats = (nome: string) => mapa.get(nome) ?? mapa.set(nome, { nome, jogos: 0, sofridos: 0, media: 0, vitorias: 0 }).get(nome)!
  for (const p of estado.historico) {
    for (const lado of LADOS) {
      const nome = p.goleiros[lado]
      if (!nome) continue
      stats(nome).jogos++
      if (p.resultado === lado) stats(nome).vitorias++
    }
    for (const g of p.gols) if (g.goleiroSofreu) stats(g.goleiroSofreu).sofridos++
  }
  return [...mapa.values()]
    .map((g) => ({ ...g, media: g.jogos ? g.sofridos / g.jogos : 0 }))
    .sort((x, y) => x.media - y.media || y.jogos - x.jogos || x.nome.localeCompare(y.nome))
}

export type Garcom = { id: string; nome: string; assistencias: number; jogos: number }

/** Líderes de assistências do dia (Troféu Garçom). Desempate: menos jogos → nome. */
export function garcons(estado: Estado): Garcom[] {
  const mapa = new Map<string, Garcom>()
  for (const g of todosOsGols(estado)) {
    if (!g.assistenciaId || !g.assistencia) continue
    const linha = mapa.get(g.assistenciaId) ?? mapa.set(g.assistenciaId, { id: g.assistenciaId, nome: g.assistencia, assistencias: 0, jogos: 0 }).get(g.assistenciaId)!
    linha.assistencias++
  }
  for (const partida of estado.historico) {
    for (const jogador of [...partida.timeA.jogadores, ...partida.timeB.jogadores]) {
      const linha = mapa.get(jogador.id)
      if (linha) linha.jogos++
    }
  }
  return [...mapa.values()].sort((x, y) => y.assistencias - x.assistencias || x.jogos - y.jogos || x.nome.localeCompare(y.nome))
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

/**
 * Goleiro da seleção: o goleiro fixo que mais venceu (ele também joga nos times; o critério é o mesmo da linha).
 * Desempate: menos gols sofridos por jogo. Sem vitória, não entra.
 */
export function goleiroDaSelecao(estado: Estado): GoleiroStats | null {
  return goleirosMenosVazados(estado).filter((goleiro) => goleiro.vitorias > 0)
    .sort((x, y) => y.vitorias - x.vitorias || x.media - y.media || y.jogos - x.jogos || x.nome.localeCompare(y.nome))[0] ?? null
}

/** Seleção da pelada: os jogadores com mais vitórias, um time inteiro (tamanho da linha). */
export function selecaoDaPelada(estado: Estado): VitoriasDoJogador[] {
  return vitoriasPorJogador(estado).filter((j) => j.vitorias > 0).slice(0, estado.config.linha)
}


/** Uma linha da tabela da pelada (para compartilhar no grupo): o que cada jogador fez no dia. */
export type LinhaDaTabela = {
  id: string; nome: string; goleiro: boolean
  jogos: number; vitorias: number; empates: number; derrotas: number; gols: number; assistencias: number
}

/**
 * Tabela da pelada: todo mundo que jogou (e os goleiros fixos), com J, V, E, D, gols e assistências das partidas
 * terminadas e da que está em andamento (gols e passes). Ordem: mais vitórias, mais gols, mais assistências, nome.
 */
export function tabelaDaPelada(estado: Estado): LinhaDaTabela[] {
  const mapa = new Map<string, LinhaDaTabela>()
  const linha = (id: string, nome: string, goleiro = false) =>
    mapa.get(id) ?? mapa.set(id, { id, nome, goleiro, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols: 0, assistencias: 0 }).get(id)!
  const resultado = (alvo: LinhaDaTabela, partida: Estado['historico'][number], lado: 'A' | 'B') => {
    alvo.jogos++
    if (partida.resultado === 'empate') alvo.empates++
    else if (partida.resultado === lado) alvo.vitorias++
    else alvo.derrotas++
  }
  for (const partida of estado.historico) {
    for (const lado of LADOS) {
      for (const jogador of (lado === 'A' ? partida.timeA : partida.timeB).jogadores) resultado(linha(jogador.id, jogador.nome), partida, lado)
      const goleiro = partida.goleiros[lado]
      if (goleiro) resultado(linha(jogadorGoleiro(goleiro).id, goleiro, true), partida, lado)
    }
  }
  for (const gol of todosOsGols(estado)) {
    if (gol.autorId && gol.autor && !gol.contra) linha(gol.autorId, gol.autor, gol.autorId.startsWith('goleiro:')).gols++
    if (gol.assistenciaId && gol.assistencia) linha(gol.assistenciaId, gol.assistencia, gol.assistenciaId.startsWith('goleiro:')).assistencias++
  }
  return [...mapa.values()].sort((x, y) => y.vitorias - x.vitorias || y.gols - x.gols || y.assistencias - x.assistencias || x.nome.localeCompare(y.nome))
}
