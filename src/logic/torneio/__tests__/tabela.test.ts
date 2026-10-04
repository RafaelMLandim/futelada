import { describe, expect, it } from 'vitest'
import { ordenarSemRepetir, todosContraTodos } from '..'

const chave = ([a, b]: [string, string]) => [a, b].sort().join('-')

describe('todos contra todos', () => {
  it('4 times: 3 rodadas, cada par se enfrenta uma vez', () => {
    const rodadas = todosContraTodos(['A', 'B', 'C', 'D'])
    expect(rodadas).toHaveLength(3)
    const jogos = rodadas.flat()
    expect(jogos).toHaveLength(6)
    expect(new Set(jogos.map(chave)).size).toBe(6)
    for (const r of rodadas) expect(new Set(r.flat()).size).toBe(4) // ninguém joga duas na rodada
  })

  it('5 times: cada um folga uma rodada e joga 4 vezes', () => {
    const jogos = todosContraTodos(['A', 'B', 'C', 'D', 'E']).flat()
    expect(jogos).toHaveLength(10)
    for (const t of 'ABCDE') expect(jogos.filter((j) => j.includes(t))).toHaveLength(4)
  })

  it('ida e volta repete os jogos com mando invertido', () => {
    const jogos = todosContraTodos(['A', 'B', 'C', 'D'], true).flat()
    expect(jogos).toHaveLength(12)
    const ida = jogos.slice(0, 6).map((j) => j.join('-'))
    const volta = jogos.slice(6).map(([a, b]) => `${b}-${a}`)
    expect(volta.sort()).toEqual(ida.sort())
  })

  it('ordem dos jogos evita time jogando duas seguidas', () => {
    const jogos = ordenarSemRepetir(todosContraTodos(['A', 'B', 'C', 'D', 'E', 'F']).flat(), (j) => j)
    for (let i = 1; i < jogos.length; i++) expect(jogos[i].some((t) => jogos[i - 1].includes(t))).toBe(false)
  })
})
