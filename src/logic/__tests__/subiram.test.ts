import { describe, expect, it } from 'vitest'
import { adicionarJogador, alterarLinha, atualizarSubiram, comecar, gol, novoJogador, removerJogador, subiuDe, vitoria } from '..'
import type { Estado } from '../../types/pelada'
import { LISTA, sessao } from './utils'

// Aplica a ação como o app faz: atualizando as marcas de quem subiu
const fazer = (s: Estado, fn: (e: Estado) => Estado) => atualizarSubiram(s, fn(s))
const id = (s: Estado, nome: string) =>
  [...s.fila, ...s.emCampo!.A.jogadores, ...s.emCampo!.B.jogadores].find((j) => j.nome === nome)!.id

describe('quem subiu', () => {
  it('quem perde e completa o time incompleto fica marcado com o time de onde veio', () => {
    let s = comecar(sessao(LISTA))
    s = fazer(s, (e) => vitoria(e, 'B')) // T1 perde: João e Carlos completam o T3
    expect(s.subiram.map((x) => [x.de, x.para])).toEqual([[1, 3], [1, 3]])
    expect(subiuDe(s, id(s, 'João'))).toBe(1)
    expect(subiuDe(s, id(s, 'Bruno'))).toBeNull() // continuou no Time 1
  })

  it('gol não mexe nas marcas; a próxima movimentação troca as marcas', () => {
    let s = comecar(sessao(LISTA))
    s = fazer(s, (e) => vitoria(e, 'B'))
    s = fazer(s, (e) => gol(e, 'A'))
    expect(s.subiram).toHaveLength(2)
    s = fazer(s, (e) => vitoria(e, 'B')) // T3 perde: Mano e Lucas completam o T1
    expect(subiuDe(s, id(s, 'João'))).toBeNull()
    expect(subiuDe(s, id(s, 'Mano'))).toBe(3)
  })

  it('quem entra em campo no lugar de quem foi embora fica marcado', () => {
    let s = comecar(sessao(LISTA))
    s = fazer(s, (e) => removerJogador(e, id(e, 'Rafael')))
    expect(subiuDe(s, id(s, 'Mano'))).toBe(3)
  })

  it('quem chega atrasado não é marcado', () => {
    let s = comecar(sessao(LISTA))
    s = fazer(s, (e) => adicionarJogador(e, novoJogador('Pedro')))
    expect(s.subiram).toEqual([])
  })

  it('mudar o tamanho da linha não marca ninguém (e limpa as marcas)', () => {
    let s = comecar(sessao([...LISTA, 'Pedro', 'Thiago', 'Felipe']))
    s = fazer(s, (e) => vitoria(e, 'B'))
    expect(s.subiram.length).toBeGreaterThan(0)
    s = fazer(s, (e) => alterarLinha(e, 3))
    expect(s.subiram).toEqual([])
  })
})
