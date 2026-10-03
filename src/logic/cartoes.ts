// Cartões da partida: amarelo, vermelho (sai da partida) e azul (fica um tempo fora).

import type { Cartao, CorCartao, Estado, Jogador, Lado } from '../types/pelada'

/**
 * Dá um cartão. O segundo amarelo do jogador na mesma partida vira vermelho.
 * `tempoMs` é o tempo do cronômetro da partida no momento do cartão.
 */
export function darCartao(estado: Estado, lado: Lado, jogador: Jogador, cor: CorCartao, tempoMs: number): Estado {
  const base = { lado, jogadorId: jogador.id, nome: jogador.nome, tempoMs }
  const novos: Cartao[] = [{ ...base, cor }]
  const jaTinhaAmarelo = estado.cartoes.some((c) => c.jogadorId === jogador.id && c.cor === 'amarelo')
  if (cor === 'amarelo' && jaTinhaAmarelo) novos.push({ ...base, cor: 'vermelho', porDoisAmarelos: true })
  return { ...estado, cartoes: [...estado.cartoes, ...novos] }
}

export function cartoesDoJogador(estado: Estado, jogadorId: string): Cartao[] {
  return estado.cartoes.filter((c) => c.jogadorId === jogadorId)
}

/** Expulso da partida em andamento (time joga com um a menos). */
export function expulso(estado: Estado, jogadorId: string): boolean {
  return estado.cartoes.some((c) => c.jogadorId === jogadorId && c.cor === 'vermelho')
}

/** Quanto falta para o jogador voltar do cartão azul (0 = já pode voltar). */
export function restanteAzul(estado: Estado, jogadorId: string, decorridoMs: number): number {
  const duracao = estado.config.minutosAzul * 60_000
  return estado.cartoes
    .filter((c) => c.jogadorId === jogadorId && c.cor === 'azul')
    .reduce((max, c) => Math.max(max, c.tempoMs + duracao - decorridoMs), 0)
}

export type CartoesDoDia = { id: string; nome: string; amarelo: number; vermelho: number; azul: number }

/** Cartões do dia por jogador, incluindo a partida em andamento. */
export function cartoesDoDia(estado: Estado): CartoesDoDia[] {
  const mapa = new Map<string, CartoesDoDia>()
  for (const c of [...estado.historico.flatMap((p) => p.cartoes), ...estado.cartoes]) {
    const linha = mapa.get(c.jogadorId) ?? { id: c.jogadorId, nome: c.nome, amarelo: 0, vermelho: 0, azul: 0 }
    linha[c.cor]++
    mapa.set(c.jogadorId, linha)
  }
  return [...mapa.values()].sort(
    (x, y) => y.vermelho - x.vermelho || y.azul - x.azul || y.amarelo - x.amarelo || x.nome.localeCompare(y.nome),
  )
}
