import { describe, expect, it } from 'vitest'
import { entradasDesfeitas, entradasQueFaltam, participantesDaTurma, resumoDaCaixinha, valorPorPessoaDaCaixinha, type Caixinha } from '..'

// Caixinhas: dinheiro separado por motivo, dividido pela turma.
const jogadores = Array.from({ length: 15 }, (_, indice) => ({ id: `j${indice}`, nome: `JOGADOR ${indice}` }))
const bola: Caixinha = {
  id: 'bola', nome: 'Bola nova', descricao: 'Bola para o campo society', meta: 150, valorPorPessoa: valorPorPessoaDaCaixinha(150, 15),
  turma: 'quarta', jogadores, cobranca: 'ABC123', chavePix: 'pix@exemplo.test', recebedor: 'BRUNO', data: 0,
}

describe('caixinha', () => {
  it('divide o valor por todos da turma, para cima no centavo', () => {
    expect(valorPorPessoaDaCaixinha(150, 15)).toBe(10)
    expect(valorPorPessoaDaCaixinha(100, 15)).toBe(6.67)
    expect(valorPorPessoaDaCaixinha(100, 0)).toBe(0)
  })

  it('resumo: quem pagou, quanto entrou, progresso e saldo da caixinha', () => {
    const status = { j0: 'pago', j1: 'pago', j2: 'avisou' } as const
    const lancamentos = [
      { tipo: 'entrada', valor: 10, descricao: '', data: 1, caixinha: 'bola', jogador: 'j0' },
      { tipo: 'entrada', valor: 10, descricao: '', data: 1, caixinha: 'bola', jogador: 'j1' },
      { tipo: 'saida', valor: 5, descricao: 'bomba de ar', data: 2, caixinha: 'bola' },
      { tipo: 'entrada', valor: 99, descricao: 'outra coisa', data: 2 },
    ] as const
    expect(resumoDaCaixinha(bola, status, [...lancamentos])).toEqual({ pagos: 2, avisaram: 1, pessoas: 15, arrecadado: 20, progresso: 20 / 150, saldo: 15 })
  })

  it('cada pagamento confirmado entra uma vez no caixa; desfeito, sai', () => {
    const lancamentos = [{ id: 'l1', tipo: 'entrada' as const, valor: 10, descricao: '', data: 1, caixinha: 'bola', jogador: 'j0' }]
    expect(entradasQueFaltam(bola, { j0: 'pago', j1: 'pago', j2: 'avisou' }, lancamentos, 5)).toEqual([
      { tipo: 'entrada', valor: 10, descricao: 'Bola nova · JOGADOR 1', data: 5, caixinha: 'bola', jogador: 'j1', turma: 'quarta' },
    ])
    expect(entradasDesfeitas(bola, { j1: 'pago' }, lancamentos).map((lancamento) => lancamento.id)).toEqual(['l1'])
  })

  it('participantes: só quem tem conta, cada conta uma vez', () => {
    const turma = [
      { id: 'a1', nome: 'Bruno', peladas: 1, ultimaPelada: 1, conta: 'contaBruno' },
      { id: 'a2', nome: 'BRUNO', peladas: 4, ultimaPelada: 2, conta: 'contaBruno' },
      { id: 'a3', nome: 'bruno', peladas: 2, ultimaPelada: 3 }, // o mesmo, das peladas em que entrou só com o nome
      { id: 'b1', nome: 'Daniel', peladas: 1, ultimaPelada: 1 },
      { id: 'b2', nome: 'DANIEL', peladas: 3, ultimaPelada: 2 },
      { id: 'c1', nome: 'Caio', peladas: 5, ultimaPelada: 1, arquivado: true },
      { id: 'd1', nome: 'Edu', peladas: 2, ultimaPelada: 1, conta: 'contaEdu' },
    ]
    expect(participantesDaTurma(turma)).toEqual([{ id: 'a2', nome: 'BRUNO' }, { id: 'd1', nome: 'Edu' }])
  })
})
