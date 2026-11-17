// Utilitários compartilhados pelos testes da lógica.

import { adicionarJogador, blocosDaFila, configPadrao, novaSessao, novoJogador } from '..'
import type { Estado } from '../../types/pelada'

export const nomes = (js: { nome: string }[]) => js.map((j) => j.nome)
export const blocos = (s: Estado) => blocosDaFila(s).map(nomes)

export function sessao(lista: string[], config = configPadrao): Estado {
  return lista.reduce((s, n) => adicionarJogador(s, novoJogador(n)), novaSessao(config))
}

export const LISTA = ['João', 'Carlos', 'Bruno', 'Marcos', 'Rafael', 'Daniel', 'Junior', 'Landim', 'Mano', 'Lucas']

/** Todos que jogaram (e os goleiros fixos) com conta no app: `conta:NOME`. O histórico do ano só conta quem tem conta. */
export function comContas<T extends { historico: { timeA: { jogadores: { nome: string; conta?: string }[] }; timeB: { jogadores: { nome: string; conta?: string }[] }; goleiros: Record<string, string | null> }[]; contasDosGoleiros?: Record<string, string> }>(estado: T): T {
  const ligar = <J extends { nome: string; conta?: string }>(jogador: J): J => ({ ...jogador, conta: jogador.conta ?? `conta:${jogador.nome}` })
  const goleiros = estado.historico.flatMap((partida) => Object.values(partida.goleiros).filter((nome): nome is string => !!nome))
  return {
    ...estado,
    historico: estado.historico.map((partida) => ({ ...partida, timeA: { ...partida.timeA, jogadores: partida.timeA.jogadores.map(ligar) }, timeB: { ...partida.timeB, jogadores: partida.timeB.jogadores.map(ligar) } })),
    contasDosGoleiros: { ...Object.fromEntries(goleiros.map((nome) => [nome, `conta:${nome}`])), ...estado.contasDosGoleiros },
  }
}
