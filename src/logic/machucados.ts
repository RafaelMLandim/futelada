// Jogador machucado e o substituto (PLANO.md, seção 3.8.4).
// - Machucou: o primeiro da fila entra no lugar; o machucado fica fora da fila (não sobe).
// - Voltou na mesma partida: volta para o lugar dele e o substituto volta a ser o primeiro da fila
//   (a lista fica como estava antes). Depois que a partida dele acabou, volta para o fim da fila.
// - Fim da partida com substituto em campo: se o time dele venceu, o substituto fica no time; se o
//   time saiu de campo, quem organiza decide se ele fica no time ou volta para o lugar dele na fila.

import type { Estado, Jogador, Lado, Machucado } from '../types/pelada'
import { numerarFila } from './fila'
import { adicionarJogador } from './jogadores'
import { LADOS } from './lado'

/** Número da partida em andamento. */
const partidaAtual = (estado: Estado) => estado.historico.length + 1

/** Machucou em campo: sai para a lista de machucados e o primeiro da fila entra no lugar. */
export function machucou(estado: Estado, lado: Lado, jogadorId: string): Estado {
  const { emCampo } = estado
  if (!emCampo) return estado
  const time = emCampo[lado]
  const i = time.jogadores.findIndex((j) => j.id === jogadorId)
  if (i === -1) return estado
  const jogador = time.jogadores[i]
  const [substituto, ...resto] = estado.fila
  const jogadores = substituto ? time.jogadores.map((j, k) => (k === i ? substituto : j)) : time.jogadores.filter((_, k) => k !== i)
  const machucado: Machucado = {
    jogador, lado, time: time.numero, partida: partidaAtual(estado),
    substituto: substituto ? { id: substituto.id, nome: substituto.nome, deTime: estado.filaTimes[0], antesDe: resto[0]?.id ?? null } : null,
  }
  return numerarFila({
    ...estado,
    fila: substituto ? resto : estado.fila,
    emCampo: { ...emCampo, [lado]: { ...time, jogadores } },
    machucados: [...estado.machucados, machucado],
    foraDoJogo: [...estado.foraDoJogo, { lado, jogador }],
  })
}

/** Substituto de volta para o lugar dele na fila: logo antes de quem vinha atrás dele (ou no começo). */
function devolverNaFila(fila: Jogador[], substituto: Jogador, antesDe: string | null): Jogador[] {
  const i = antesDe ? fila.findIndex((j) => j.id === antesDe) : -1
  return i === -1 ? [substituto, ...fila] : [...fila.slice(0, i), substituto, ...fila.slice(i)]
}

/** Ainda dá para voltar para o jogo: a partida em que se machucou não acabou. */
export function podeVoltarAoJogo(estado: Estado, m: Machucado): boolean {
  return estado.emCampo !== null && m.partida === partidaAtual(estado)
}

/**
 * O machucado vai voltar. Na mesma partida: volta para o lugar dele (o substituto volta a ser o primeiro
 * da fila). Se a partida dele já acabou: entra no fim da fila.
 */
export function voltouDoMachucado(estado: Estado, jogadorId: string): Estado {
  const m = estado.machucados.find((x) => x.jogador.id === jogadorId)
  if (!m) return estado
  const machucados = estado.machucados.filter((x) => x !== m)
  if (!podeVoltarAoJogo(estado, m)) return adicionarJogador({ ...estado, machucados }, m.jogador)

  const emCampo = estado.emCampo!
  const time = emCampo[m.lado]
  const foraDoJogo = estado.foraDoJogo.filter((f) => f.jogador.id !== m.jogador.id)
  const i = m.substituto ? time.jogadores.findIndex((j) => j.id === m.substituto!.id) : -1
  if (i === -1) {
    // entrou ninguém (fila vazia) ou o substituto já saiu: só volta para o time
    return { ...estado, machucados, foraDoJogo, emCampo: { ...emCampo, [m.lado]: { ...time, jogadores: [...time.jogadores, m.jogador] } } }
  }
  const substituto = time.jogadores[i]
  return numerarFila({
    ...estado,
    machucados,
    foraDoJogo,
    fila: devolverNaFila(estado.fila, substituto, m.substituto!.antesDe),
    emCampo: { ...emCampo, [m.lado]: { ...time, jogadores: time.jogadores.map((j, k) => (k === i ? m.jogador : j)) } },
  })
}

/** Machucado cujo substituto é este jogador (e ainda falta decidir o destino dele). */
export function substitutoDe(estado: Estado, jogadorId: string): Machucado | null {
  return estado.machucados.find((m) => m.substituto?.id === jogadorId) ?? null
}

/**
 * Substitutos em campo que precisam de decisão quando a partida acabar: os dos times que saem de campo
 * (`saem`) sem ter vencido. Quem venceu fica no time.
 */
export function substitutosParaDecidir(estado: Estado, saem: Lado[]): Machucado[] {
  const { emCampo } = estado
  if (!emCampo) return []
  return estado.machucados.filter((m) => m.substituto && saem.some((l) => emCampo[l].jogadores.some((j) => j.id === m.substituto!.id)))
}

export type Decisao = 'fica' | 'volta'

/**
 * Encerra a partida (`encerrar`: vitória ou empate) com os substitutos decididos: quem "volta" sai do time
 * antes e volta para o lugar dele na fila (assim entra com o time antigo, se for a vez dele); os outros
 * ficam no time. O histórico guarda a partida com quem jogou. Depois, nenhum substituto fica pendente.
 */
export function encerrarComSubstitutos(estado: Estado, decisoes: Record<string, Decisao>, encerrar: (e: Estado) => Estado): Estado {
  let s = estado
  const voltam = estado.machucados.filter((m) => m.substituto && decisoes[m.substituto.id] === 'volta')
  for (const m of voltam) {
    const campo = s.emCampo!
    const lado = LADOS.find((l) => campo[l].jogadores.some((j) => j.id === m.substituto!.id))
    if (!lado) continue
    const time = campo[lado]
    const substituto = time.jogadores.find((j) => j.id === m.substituto!.id)!
    s = {
      ...s,
      fila: devolverNaFila(s.fila, substituto, m.substituto!.antesDe),
      emCampo: { ...campo, [lado]: { ...time, jogadores: time.jogadores.filter((j) => j !== substituto) } },
      foraDoJogo: [...s.foraDoJogo, { lado, jogador: substituto }],
    }
  }
  if (voltam.length) s = numerarFila(s)
  s = encerrar(s)
  return { ...s, machucados: s.machucados.map((m) => (m.substituto ? { ...m, substituto: null } : m)) }
}
