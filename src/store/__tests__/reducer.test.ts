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
