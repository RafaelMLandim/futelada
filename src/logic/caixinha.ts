// Caixinhas do caixa: dinheiro separado por motivo ("Bola nova", "Coletes"), dividido por todos os jogadores da
// turma, como o campo pago (PLANO.md, seção 19). O pagamento é o mesmo do campo pago: link com QR do Pix, a pessoa
// toca em "Já paguei" e o organizador confirma. O que é confirmado entra no caixa marcado com a caixinha.

import type { MovimentoDoCaixa } from './caixa'
import type { StatusPagamento } from '../types/pelada'

export type JogadorDaCaixinha = { id: string; nome: string }

export type Caixinha = {
  id: string
  nome: string // "Bola nova"
  descricao: string // o motivo, que aparece no link
  meta: number // valor total, em reais
  valorPorPessoa: number // meta dividida pelos jogadores da turma (para cima, no centavo)
  turma: string | null
  jogadores: JogadorDaCaixinha[] // os jogadores da turma quando a caixinha foi criada
  cobranca: string // código do link de pagamento (mesmo do campo pago)
  chavePix: string
  recebedor: string
  data: number // criada em
  encerrada?: boolean
}

/** Valor por pessoa: o total dividido por todos, arredondado para cima no centavo (como no campo pago). */
export function valorPorPessoaDaCaixinha(meta: number, jogadores: number): number {
  return jogadores > 0 ? Math.ceil((meta * 100) / jogadores) / 100 : 0
}

export type ResumoDaCaixinha = {
  pagos: number; avisaram: number; pessoas: number
  arrecadado: number // confirmados × valor por pessoa
  progresso: number // 0 a 1, arrecadado ÷ meta
  saldo: number // o que está no caixa por esta caixinha (entradas − saídas)
}

const centavos = (valor: number) => Math.round(valor * 100) / 100

/** Quem pagou, quanto entrou e o saldo (os lançamentos do caixa marcados com a caixinha). */
export function resumoDaCaixinha(caixinha: Caixinha, status: Record<string, StatusPagamento>, lancamentos: MovimentoDoCaixa[]): ResumoDaCaixinha {
  const dela = caixinha.jogadores.map((jogador) => status[jogador.id])
  const pagos = dela.filter((estado) => estado === 'pago').length
  const arrecadado = centavos(pagos * caixinha.valorPorPessoa)
  const saldo = centavos(lancamentos.filter((lancamento) => lancamento.caixinha === caixinha.id)
    .reduce((total, lancamento) => total + (lancamento.tipo === 'entrada' ? lancamento.valor : -lancamento.valor), 0))
  return {
    pagos, avisaram: dela.filter((estado) => estado === 'avisou').length, pessoas: caixinha.jogadores.length,
    arrecadado, progresso: caixinha.meta > 0 ? Math.min(1, arrecadado / caixinha.meta) : 0, saldo,
  }
}

/** Pagamentos confirmados que ainda não entraram no caixa: uma entrada por pessoa, marcada com a caixinha. */
export function entradasQueFaltam(caixinha: Caixinha, status: Record<string, StatusPagamento>, lancamentos: MovimentoDoCaixa[], agora: number): MovimentoDoCaixa[] {
  const jaEntraram = new Set(lancamentos.filter((lancamento) => lancamento.caixinha === caixinha.id && lancamento.jogador).map((lancamento) => lancamento.jogador))
  return caixinha.jogadores.filter((jogador) => status[jogador.id] === 'pago' && !jaEntraram.has(jogador.id)).map((jogador) => ({
    tipo: 'entrada', valor: caixinha.valorPorPessoa, descricao: `${caixinha.nome} · ${jogador.nome}`, data: agora,
    caixinha: caixinha.id, jogador: jogador.id, ...(caixinha.turma && { turma: caixinha.turma }),
  }))
}

/** Entradas de quem deixou de estar pago (o organizador desfez): saem do caixa. */
export function entradasDesfeitas<T extends MovimentoDoCaixa & { id: string }>(caixinha: Caixinha, status: Record<string, StatusPagamento>, lancamentos: T[]): T[] {
  return lancamentos.filter((lancamento) => lancamento.caixinha === caixinha.id && lancamento.jogador && lancamento.tipo === 'entrada' && status[lancamento.jogador] !== 'pago')
}
