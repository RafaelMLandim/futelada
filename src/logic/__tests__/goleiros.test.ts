import { describe, expect, it } from 'vitest'
import { comecar, configPadrao, definirGoleiros, escolherGoleiro, trocarGoleiros, vitoria } from '..'
import { LISTA, sessao } from './utils'

describe('goleiros fixos', () => {
  const com = (goleiros: string[]) => sessao(LISTA, { ...configPadrao, goleiros })

  it('com um só goleiro, ele fica com o time que venceu', () => {
    let s = comecar(com(['Zé']))
    expect(s.goleiros).toEqual({ A: 'Zé', B: null })
    s = vitoria(s, 'B')
    expect(s.goleiros).toEqual({ A: null, B: 'Zé' })
  })

  it('com dois goleiros, um em cada gol; quem perde deixa o goleiro para o time que entra', () => {
    let s = comecar(com(['Zé', 'Tião']))
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
    s = vitoria(s, 'B') // Time 1 perde; Zé fica no gol do Time 3
    expect(s.emCampo!.A.numero).toBe(3)
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
  })

  it('o vencedor pode trocar de goleiro', () => {
    let s = comecar(com(['Zé', 'Tião']))
    s = trocarGoleiros(s)
    expect(s.goleiros).toEqual({ A: 'Tião', B: 'Zé' })
  })

  it('goleiro reserva pode entrar num gol; escolher o do outro gol troca os dois', () => {
    let s = comecar(com(['Zé', 'Tião', 'Beto']))
    s = escolherGoleiro(s, 'A', 'Beto')
    expect(s.goleiros).toEqual({ A: 'Beto', B: 'Tião' })
    s = escolherGoleiro(s, 'A', 'Tião')
    expect(s.goleiros).toEqual({ A: 'Tião', B: 'Beto' })
  })

  it('cadastrar goleiro no meio da pelada preenche o gol vazio; remover libera', () => {
    let s = comecar(com(['Zé']))
    s = definirGoleiros(s, ['Zé', 'Tião'])
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
    s = definirGoleiros(s, ['Tião'])
    expect(s.goleiros).toEqual({ A: null, B: 'Tião' })
  })
})
