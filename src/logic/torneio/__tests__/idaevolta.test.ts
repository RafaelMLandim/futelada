import { describe, expect, it } from 'vitest'
import { campeao, jogosDisponiveis, precisaDePenaltis, registrarResultado, resolverOrigem, timesDoJogo, vencedor } from '..'
import type { Torneio } from '../../../types/torneio'
import { nomeDoTime, resultado, sorteado, torneioCom } from './utils'

// Mata-mata em ida e volta, como na Libertadores: placar agregado, sem gol fora de casa,
// pênaltis só no fim da volta se o agregado empatar; final em jogo único (opcional).

const jogo = (t: Torneio, id: string) => t.jogos.find((j) => j.id === id)!
const nomes = (t: Torneio, id: string) => {
  const x = timesDoJogo(t, jogo(t, id))
  return [nomeDoTime(t, x.A), nomeDoTime(t, x.B)]
}

describe('mata-mata em ida e volta', () => {
  it('cada confronto tem ida e volta com o mando invertido; a final é jogo único', () => {
    const t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true }))
    expect(t.jogos.map((j) => [j.id, j.rodada, j.perna ?? 'único'])).toEqual([
      ['m1', 'Semifinal', 'ida'], ['m2', 'Semifinal', 'ida'],
      ['m3', 'Semifinal', 'volta'], ['m4', 'Semifinal', 'volta'],
      ['m5', 'Final', 'único'],
    ])
    expect(nomes(t, 'm3')).toEqual([...nomes(t, 'm1')].reverse()) // volta: quem era visitante joga em casa
    expect(jogosDisponiveis(t).map((j) => j.id)).toEqual(['m1', 'm2']) // a volta só depois da ida
  })

  it('a final também pode ser ida e volta', () => {
    const t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, finalUnica: false }))
    expect(t.jogos.filter((j) => j.rodada === 'Final').map((j) => j.perna)).toEqual(['ida', 'volta'])
  })

  it('quem avança sai do placar agregado; a ida pode empatar sem pênaltis', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true }))
    const [casaIda, foraIda] = nomes(t, 'm1')
    expect(precisaDePenaltis(t, jogo(t, 'm1'), [1, 1])).toBe(false)
    t = registrarResultado(t, 'm1', resultado(1, 1)) // ida empatada: tudo bem
    expect(vencedor(jogo(t, 'm1'), t)).toBeNull() // a ida não decide
    t = registrarResultado(t, 'm3', resultado(0, 2)) // volta: o time de fora (casa da ida) faz 2
    // agregado: casaIda 1+2 = 3 x 1+0 = 1 foraIda
    expect(nomeDoTime(t, resolverOrigem(t, { tipo: 'vencedor', jogo: 'm3' }))).toBe(casaIda)
    expect(nomeDoTime(t, resolverOrigem(t, { tipo: 'perdedor', jogo: 'm3' }))).toBe(foraIda)
  })

  it('agregado empatado vai para os pênaltis no fim da volta', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true }))
    const [casaIda] = nomes(t, 'm1')
    t = registrarResultado(t, 'm1', resultado(2, 0))
    expect(precisaDePenaltis(t, jogo(t, 'm3'), [2, 0])).toBe(true) // 2 x 2 no agregado
    expect(() => registrarResultado(t, 'm3', resultado(2, 0))).toThrow('pênaltis')
    t = registrarResultado(t, 'm3', resultado(2, 0, { penaltis: [5, 4] })) // na volta, o lado A é o fora da ida
    expect(nomeDoTime(t, resolverOrigem(t, { tipo: 'perdedor', jogo: 'm3' }))).toBe(casaIda)
  })

  it('não dá para registrar a volta antes da ida; o campeão sai da final', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true }))
    expect(() => registrarResultado(t, 'm3', resultado(1, 0))).toThrow('ida')
    t = registrarResultado(t, 'm1', resultado(1, 0))
    t = registrarResultado(t, 'm2', resultado(1, 0))
    t = registrarResultado(t, 'm3', resultado(0, 0))
    t = registrarResultado(t, 'm4', resultado(0, 0))
    expect(jogosDisponiveis(t).map((j) => j.id)).toEqual(['m5'])
    const [a] = nomes(t, 'm5')
    t = registrarResultado(t, 'm5', resultado(3, 1))
    expect(nomeDoTime(t, campeao(t))).toBe(a)
  })

  it('grupos + mata-mata também usa ida e volta no mata-mata', () => {
    const t = sorteado(torneioCom(8, 'grupos', { mataIdaEVolta: true, grupos: 2, classificamPorGrupo: 2 }))
    expect(t.jogos.filter((j) => j.fase === 'mata').map((j) => [j.rodada, j.perna ?? 'único'])).toEqual([
      ['Semifinal', 'ida'], ['Semifinal', 'ida'], ['Semifinal', 'volta'], ['Semifinal', 'volta'], ['Final', 'único'],
    ])
  })
})
