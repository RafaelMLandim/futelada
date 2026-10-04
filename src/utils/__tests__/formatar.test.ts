import { describe, expect, it } from 'vitest'
import { minutoDoGol } from '../formatar'

describe('minuto do gol', () => {
  it('conta como no futebol: o 1º minuto vai de 0:00 a 0:59', () => {
    expect(minutoDoGol(0, 10)).toBe("1'")
    expect(minutoDoGol(150_000, 10)).toBe("3'") // 2min30s
    expect(minutoDoGol(599_000, 10)).toBe("10'")
  })
  it('depois do tempo regulamentar vira acréscimo', () => {
    expect(minutoDoGol(600_000, 10)).toBe("10+1'")
    expect(minutoDoGol(700_000, 10)).toBe("10+2'")
  })
  it('sem tempo registrado, não mostra minuto', () => {
    expect(minutoDoGol(undefined, 10)).toBeNull()
  })
})
