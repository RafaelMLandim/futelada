import { describe, expect, it } from 'vitest'
import { lancamentosDaPelada, saldoDoCaixa } from '..'

describe('caixa da pelada', () => {
  it('saldo = entradas − saídas', () => {
    expect(saldoDoCaixa([
      { tipo: 'entrada', valor: 180 }, { tipo: 'saida', valor: 120 }, { tipo: 'saida', valor: 89.9 }, { tipo: 'entrada', valor: 50.1 },
    ])).toBe(20.2)
  })

  it('fechar o campo pago: entra o que pagaram, sai o campo', () => {
    const resumo = { pessoas: 12, pagos: 12, avisaram: 0, valor: 15, arrecadado: 180, campo: 120, sobra: 60 }
    const l = lancamentosDaPelada(resumo, 1000, '06/10')
    expect(l).toEqual([
      { tipo: 'entrada', valor: 180, descricao: 'Pelada 06/10 · 12 pagaram', data: 1000 },
      { tipo: 'saida', valor: 120, descricao: 'Campo · pelada 06/10', data: 1001 },
    ])
    expect(saldoDoCaixa(l)).toBe(60)
  })
})
