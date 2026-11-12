import { describe, expect, it } from 'vitest'
import { entradasDesfeitas, entradasQueFaltam, resumoDaCaixinha, valorPorPessoaDaCaixinha, type Caixinha } from '..'

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
})
