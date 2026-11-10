// Caixa da pelada: entradas e saídas (fica no perfil de quem entrou com o Google). PLANO.md, seção 12.1.

import type { ResumoPagamentos } from './pagamento'

// turma: de qual pelada é o dinheiro (sem turma = lançamentos antigos ou de pelada sem turma)
export type MovimentoDoCaixa = { tipo: 'entrada' | 'saida'; valor: number; descricao: string; data: number; turma?: string | null }

/** O que mostrar no caixa: todas as turmas, só os lançamentos sem turma ou uma turma. */
export const TODAS_AS_TURMAS = 'todas'
export const SEM_TURMA = 'sem-turma'

export function lancamentosDoFiltro<T extends Pick<MovimentoDoCaixa, 'turma'>>(lancamentos: T[], filtro: string): T[] {
  if (filtro === TODAS_AS_TURMAS) return lancamentos
  return lancamentos.filter((lancamento) => (lancamento.turma ?? SEM_TURMA) === filtro)
}

/** Saldo: entradas − saídas (arredondado no centavo). */
export function saldoDoCaixa(lancamentos: Pick<MovimentoDoCaixa, 'tipo' | 'valor'>[]): number {
  const total = lancamentos.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
  return Math.round(total * 100) / 100
}

/**
 * Fechamento do campo pago no caixa: entra o que foi pago e sai o valor do campo.
 * Ex.: 12 pagaram R$ 15 (R$ 180) e o campo custou R$ 120 → caixa +R$ 60.
 */
export function lancamentosDaPelada(resumo: ResumoPagamentos, data: number, dia: string, turma: string | null = null): MovimentoDoCaixa[] {
  const lista: MovimentoDoCaixa[] = []
  if (resumo.arrecadado > 0) {
    lista.push({ tipo: 'entrada', valor: resumo.arrecadado, descricao: `Pelada ${dia} · ${resumo.pagos} ${resumo.pagos === 1 ? 'pagou' : 'pagaram'}`, data, ...(turma && { turma }) })
  }
  if (resumo.campo > 0) lista.push({ tipo: 'saida', valor: resumo.campo, descricao: `Campo · pelada ${dia}`, data: data + 1, ...(turma && { turma }) })
  return lista
}
