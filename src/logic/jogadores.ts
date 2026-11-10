// Chegadas e saídas de jogadores.

import type { Estado, Jogador } from '../types/pelada'
import { normalizarNome } from '../utils/formatar'
import { numerarFila } from './fila'
import { chegouGoleiro, definirGoleiros, jogadorGoleiro } from './goleiros'
import { LADOS } from './lado'

let seq = 0
export const novoJogador = (nome: string): Jogador => ({
  id: `${Date.now().toString(36)}-${(seq++).toString(36)}`,
  nome: nome.trim(),
})

/** Quem chega (inclusive atrasado) entra no fim da fila. */
export function adicionarJogador(estado: Estado, jogador: Jogador): Estado {
  return numerarFila({ ...estado, fila: [...estado.fila, jogador] })
}

/** A mesma pessoa entrou pelo link depois de ser digitada: o jogador passa a ser dessa conta (em campo ou na fila). */
export function ligarConta(estado: Estado, jogadorId: string, conta: string): Estado {
  const ligar = (jogador: Jogador) => (jogador.id === jogadorId ? { ...jogador, conta } : jogador)
  const { emCampo } = estado
  return {
    ...estado,
    fila: estado.fila.map(ligar),
    emCampo: emCampo && {
      A: { ...emCampo.A, jogadores: emCampo.A.jogadores.map(ligar) },
      B: { ...emCampo.B, jogadores: emCampo.B.jogadores.map(ligar) },
    },
  }
}

/** Quem jogou com conta: id do jogador → conta (inclui quem já foi embora). O goleiro fixo entra pelo id de goleiro. */
export function contasDaPelada(estado: Estado): Record<string, string> {
  const jogadores = [...todosOsJogadores(estado), ...estado.historico.flatMap((partida) => [...partida.timeA.jogadores, ...partida.timeB.jogadores])]
  return Object.fromEntries([
    ...jogadores.flatMap((jogador) => (jogador.conta ? [[jogador.id, jogador.conta] as const] : [])),
    ...Object.entries(estado.contasDosGoleiros ?? {}).map(([nome, conta]) => [jogadorGoleiro(nome).id, conta] as const),
  ])
}

/** Outro jogador com o mesmo nome na pelada: "BRUNO 2", "BRUNO 3"… */
export function nomeSemRepetir(nome: string, nomes: string[]): string {
  const usados = new Set(nomes.map(normalizarNome))
  if (!usados.has(normalizarNome(nome))) return nome
  let numero = 2
  while (usados.has(normalizarNome(`${nome} ${numero}`))) numero++
  return `${nome} ${numero}`
}

/** Todos os jogadores da sessão: em campo, na fila e machucados. */
export function todosOsJogadores(estado: Estado): Jogador[] {
  const campo = estado.emCampo ? [...estado.emCampo.A.jogadores, ...estado.emCampo.B.jogadores] : []
  return [...campo, ...estado.fila, ...estado.machucados.map((m) => m.jogador)]
}

/**
 * Alguém foi embora. Na fila: sai e a fila sobe.
 * Em campo: o primeiro da fila entra no lugar dele (e a fila sobe).
 */
export function removerJogador(estado: Estado, id: string): Estado {
  // guarda quem saiu: se voltar (ou se foi engano), volta como o mesmo jogador, com a conta
  const saiu = todosOsJogadores(estado).find((jogador) => jogador.id === id)
  if (saiu) estado = { ...estado, foramEmbora: [...(estado.foramEmbora ?? []).filter((jogador) => jogador.id !== id), saiu] }
  // machucado que foi embora: sai da lista de machucados; substituto que foi embora: não há mais o que decidir
  const machucados = estado.machucados
    .filter((m) => m.jogador.id !== id)
    .map((m) => (m.substituto?.id === id ? { ...m, substituto: null } : m))
  if (machucados.length !== estado.machucados.length || machucados.some((m, i) => m !== estado.machucados[i])) {
    estado = { ...estado, machucados }
  }
  if (estado.fila.some((j) => j.id === id)) {
    return numerarFila({ ...estado, fila: estado.fila.filter((j) => j.id !== id) })
  }
  const { emCampo } = estado
  if (!emCampo) return estado
  for (const lado of LADOS) {
    const time = emCampo[lado]
    const i = time.jogadores.findIndex((j) => j.id === id)
    if (i === -1) continue
    const [substituto, ...resto] = estado.fila
    const jogadores = substituto
      ? time.jogadores.map((j, k) => (k === i ? substituto : j))
      : time.jogadores.filter((_, k) => k !== i)
    return numerarFila({
      ...estado,
      fila: substituto ? resto : estado.fila,
      emCampo: { ...emCampo, [lado]: { ...time, jogadores } },
    })
  }
  return estado
}

/**
 * Quem está na fila vira goleiro fixo: sai da fila e entra no gol, levando a conta (a carta continua dele).
 * Quem está em campo não muda no meio da partida.
 */
export function passarParaOGol(estado: Estado, jogadorId: string): Estado {
  const jogador = estado.fila.find((item) => item.id === jogadorId)
  if (!jogador) return estado
  return chegouGoleiro(removerJogador(estado, jogadorId), jogador.nome, jogador.conta ?? null)
}

/** O goleiro fixo vai jogar na linha: sai do gol e entra no fim da fila, levando a conta. */
export function passarParaALinha(estado: Estado, nome: string): Estado {
  const conta = estado.contasDosGoleiros?.[nome]
  const semEle = definirGoleiros(estado, estado.config.goleiros.filter((goleiro) => goleiro !== nome))
  const comoAparece = nomeSemRepetir(nome, todosOsJogadores(semEle).map((jogador) => jogador.nome))
  return adicionarJogador(semEle, { ...novoJogador(comoAparece), ...(conta && { conta }) })
}

/**
 * Alguém com esse nome jogou hoje (ou estava na lista) e saiu: pode ser a mesma pessoa voltando.
 * Prefere quem tem conta (é para a carta dele que vão os números).
 */
export function quemFoiEmbora(estado: Estado, nome: string): Jogador | null {
  const procurado = normalizarNome(nome)
  const naLista = new Set(todosOsJogadores(estado).map((jogador) => jogador.id))
  const jogaram = estado.historico.flatMap((partida) => [...partida.timeA.jogadores, ...partida.timeB.jogadores])
  const candidatos = [...jogaram, ...(estado.foramEmbora ?? [])]
    .filter((jogador) => !naLista.has(jogador.id) && normalizarNome(jogador.nome) === procurado)
  return candidatos.filter((jogador) => jogador.conta).at(-1) ?? candidatos.at(-1) ?? null
}

/** Voltou: entra no fim da fila como o mesmo jogador (mesmo id e mesma conta), e os números dele se juntam. */
export function voltouParaALista(estado: Estado, jogador: Jogador): Estado {
  const foramEmbora = (estado.foramEmbora ?? []).filter((item) => item.id !== jogador.id)
  return adicionarJogador({ ...estado, foramEmbora }, jogador)
}

/** A conta já está na pelada agora: na lista, em campo, machucada ou como goleiro fixo. */
export function contaNaLista(estado: Estado, conta: string): boolean {
  if (todosOsJogadores(estado).some((jogador) => jogador.conta === conta)) return true
  return estado.config.goleiros.some((goleiro) => estado.contasDosGoleiros?.[goleiro] === conta)
}

/**
 * Quem tem a conta se coloca na pelada (o organizador, sem precisar do link): na fila ou no gol, ligado à conta.
 * Se já está, nada muda; se tinha saído hoje, volta como o mesmo jogador.
 */
export function incluirConta(estado: Estado, conta: string, nome: string, noGol: boolean): Estado {
  if (contaNaLista(estado, conta)) return estado
  if (noGol) return chegouGoleiro(estado, nome, conta)
  const saiu = [...(estado.foramEmbora ?? [])].reverse().find((jogador) => jogador.conta === conta)
  if (saiu) return voltouParaALista(estado, saiu)
  const comoAparece = nomeSemRepetir(nome, todosOsJogadores(estado).map((jogador) => jogador.nome))
  return adicionarJogador(estado, { ...novoJogador(comoAparece), conta })
}
