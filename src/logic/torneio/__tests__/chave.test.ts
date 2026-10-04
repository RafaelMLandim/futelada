import { describe, expect, it } from 'vitest'
import { montarChave, ordemDasSementes } from '..'
import type { Origem } from '../../../types/torneio'

const sementes = (n: number): Origem[] => Array.from({ length: n }, (_, i) => ({ tipo: 'time', time: `S${i + 1}` }))
const rodadas = (jogos: ReturnType<typeof montarChave>) => jogos.map((j) => j.rodada)

describe('chave do mata-mata', () => {
  it('sementes 1 e 2 só se cruzam na final', () => {
    expect(ordemDasSementes(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })

  it('8 times: quartas, semis e final (com 3º lugar antes da final)', () => {
    const jogos = montarChave(sementes(8), true)
    expect(rodadas(jogos)).toEqual([
      'Quartas de final', 'Quartas de final', 'Quartas de final', 'Quartas de final',
      'Semifinal', 'Semifinal', 'Disputa de 3º lugar', 'Final',
    ])
    expect(jogos[0].casa).toEqual({ tipo: 'time', time: 'S1' })
    expect(jogos[0].fora).toEqual({ tipo: 'time', time: 'S8' })
  })

  it('6 times: as sementes 1 e 2 passam direto (bye) para a semifinal', () => {
    const jogos = montarChave(sementes(6), false)
    expect(rodadas(jogos)).toEqual(['Quartas de final', 'Quartas de final', 'Semifinal', 'Semifinal', 'Final'])
    const semi = jogos.filter((j) => j.rodada === 'Semifinal')
    expect(semi[0].casa).toEqual({ tipo: 'time', time: 'S1' })
    expect(semi[1].casa).toEqual({ tipo: 'time', time: 'S2' })
  })

  it('4 times com 3º lugar', () => {
    expect(rodadas(montarChave(sementes(4), true))).toEqual(['Semifinal', 'Semifinal', 'Disputa de 3º lugar', 'Final'])
  })

  it('3 times: um bye e sem 3º lugar (não há dois perdedores de semi)', () => {
    expect(rodadas(montarChave(sementes(3), true))).toEqual(['Semifinal', 'Final'])
  })
})
