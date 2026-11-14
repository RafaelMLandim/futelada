import { describe, expect, it } from 'vitest'
import { problemasParaSortear } from '..'
import type { Origem } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

// Grupos com 1 grupo só: pontos corridos e os primeiros da tabela vão para o mata-mata.

const posicao = (origem: Origem) => (origem.tipo === 'grupo' ? `${origem.posicao}º` : origem.tipo)

describe('1 grupo: pontos corridos + mata-mata', () => {
  it('passam 4: todos contra todos e semifinais 1º x 4º e 2º x 3º', () => {
    const torneio = sorteado(torneioCom(6, 'grupos', { grupos: 1, classificamPorGrupo: 4 }))
    expect(torneio.grupos).toHaveLength(1)
    expect(torneio.grupos[0]).toHaveLength(6)
    expect(torneio.jogos.filter((jogo) => jogo.fase === 'grupo')).toHaveLength(15)
    const semifinais = torneio.jogos.filter((jogo) => jogo.rodada === 'Semifinal')
    expect(semifinais.map((jogo) => `${posicao(jogo.casa)} x ${posicao(jogo.fora)}`)).toEqual(['1º x 4º', '2º x 3º'])
    expect(torneio.jogos.some((jogo) => jogo.rodada === 'Final')).toBe(true)
  })

  it('passam 2: só a final, 1º x 2º', () => {
    const torneio = sorteado(torneioCom(5, 'grupos', { grupos: 1, classificamPorGrupo: 2 }))
    const mata = torneio.jogos.filter((jogo) => jogo.fase === 'mata')
    expect(mata.map((jogo) => `${jogo.rodada}: ${posicao(jogo.casa)} x ${posicao(jogo.fora)}`)).toEqual(['Final: 1º x 2º'])
  })

  it('passam 8: quartas 1º x 8º, 4º x 5º, 2º x 7º, 3º x 6º', () => {
    const torneio = sorteado(torneioCom(10, 'grupos', { grupos: 1, classificamPorGrupo: 8, linha: 2 }, 2))
    const quartas = torneio.jogos.filter((jogo) => jogo.rodada === 'Quartas de final')
    expect(quartas.map((jogo) => `${posicao(jogo.casa)} x ${posicao(jogo.fora)}`)).toEqual(['1º x 8º', '4º x 5º', '2º x 7º', '3º x 6º'])
  })

  it('com 1 grupo, precisam passar pelo menos 2', () => {
    expect(problemasParaSortear(torneioCom(6, 'grupos', { grupos: 1, classificamPorGrupo: 1 }))).toContain('Com 1 grupo, precisam passar pelo menos 2 times')
  })

  it('a chave da Copa não se aplica a 1 grupo (usa o cruzamento da tabela)', () => {
    const torneio = sorteado(torneioCom(6, 'grupos', { grupos: 1, classificamPorGrupo: 4, chaveCopa: true }))
    expect(torneio.jogos.filter((jogo) => jogo.rodada === 'Semifinal')).toHaveLength(2)
  })
})
