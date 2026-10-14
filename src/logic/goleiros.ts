// Goleiros fixos. Um goleiro em cada gol. Quando um time perde, o goleiro fica
// em campo e defende o time que entra. Com um só goleiro, ele fica com o time que continua.

import type { Estado, Jogador, Lado } from '../types/pelada'
import { normalizarNome } from '../utils/formatar'
import { LADOS, outro } from './lado'

/** Com um único goleiro em campo, ele passa para o lado que continua jogando. */
export function goleiroUnicoVaiPara(estado: Estado, lado: Lado): Estado {
  const { A, B } = estado.goleiros
  if ((A === null) === (B === null)) return estado // nenhum ou um em cada gol
  return { ...estado, goleiros: { A: null, B: null, [lado]: A ?? B } }
}

/** Ajusta os gols à lista cadastrada: tira quem saiu da lista e preenche gol vazio. */
export function sincronizarGoleiros(estado: Estado): Estado {
  const lista = estado.config.goleiros.map((g) => g.trim()).filter(Boolean)
  const g = { ...estado.goleiros }
  for (const lado of LADOS) {
    if (g[lado] !== null && !lista.includes(g[lado]!)) g[lado] = null
  }
  for (const lado of LADOS) {
    if (g[lado] === null) g[lado] = lista.find((n) => n !== g.A && n !== g.B) ?? null
  }
  return { ...estado, goleiros: g }
}

export function definirGoleiros(estado: Estado, goleiros: string[]): Estado {
  return sincronizarGoleiros({ ...estado, config: { ...estado.config, goleiros } })
}

/** Escolhe o goleiro de um gol. Se ele estava no outro gol, os dois trocam. */
export function escolherGoleiro(estado: Estado, lado: Lado, nome: string | null): Estado {
  const g = { ...estado.goleiros }
  const outroLado = outro(lado)
  if (nome !== null && g[outroLado] === nome) g[outroLado] = g[lado]
  g[lado] = nome
  return { ...estado, goleiros: g }
}

export function trocarGoleiros(estado: Estado): Estado {
  return { ...estado, goleiros: { A: estado.goleiros.B, B: estado.goleiros.A } }
}

/** Id do goleiro fixo (não está na lista): o mesmo nome soma os gols do dia. */
const ID_GOLEIRO = 'goleiro:'
export const jogadorGoleiro = (nome: string): Jogador => ({ id: ID_GOLEIRO + normalizarNome(nome), nome: nome.trim() })

/**
 * Busca de quem estava no gol e fez o gol (PLANO.md, seção 3.8.6): o goleiro não é fixo, então o app não sabe
 * quem é. Quem vai para o gol é sempre alguém da lista: procura entre os goleiros fixos, os jogadores da pelada
 * e a turma. Campo vazio: os goleiros fixos e quem já fez gol no gol hoje, para um toque.
 */
export function buscarGoleiro(estado: Estado, turma: readonly { id: string; nome: string; arquivado?: boolean }[], texto: string, maximo = 6): Jogador[] {
  const gols = [...estado.historico.flatMap((p) => p.gols), ...estado.gols]
  const goleiros = [
    ...[estado.goleiros.A, estado.goleiros.B, ...estado.config.goleiros].filter((n): n is string => !!n?.trim()).map(jogadorGoleiro),
    ...gols.filter((g) => g.autorId?.startsWith(ID_GOLEIRO) && g.autor).reverse().map((g) => ({ id: g.autorId!, nome: g.autor! })),
  ]
  const campo = estado.emCampo ? [...estado.emCampo.A.jogadores, ...estado.emCampo.B.jogadores] : []
  const jogaram = estado.historico.flatMap((p) => [...p.timeA.jogadores, ...p.timeB.jogadores])
  const pessoas = [...campo, ...estado.fila, ...estado.machucados.map((m) => m.jogador), ...jogaram, ...turma.filter((j) => !j.arquivado)]

  // sem repetir (mesmo id ou mesmo nome)
  const vistos = new Set<string>()
  const unicos = (lista: Jogador[]) => lista.filter((j) => {
    const n = normalizarNome(j.nome)
    if (!n || vistos.has(j.id) || vistos.has(n)) return false
    vistos.add(j.id).add(n)
    return true
  }).map((j) => ({ id: j.id, nome: j.nome }))

  const t = normalizarNome(texto)
  if (!t) return unicos(goleiros).slice(0, maximo)
  const nota = (j: Jogador) => {
    const n = normalizarNome(j.nome)
    return n.startsWith(t) ? 2 : n.split(' ').some((p) => p.startsWith(t)) ? 1 : 0
  }
  return unicos([...goleiros, ...pessoas])
    .map((j) => ({ j, n: nota(j) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, maximo)
    .map((x) => x.j)
}
