import { describe, expect, it } from 'vitest'
import { adicionarJogador, alterarLinha, comecar, novoJogador, removerJogador } from '..'
import { blocos, LISTA, nomes, sessao } from './utils'

describe('chegadas e saídas', () => {
  it('atrasado completa o time que está faltando gente', () => {
    let s = comecar(sessao(LISTA))
    s = adicionarJogador(s, novoJogador('Pedro'))
    expect(blocos(s)).toEqual([['Mano', 'Lucas', 'Pedro']])
  })

  it('quem vai embora de campo é substituído pelo primeiro da fila e a fila sobe', () => {
    const lista = 'ABCDEFGHIJKLMN'.split('')
    let s = comecar(sessao(lista))
    const e = s.emCampo!.B.jogadores[0]
    s = removerJogador(s, e.id)
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['I', 'F', 'G', 'H'])
    expect(blocos(s)).toEqual([['J', 'K', 'L', 'M'], ['N']])
  })

  it('quem vai embora da fila sai e a fila sobe', () => {
    let s = comecar(sessao(LISTA))
    s = removerJogador(s, s.fila[0].id)
    expect(blocos(s)).toEqual([['Lucas']])
  })

  it('mudar a linha no meio não mexe em quem está em campo', () => {
    let s = comecar(sessao([...LISTA, 'Pedro', 'Thiago']))
    s = alterarLinha(s, 3)
    expect(s.emCampo!.A.jogadores).toHaveLength(4)
    expect(blocos(s)).toEqual([['Mano', 'Lucas', 'Pedro'], ['Thiago']])
  })
})
