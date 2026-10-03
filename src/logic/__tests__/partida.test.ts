import { describe, expect, it } from 'vitest'
import { comecar, configPadrao, vitoria } from '..'
import { blocos, LISTA, nomes, sessao } from './utils'

describe('quem perde', () => {
  it('completa o time incompleto e o resto forma um novo time (exemplo do papel)', () => {
    let s = comecar(sessao(LISTA))
    s = vitoria(s, 'B') // Time 1 perde
    expect(s.emCampo!.B.numero).toBe(2)
    expect(s.emCampo!.A.numero).toBe(3)
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['Mano', 'Lucas', 'João', 'Carlos'])
    expect(blocos(s)).toEqual([['Bruno', 'Marcos']])
  })

  it('cascata com time incompleto na frente de um completo', () => {
    const lista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
    let s = comecar(sessao(lista))
    s = vitoria(s, 'B') // Time 1 perde, Time 3 entra
    expect(blocos(s)).toEqual([['M', 'N', 'A', 'B'], ['C', 'D']])
  })

  it('se todos de fora estão completos, o perdedor vira um time novo inteiro', () => {
    const lista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    let s = comecar(sessao(lista))
    s = vitoria(s, 'A')
    expect(blocos(s)).toEqual([['E', 'F', 'G', 'H']])
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['I', 'J', 'K', 'L'])
  })

  it('conta vitórias seguidas do vencedor', () => {
    let s = comecar(sessao(LISTA))
    s = vitoria(s, 'B')
    s = vitoria(s, 'B')
    expect(s.emCampo!.B.vitoriasSeguidas).toBe(2)
  })
})

describe('limite de vitórias', () => {
  it('ao atingir, sai só o vencedor', () => {
    let s = comecar(sessao(LISTA, { ...configPadrao, limiteVitorias: 2 }))
    s = vitoria(s, 'B') // Time 2: 1 vitória
    const time3 = s.emCampo!.A
    s = vitoria(s, 'B') // Time 2: 2 vitórias → sai
    expect(s.emCampo!.A.numero).toBe(time3.numero) // perdedor ficou
    // Time 2 foi para o fim da fila [Bruno, Marcos] e completou o próximo time
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['Bruno', 'Marcos', 'Rafael', 'Daniel'])
    expect(blocos(s)).toEqual([['Junior', 'Landim']])
    expect(s.historico.at(-1)!.sairam).toEqual([2])
  })
})
