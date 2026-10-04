import { describe, expect, it } from 'vitest'
import { adicionarJogador, comecar, empate, novoJogador, removerJogador, timesDaFila, vitoria } from '..'
import type { Estado } from '../../types/pelada'
import { LISTA, nomes, sessao } from './utils'

const fila = (s: Estado) => timesDaFila(s).map((t) => [t.numero, nomes(t.jogadores)])
const todosOsNumeros = (s: Estado) =>
  new Set([s.emCampo!.A.numero, s.emCampo!.B.numero, ...timesDaFila(s).map((t) => t.numero)])

describe('numeração dos times', () => {
  it('quem perde vai para o fim da fila com o mesmo número, mesmo cedendo jogadores', () => {
    let s = comecar(sessao(LISTA)) // T1 x T2, fila: T3 [Mano, Lucas]
    s = vitoria(s, 'B') // T1 perde: João e Carlos completam o T3
    expect(s.emCampo!.A.numero).toBe(3)
    expect(fila(s)).toEqual([[1, ['Bruno', 'Marcos']]])
  })

  it('o time incompleto é completado pelo próximo que perder e continua com o número dele', () => {
    let s = comecar(sessao(LISTA))
    s = vitoria(s, 'B') // T1 perde → fila: T1 [Bruno, Marcos]
    s = vitoria(s, 'B') // T3 perde → Mano e Lucas completam o T1; João e Carlos seguem como T3
    expect(s.emCampo!.A.numero).toBe(1)
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['Bruno', 'Marcos', 'Mano', 'Lucas'])
    expect(fila(s)).toEqual([[3, ['João', 'Carlos']]])
  })

  it('com 18 pessoas e 4 na linha nunca passa de 5 times, por mais partidas que tenha', () => {
    const lista = Array.from({ length: 18 }, (_, i) => `J${i + 1}`)
    let s = comecar(sessao(lista))
    const vistos = new Set<number>()
    for (let i = 0; i < 40; i++) {
      s = i % 7 === 6 ? empate(s, i % 2 ? 'A' : 'B') : vitoria(s, i % 3 ? 'A' : 'B')
      todosOsNumeros(s).forEach((n) => vistos.add(n))
      expect(timesDaFila(s).filter((t) => t.jogadores.length < 4).length).toBeLessThanOrEqual(1)
    }
    expect([...vistos].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('time novo só nasce quando chega gente e não há time incompleto', () => {
    let s = comecar(sessao(LISTA)) // fila: T3 [Mano, Lucas]
    s = adicionarJogador(s, novoJogador('Pedro'))
    s = adicionarJogador(s, novoJogador('Thiago'))
    expect(fila(s)).toEqual([[3, ['Mano', 'Lucas', 'Pedro', 'Thiago']]])
    s = adicionarJogador(s, novoJogador('Felipe'))
    expect(fila(s)).toEqual([[3, ['Mano', 'Lucas', 'Pedro', 'Thiago']], [4, ['Felipe']]])
  })

  it('se o último time da fila fica vazio, o número dele some', () => {
    let s = comecar(sessao([...LISTA, 'Pedro', 'Thiago', 'Felipe']))
    const felipe = s.fila.at(-1)!
    s = removerJogador(s, felipe.id)
    expect(fila(s)).toEqual([[3, ['Mano', 'Lucas', 'Pedro', 'Thiago']]])
  })
})
