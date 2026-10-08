// Campo pago: quanto cada um paga, quem já pagou e quanto entrou (PLANO.md, seção 12).

import type { Estado, Jogador, StatusPagamento } from '../types/pelada'
import { todosOsJogadores } from './jogadores'

/** Quem paga: os jogadores da pelada e quem já foi embora mas tem pagamento registrado. */
export function pagantes(estado: Estado): Jogador[] {
  const presentes = todosOsJogadores(estado)
  const ids = new Set(presentes.map((j) => j.id))
  const foram = Object.entries(estado.pagamentos).filter(([id]) => !ids.has(id)).map(([id, p]) => ({ id, nome: p.nome }))
  return [...presentes, ...foram].sort((a, b) => a.nome.localeCompare(b.nome))
}

/** Valor por pessoa: proporcional (campo ÷ pagantes, arredondado para cima no centavo) ou fixo. */
export function valorPorPessoa(estado: Estado): number {
  const { pagamento } = estado.config
  if (pagamento.modo === 'fixo') return pagamento.valorFixo
  const n = pagantes(estado).length
  return n ? Math.ceil((pagamento.valorCampo * 100) / n) / 100 : 0
}

/** Marca (ou desmarca, com null) o pagamento de um jogador. */
export function marcarPagamento(estado: Estado, jogador: Jogador, status: StatusPagamento | null): Estado {
  const pagamentos = { ...estado.pagamentos }
  if (status) pagamentos[jogador.id] = { nome: jogador.nome, status }
  else delete pagamentos[jogador.id]
  return { ...estado, pagamentos }
}

export type ResumoPagamentos = { pessoas: number; pagos: number; avisaram: number; valor: number; arrecadado: number; campo: number; sobra: number }

export function resumoPagamentos(estado: Estado): ResumoPagamentos {
  const valor = valorPorPessoa(estado)
  const status = Object.values(estado.pagamentos).map((p) => p.status)
  const pagos = status.filter((s) => s === 'pago').length
  const arrecadado = Math.round(pagos * valor * 100) / 100
  const campo = estado.config.pagamento.valorCampo
  return {
    pessoas: pagantes(estado).length, pagos, avisaram: status.filter((s) => s === 'avisou').length,
    valor, arrecadado, campo, sobra: Math.round((arrecadado - campo) * 100) / 100,
  }
}
