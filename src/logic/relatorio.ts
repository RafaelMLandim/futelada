// Relatório da temporada de uma turma (PLANO.md, seção 15.2): artilheiro do ano, time do ano (quem
// mais veio às peladas; no empate, mais gols), goleiro do ano, mais vitórias, mais presente.
// A temporada é o ano. Para o Time do ano e o Goleiro do ano, presença mínima de 65% das peladas.

import type { Jogador } from '../types/pelada'
import { normalizarNome } from '../utils/formatar'
import { artilharia, garcons, goleirosMenosVazados, selecaoDaPelada, vitoriasPorJogador } from './estatisticas'
import type { PeladaGuardada } from './historico'
import { jogaramNaPelada, naTurma, type JogadorDaTurma } from './turma'

export type JogadorNoAno = {
  id: string; nome: string
  peladas: number; jogos: number; vitorias: number; gols: number
  assistencias: number // passes para gol (Troféu Garçom)
  vezesNaSelecao: number; artilheiroDoDia: number
}
export type GoleiroNoAno = { nome: string; peladas: number; jogos: number; sofridos: number; media: number }
export type RelatorioDoAno = {
  ano: number
  peladas: number
  minimo: number // presença mínima (peladas) para o Time do ano e o Goleiro do ano
  linha: number // tamanho do Time do ano (jogadores na linha da última pelada)
  jogadores: JogadorNoAno[] // por vitórias
  timeDoAno: JogadorNoAno[]
  goleiroDoAno: GoleiroNoAno | null
  artilheiro: JogadorNoAno | null
  garcom: JogadorNoAno | null // mais assistências no ano
  maisPresente: JogadorNoAno | null
  goleiros: GoleiroNoAno[]
}

/** Para o Time do ano e o Goleiro do ano: ter vindo a pelo menos 65% das peladas do ano (gente assídua). */
export const PRESENCA_MINIMA = 0.65

const anoDa = (data: number) => new Date(data).getFullYear()

/** Anos que têm peladas (o mais recente primeiro). */
export const anosDasPeladas = (peladas: readonly Pick<PeladaGuardada, 'data'>[]) =>
  [...new Set(peladas.map((p) => anoDa(p.data)))].sort((a, b) => b - a)

/**
 * Peladas de uma turma. As peladas sem turma (antes de existirem turmas) ficam com a primeira turma.
 */
export function peladasDaTurma<T extends Pick<PeladaGuardada, 'turma'>>(peladas: readonly T[], turma: string, primeiraTurma: string | null): T[] {
  return peladas.filter((p) => p.turma === turma || (!p.turma && turma === primeiraTurma))
}

export function relatorioDoAno(peladas: readonly PeladaGuardada[], turma: readonly JogadorDaTurma[], ano: number): RelatorioDoAno {
  const doAno = peladas.filter((p) => anoDa(p.data) === ano).sort((a, b) => a.data - b.data)
  const minimo = Math.max(1, Math.ceil(doAno.length * PRESENCA_MINIMA))
  const jogadores = new Map<string, JogadorNoAno>()
  const goleiros = new Map<string, GoleiroNoAno>()
  /** Chave do jogador: o id da turma ou, se não está nela, o nome (sem acento/maiúsculas). */
  const chave = (j: Jogador) => naTurma(turma, j)?.id ?? `nome:${normalizarNome(j.nome)}`
  const linhaDe = (j: Jogador) => {
    const k = chave(j)
    const nome = naTurma(turma, j)?.nome ?? j.nome
    return jogadores.get(k) ?? jogadores.set(k, { id: k, nome, peladas: 0, jogos: 0, vitorias: 0, gols: 0, assistencias: 0, vezesNaSelecao: 0, artilheiroDoDia: 0 }).get(k)!
  }

  for (const { estado } of doAno) {
    for (const j of jogaramNaPelada(estado)) linhaDe(j).peladas++
    for (const v of vitoriasPorJogador(estado)) {
      const l = linhaDe(v)
      l.jogos += v.jogos
      l.vitorias += v.vitorias
      l.gols += v.gols
    }
    for (const s of selecaoDaPelada(estado)) linhaDe(s).vezesNaSelecao++
    for (const garcom of garcons(estado)) linhaDe(garcom).assistencias += garcom.assistencias
    const artilheiro = artilharia(estado)[0]
    if (artilheiro) linhaDe(artilheiro).artilheiroDoDia++
    for (const g of goleirosMenosVazados(estado)) {
      const k = normalizarNome(g.nome)
      const l = goleiros.get(k) ?? goleiros.set(k, { nome: g.nome, peladas: 0, jogos: 0, sofridos: 0, media: 0 }).get(k)!
      l.peladas++
      l.jogos += g.jogos
      l.sofridos += g.sofridos
    }
  }

  const todos = [...jogadores.values()]
  const ordemNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome)
  const porVitorias = [...todos].sort((a, b) => b.vitorias - a.vitorias || b.gols - a.gols || a.jogos - b.jogos || ordemNome(a, b))
  const linha = doAno.at(-1)?.estado.config.linha ?? 4
  const timeDoAno = todos
    .filter((j) => j.peladas >= minimo)
    .sort((a, b) => b.peladas - a.peladas || b.gols - a.gols || b.vitorias - a.vitorias || b.vezesNaSelecao - a.vezesNaSelecao || ordemNome(a, b))
    .slice(0, linha)
  const artilheiro = [...todos].filter((j) => j.gols > 0)
    .sort((a, b) => b.gols - a.gols || a.peladas - b.peladas || b.artilheiroDoDia - a.artilheiroDoDia || ordemNome(a, b))[0] ?? null
  const garcom = [...todos].filter((j) => j.assistencias > 0)
    .sort((a, b) => b.assistencias - a.assistencias || a.peladas - b.peladas || ordemNome(a, b))[0] ?? null
  const maisPresente = [...todos].sort((a, b) => b.peladas - a.peladas || b.vitorias - a.vitorias || ordemNome(a, b))[0] ?? null
  const listaGoleiros = [...goleiros.values()]
    .map((g) => ({ ...g, media: g.jogos ? g.sofridos / g.jogos : 0 }))
    .sort((a, b) => a.media - b.media || b.jogos - a.jogos || ordemNome(a, b))
  const goleiroDoAno = listaGoleiros.find((g) => g.peladas >= minimo && g.jogos > 0) ?? null

  return { ano, peladas: doAno.length, minimo, linha, jogadores: porVitorias, timeDoAno, goleiroDoAno, artilheiro, garcom, maisPresente, goleiros: listaGoleiros }
}
