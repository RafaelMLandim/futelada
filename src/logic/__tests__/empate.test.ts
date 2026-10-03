import { describe, expect, it } from 'vitest'
import { comecar, empate, empateSaemOsDois } from '..'
import { blocos, LISTA, nomes, sessao } from './utils'

describe('empate', () => {
  it('com 2 times completos esperando, saem os dois e a moeda define a ordem', () => {
    const lista = 'ABCDEFGHIJKLMNOP'.split('')
    let s = comecar(sessao(lista))
    expect(empateSaemOsDois(s)).toBe(true)
    s = empate(s, 'B') // deu o Time 2: ele entra primeiro na fila
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['I', 'J', 'K', 'L'])
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['M', 'N', 'O', 'P'])
    expect(blocos(s)).toEqual([['E', 'F', 'G', 'H'], ['A', 'B', 'C', 'D']])
  })

  it('sem 2 times completos esperando, a moeda decide quem sai', () => {
    let s = comecar(sessao(LISTA))
    expect(empateSaemOsDois(s)).toBe(false)
    s = empate(s, 'A') // Time 1 sai
    expect(s.emCampo!.B.numero).toBe(2)
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['Mano', 'Lucas', 'João', 'Carlos'])
  })
})
