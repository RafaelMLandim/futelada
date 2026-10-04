import { describe, expect, it } from 'vitest'
import { alternarCrono, cronoZerado, darAcrescimos, tempoDecorrido, tempoTotalMs } from '../cronometro'

describe('acréscimos', () => {
  it('somam ao tempo da partida e soltam o relógio', () => {
    const parado = alternarCrono(alternarCrono(cronoZerado, true, 0), false, 600_000) // 10:00
    expect(tempoTotalMs(10, parado)).toBe(600_000)
    const c = darAcrescimos(parado, 3, 1_000_000)
    expect(c.rodando).toBe(true)
    expect(tempoTotalMs(10, c)).toBe(780_000)
    expect(tempoDecorrido(c, 1_060_000)).toBe(660_000) // 1 min de acréscimo
  })
  it('pausar não perde os acréscimos', () => {
    const c = alternarCrono(darAcrescimos(cronoZerado, 2, 0), false, 1000)
    expect(c.acrescimoMin).toBe(2)
  })
})
