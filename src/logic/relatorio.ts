// Relatório da temporada de uma turma (PLANO.md, seção 15.2): artilheiro do ano, time do ano (quem
// mais veio às peladas; no empate, mais gols), goleiro do ano, mais vitórias, mais presente.
// A temporada é o ano. Para o Time do ano e o Goleiro do ano, presença mínima de 65% das peladas.
// Só entra quem joga com conta no app (PLANO.md: incentivo para baixar o app).

import { artilharia, garcons, goleirosMenosVazados, selecaoDaPelada, vitoriasPorJogador } from './estatisticas'
import type { PeladaGuardada } from './historico'
import { jogaramNaPelada, naTurma, type JogadorDaTurma } from './turma'

export type JogadorNoAno = {
  id: string; nome: string
  conta?: string // quem entrou pelo link com a conta (de onde vem a foto)
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
  // No histórico do ano só entra quem joga com conta no app (o "RG" de cada um, o mesmo de pelada para pelada, como na
  // carta). Quem só foi digitado pelo nome fica no resultado de cada pelada, mas não no ranking da temporada.
  for (const { estado } of doAno) {
    const contas = new Map<string, string>()
    for (const jogador of jogaramNaPelada(estado)) {
      const conta = jogador.conta ?? naTurma(turma, jogador)?.conta
      if (conta) contas.set(jogador.id, conta)
    }
    const linhaDe = (jogador: { id: string; nome: string }) => {
      const conta = contas.get(jogador.id)
      if (!conta) return null
      const linha = jogadores.get(conta) ?? jogadores.set(conta, { id: conta, conta, nome: jogador.nome, peladas: 0, jogos: 0, vitorias: 0, gols: 0, assistencias: 0, vezesNaSelecao: 0, artilheiroDoDia: 0 }).get(conta)!
      linha.nome = jogador.nome // o nome da pelada mais recente
      return linha
    }
    for (const jogador of jogaramNaPelada(estado)) { const linha = linhaDe(jogador); if (linha) linha.peladas++ }
    for (const resultado of vitoriasPorJogador(estado)) {
      const linha = linhaDe(resultado)
      if (!linha) continue
      linha.jogos += resultado.jogos
      linha.vitorias += resultado.vitorias
      linha.gols += resultado.gols
    }
    for (const selecionado of selecaoDaPelada(estado)) { const linha = linhaDe(selecionado); if (linha) linha.vezesNaSelecao++ }
    for (const garcom of garcons(estado)) { const linha = linhaDe(garcom); if (linha) linha.assistencias += garcom.assistencias }
    const artilheiro = artilharia(estado)[0]
    const linhaDoArtilheiro = artilheiro && linhaDe(artilheiro)
    if (linhaDoArtilheiro) linhaDoArtilheiro.artilheiroDoDia++
    for (const goleiro of goleirosMenosVazados(estado)) {
      const conta = estado.contasDosGoleiros?.[goleiro.nome]
      if (!conta) continue
      const linha = goleiros.get(conta) ?? goleiros.set(conta, { nome: goleiro.nome, peladas: 0, jogos: 0, sofridos: 0, media: 0 }).get(conta)!
      linha.nome = goleiro.nome
      linha.peladas++
      linha.jogos += goleiro.jogos
      linha.sofridos += goleiro.sofridos
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
