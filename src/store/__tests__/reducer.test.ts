import { describe, expect, it } from 'vitest'
import { configPadrao } from '../../logic'
import { estadoInicial, reducer } from '../reducer'

describe('encerrar a pelada', () => {
  it('apaga os goleiros do dia e mantém as outras configurações', () => {
    const app = estadoInicial({ ...configPadrao, tempoMin: 12, goleiros: ['ZÉ', 'TIÃO'] })
    const novo = reducer(app, { tipo: 'encerrar' })
    expect(novo.estado.config.goleiros).toEqual([])
    expect(novo.estado.config.tempoMin).toBe(12)
  })
})

describe('cancelar a pelada', () => {
  it('apaga tudo do dia (lista, jogos, pagamentos, link) e não guarda nada', () => {
    let app = reducer(estadoInicial({ ...configPadrao, goleiros: ['ZÉ'] }), { tipo: 'iniciar' })
    app = reducer(app, { tipo: 'aplicar', fn: (e) => ({ ...e, fila: [{ id: 'j1', nome: 'JOÃO' }], cobranca: 'ABC123', pagamentos: { j1: { nome: 'JOÃO', status: 'pago' } } }) })
    const novo = reducer(app, { tipo: 'cancelar' })
    expect(novo.iniciada).toBe(false)
    expect(novo.estado).toMatchObject({ fila: [], historico: [], pagamentos: {}, cobranca: null, caixaLancado: false })
    expect(novo.estado.config.goleiros).toEqual([])
  })

  it('volta os ajustes de antes da pelada (ex.: o campo pago de teste some), na criação ou depois', () => {
    const antes = { ...configPadrao, tempoMin: 12 }
    let app = estadoInicial(antes)
    const pago = { ...antes.pagamento, ativo: true, valorFixo: 15, modo: 'fixo' as const }
    app = reducer(app, { tipo: 'aplicar', fn: (e) => ({ ...e, config: { ...e.config, pagamento: pago, tempoMin: 7 } }) })
    app = reducer(app, { tipo: 'iniciar' })
    const novo = reducer(app, { tipo: 'cancelar' })
    expect(novo.estado.config.pagamento.ativo).toBe(false)
    expect(novo.estado.config.tempoMin).toBe(12)
  })
})
