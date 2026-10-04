// Disputa de pênaltis: cobranças alternadas; depois das normais, alternadas até alguém errar.

import type { Lado, Placar } from '../../types/pelada'
import { outro } from '../lado'

export type Cobranca = { lado: Lado; jogadorId: string | null; nome: string | null; gol: boolean }

export type Penaltis = {
  comeca: Lado // quem bate primeiro (pode ser sorteado na moeda)
  quantidade: number // cobranças normais de cada lado
  cobrancas: Cobranca[]
}

export const novaDisputa = (comeca: Lado, quantidade: number): Penaltis => ({ comeca, quantidade, cobrancas: [] })

/** De quem é a próxima cobrança. */
export function quemBate(p: Penaltis): Lado {
  return p.cobrancas.length % 2 === 0 ? p.comeca : outro(p.comeca)
}

export function placarDosPenaltis(p: Penaltis): Placar {
  const gols = (l: Lado) => p.cobrancas.filter((c) => c.lado === l && c.gol).length
  return [gols('A'), gols('B')]
}

/** Quem venceu a disputa (null enquanto não está decidida). */
export function vencedorDosPenaltis(p: Penaltis): Lado | null {
  const [gA, gB] = placarDosPenaltis(p)
  const kA = p.cobrancas.filter((c) => c.lado === 'A').length
  const kB = p.cobrancas.filter((c) => c.lado === 'B').length
  const n = p.quantidade
  // Nas cobranças normais, decide antes se um lado não alcança mais o outro
  if (kA <= n && kB <= n) {
    if (gA > gB + (n - kB)) return 'A'
    if (gB > gA + (n - kA)) return 'B'
  }
  // Fim das normais ou alternadas: mesmo número de cobranças e placar diferente
  if (kA === kB && kA >= n && gA !== gB) return gA > gB ? 'A' : 'B'
  return null
}

export function cobrar(p: Penaltis, gol: boolean, jogador: { id: string; nome: string } | null = null): Penaltis {
  if (vencedorDosPenaltis(p)) throw new Error('A disputa já acabou')
  const cobranca: Cobranca = { lado: quemBate(p), jogadorId: jogador?.id ?? null, nome: jogador?.nome ?? null, gol }
  return { ...p, cobrancas: [...p.cobrancas, cobranca] }
}

/** Desfaz a última cobrança (marcada errado). */
export function voltarCobranca(p: Penaltis): Penaltis {
  return { ...p, cobrancas: p.cobrancas.slice(0, -1) }
}
