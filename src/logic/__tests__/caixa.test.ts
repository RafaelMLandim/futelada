import { describe, expect, it } from 'vitest'
import { lancamentosDaPelada, lancamentosDoFiltro, saldoDoCaixa, SEM_TURMA, TODAS_AS_TURMAS, type MovimentoDoCaixa } from '..'

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

  it('fechar o campo pago guarda a turma da pelada', () => {
    const resumo = { pessoas: 2, pagos: 2, avisaram: 0, valor: 15, arrecadado: 30, campo: 20, sobra: 10 }
    expect(lancamentosDaPelada(resumo, 1000, '06/10', 'terca').map((lancamento) => lancamento.turma)).toEqual(['terca', 'terca'])
  })

  it('cada turma tem o seu saldo; lançamentos antigos ficam em "sem turma"', () => {
    const movimento = (valor: number, turma?: string): MovimentoDoCaixa => ({ tipo: 'entrada', valor, descricao: 'x', data: 1, ...(turma && { turma }) })
    const lista = [movimento(100, 'terca'), movimento(50, 'sabado'), movimento(10)]
    expect(saldoDoCaixa(lancamentosDoFiltro(lista, 'terca'))).toBe(100)
    expect(saldoDoCaixa(lancamentosDoFiltro(lista, 'sabado'))).toBe(50)
    expect(saldoDoCaixa(lancamentosDoFiltro(lista, SEM_TURMA))).toBe(10)
    expect(saldoDoCaixa(lancamentosDoFiltro(lista, TODAS_AS_TURMAS))).toBe(160)
  })
})
