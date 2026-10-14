import { describe, expect, it } from 'vitest'
import { artilharia, buscarGoleiro, comecar, gol, jogadorGoleiro } from '..'
import { sessao } from './utils'

const emJogo = () => comecar(sessao(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'JOÃO PEDRO']))

describe('gol do goleiro', () => {
  it('o mesmo nome soma os gols e conta como jogo a partida', () => {
    let e = emJogo()
    e = gol(e, 'A', jogadorGoleiro('ZÉ'))
    e = gol(e, 'A', jogadorGoleiro(' zé '))
    const [a] = artilharia(e)
    expect(a).toMatchObject({ nome: 'ZÉ', gols: 2, jogos: 1 })
  })

  it('busca entre os goleiros de gols anteriores, a lista e a turma', () => {
    let e = emJogo()
    e = gol(e, 'B', jogadorGoleiro('ZECA'))
    expect(buscarGoleiro(e, [], '')).toEqual([{ id: 'goleiro:zeca', nome: 'ZECA' }])
    const turma = [{ id: 't1', nome: 'PEDRO' }, { id: 't2', nome: 'ZÉ' }, { id: 't3', nome: 'ZILDA', arquivado: true }]
    expect(buscarGoleiro(e, turma, 'ze').map((x) => x.nome)).toEqual(['ZECA', 'ZÉ'])
    expect(buscarGoleiro(e, turma, 'ped').map((x) => x.nome)).toEqual(['PEDRO', 'JOÃO PEDRO'])
  })
})
