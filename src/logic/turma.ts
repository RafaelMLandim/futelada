// A turma: os jogadores de sempre de uma pelada, reconhecidos de uma semana para a outra pelo mesmo
// `id` (PLANO.md, seção 15). Só o apelido; fica no perfil do organizador.

import type { Estado, Jogador } from '../types/pelada'
import { normalizarNome } from '../utils/formatar'
import type { PeladaGuardada } from './historico'

export type JogadorDaTurma = {
  id: string
  nome: string
  peladas: number // presença (peladas em que jogou)
  ultimaPelada: number // data da última (ms)
  arquivado?: boolean // parou de vir: não aparece nas sugestões (o histórico fica)
}

/** Diferença de no máximo uma letra (trocada, a mais ou a menos)? */
function umaLetra(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const resto = (x: string, n: number) => x.slice(i + n)
  return resto(a, 1) === resto(b, 1) || resto(a, 1) === resto(b, 0) || resto(a, 0) === resto(b, 1)
}

const naLista = (lista: readonly Jogador[]) => {
  const ids = new Set(lista.map((j) => j.id))
  const nomes = new Set(lista.map((j) => normalizarNome(j.nome)))
  return (j: JogadorDaTurma) => ids.has(j.id) || nomes.has(normalizarNome(j.nome))
}
const maisFrequentes = (a: JogadorDaTurma, b: JogadorDaTurma) =>
  b.peladas - a.peladas || b.ultimaPelada - a.ultimaPelada || a.nome.localeCompare(b.nome)

/**
 * Sugestões enquanto digita o nome na Lista ("JU" → JUNINHO, JULIO…): começa igual (o nome ou uma
 * das palavras) ou, com 4 letras ou mais, uma letra de diferença. Quem já está na lista não aparece.
 */
export function sugestoes(turma: readonly JogadorDaTurma[], texto: string, lista: readonly Jogador[], maximo = 5): JogadorDaTurma[] {
  const t = normalizarNome(texto)
  if (!t) return []
  const jaEsta = naLista(lista)
  const nota = (j: JogadorDaTurma) => {
    const n = normalizarNome(j.nome)
    if (n.startsWith(t)) return 3
    if (n.split(' ').some((p) => p.startsWith(t))) return 2
    if (t.length >= 4 && umaLetra(n.slice(0, t.length), t)) return 1
    return 0
  }
  return turma
    .filter((j) => !j.arquivado && !jaEsta(j))
    .map((j) => ({ j, n: nota(j) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || maisFrequentes(a.j, b.j))
    .slice(0, maximo)
    .map((x) => x.j)
}

/** "Quem costuma vir": a turma (menos quem já está na lista), os mais frequentes primeiro. */
export function quemCostumaVir(turma: readonly JogadorDaTurma[], lista: readonly Jogador[]): JogadorDaTurma[] {
  const jaEsta = naLista(lista)
  return turma.filter((j) => !j.arquivado && !jaEsta(j)).sort(maisFrequentes)
}

/** Alguém da turma com nome parecido, mas não igual ("JOAO" x "JOÃO S.")? Para perguntar "é ele?". */
export function parecidoNaTurma(turma: readonly JogadorDaTurma[], nome: string): JogadorDaTurma | null {
  const n = normalizarNome(nome)
  if (n.length < 3) return null
  return turma.filter((j) => !j.arquivado).find((j) => {
    const m = normalizarNome(j.nome)
    if (m === n) return false
    return umaLetra(m, n) || (Math.min(m.length, n.length) >= 4 && (m.startsWith(n + ' ') || n.startsWith(m + ' ')))
  }) ?? null
}

/** Quem jogou a pelada (pelo menos uma partida), sem repetir. */
export function jogaramNaPelada(estado: Estado): Jogador[] {
  const vistos = new Map<string, Jogador>()
  for (const p of estado.historico) for (const j of [...p.timeA.jogadores, ...p.timeB.jogadores]) vistos.set(j.id, j)
  return [...vistos.values()]
}

/**
 * Turma montada a partir das peladas já guardadas (antes de existir a turma): junta os nomes iguais
 * (sem acento/maiúsculas), conta a presença e guarda o nome como foi escrito na pelada mais recente.
 * `novoId` cria o id de cada jogador.
 */
export function turmaDoHistorico(peladas: readonly Pick<PeladaGuardada, 'data' | 'estado'>[], novoId: () => string): JogadorDaTurma[] {
  const porNome = new Map<string, JogadorDaTurma>()
  for (const p of [...peladas].sort((a, b) => a.data - b.data)) {
    for (const j of jogaramNaPelada(p.estado)) {
      const chave = normalizarNome(j.nome)
      const atual = porNome.get(chave) ?? { id: novoId(), nome: j.nome, peladas: 0, ultimaPelada: 0 }
      porNome.set(chave, { ...atual, nome: j.nome, peladas: atual.peladas + 1, ultimaPelada: p.data })
    }
  }
  return [...porNome.values()].sort(maisFrequentes)
}

/** O jogador da turma que é este jogador da pelada (pelo id; nas peladas antigas, pelo nome). */
export function naTurma(turma: readonly JogadorDaTurma[], jogador: Jogador): JogadorDaTurma | null {
  return turma.find((t) => t.id === jogador.id) ?? turma.find((t) => normalizarNome(t.nome) === normalizarNome(jogador.nome)) ?? null
}
