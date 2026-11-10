import { describe, expect, it } from 'vitest'
import { alternarCrono, cronoZerado, darAcrescimos, pararNoFim, tempoDecorrido, tempoTotalMs } from '../cronometro'

// Cronômetro: o celular pode ficar bloqueado ou com o app em segundo plano no fim do tempo.
const MINUTO = 60_000

describe('pararNoFim', () => {
  it('celular bloqueado: o tempo que passou do fim não conta', () => {
    const rodando = alternarCrono(cronoZerado, true, 0)
    // 10 min de jogo; a pessoa só volta para o app aos 13 min
    const parado = pararNoFim(rodando, 10 * MINUTO, 13 * MINUTO)
    expect(parado.rodando).toBe(false)
    expect(tempoDecorrido(parado)).toBe(10 * MINUTO)
  })

  it('os acréscimos dados depois começam do zero (não chegam gastos)', () => {
    const parado = pararNoFim(alternarCrono(cronoZerado, true, 0), 10 * MINUTO, 13 * MINUTO)
    const comAcrescimos = darAcrescimos(parado, 2, 20 * MINUTO)
    // 1 min depois de começar os acréscimos, ainda falta 1 min
    expect(tempoDecorrido(comAcrescimos, 21 * MINUTO)).toBe(11 * MINUTO)
    expect(tempoTotalMs(10, comAcrescimos)).toBe(12 * MINUTO)
  })

  it('antes do limite, fica igual a pausar', () => {
    const rodando = alternarCrono(cronoZerado, true, 0)
    expect(pararNoFim(rodando, 10 * MINUTO, 9 * MINUTO)).toEqual(alternarCrono(rodando, false, 9 * MINUTO))
  })

  it('com o app aberto, o meio segundo do relógio também não conta', () => {
    const parado = pararNoFim(alternarCrono(cronoZerado, true, 0), 10 * MINUTO, 10 * MINUTO + 400)
    expect(tempoDecorrido(parado)).toBe(10 * MINUTO)
  })
})
