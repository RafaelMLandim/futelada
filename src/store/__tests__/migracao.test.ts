import { describe, expect, it } from 'vitest'
import { completarApp } from '../migracao'

describe('dados salvos em versão antiga', () => {
  it('completa o que falta com os valores padrão', () => {
    const antigo = { estado: { config: { linha: 5 }, historico: [{ numero: 1 }] }, iniciada: true }
    const app = completarApp(antigo as never)
    expect(app.estado.config.linha).toBe(5) // mantém o que já tinha
    expect(app.estado.config.minutosAzul).toBe(2)
    expect(app.estado.cartoes).toEqual([])
    expect(app.estado.gols).toEqual([])
    expect(app.estado.historico[0].cartoes).toEqual([])
    expect(app.desfazer).toEqual([])
  })
})
