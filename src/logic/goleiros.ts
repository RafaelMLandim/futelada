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
 * quem é. Quem vai para o gol é sempre alguém da lista que não está jogando na linha: procura entre os goleiros
 * fixos, a fila, os machucados, quem já jogou hoje e a turma. Quem está em campo nos dois times não aparece
 * (os do time do gol já estão nos botões do "Quem fez?"). Campo vazio: os goleiros fixos e quem já fez gol no gol hoje.
 */
export function buscarGoleiro(estado: Estado, turma: readonly { id: string; nome: string; arquivado?: boolean }[], texto: string, maximo = 6): Jogador[] {
  const gols = [...estado.historico.flatMap((partida) => partida.gols), ...estado.gols]
  const goleiros = [
    ...[estado.goleiros.A, estado.goleiros.B, ...estado.config.goleiros].filter((nome): nome is string => !!nome?.trim()).map(jogadorGoleiro),
    ...gols.filter((gol) => gol.autorId?.startsWith(ID_GOLEIRO) && gol.autor).reverse().map((gol) => ({ id: gol.autorId!, nome: gol.autor! })),
  ]
  const emCampo = estado.emCampo ? [...estado.emCampo.A.jogadores, ...estado.emCampo.B.jogadores] : []
  const jogaram = estado.historico.flatMap((partida) => [...partida.timeA.jogadores, ...partida.timeB.jogadores])
  const pessoas = [...estado.fila, ...estado.machucados.map((machucado) => machucado.jogador), ...jogaram, ...turma.filter((jogador) => !jogador.arquivado)]

  // sem repetir (mesmo id ou mesmo nome); quem está em campo já começa como visto, para ficar de fora
  const vistos = new Set<string>(emCampo.flatMap((jogador) => [jogador.id, normalizarNome(jogador.nome)]))
  const unicos = (lista: Jogador[]) => lista.filter((jogador) => {
    const nome = normalizarNome(jogador.nome)
    if (!nome || vistos.has(jogador.id) || vistos.has(nome)) return false
    vistos.add(jogador.id).add(nome)
    return true
  }).map((jogador) => ({ id: jogador.id, nome: jogador.nome }))

  const busca = normalizarNome(texto)
  if (!busca) return unicos(goleiros).slice(0, maximo)
  const nota = (jogador: Jogador) => {
    const nome = normalizarNome(jogador.nome)
    return nome.startsWith(busca) ? 2 : nome.split(' ').some((palavra) => palavra.startsWith(busca)) ? 1 : 0
  }
  return unicos([...goleiros, ...pessoas])
    .map((jogador) => ({ jogador, nota: nota(jogador) }))
    .filter((candidato) => candidato.nota > 0)
    .sort((primeiro, segundo) => segundo.nota - primeiro.nota)
    .slice(0, maximo)
    .map((candidato) => candidato.jogador)
}
