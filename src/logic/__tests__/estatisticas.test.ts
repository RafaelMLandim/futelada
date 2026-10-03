import { describe, expect, it } from 'vitest'
import { artilharia, comecar, configPadrao, empate, gol, goleirosMenosVazados, vitoria } from '..'
import { LISTA, sessao } from './utils'

describe('artilharia', () => {
  it('conta os gols de cada jogador, inclusive da partida em andamento', () => {
    let s = comecar(sessao(LISTA))
    const [joao] = s.emCampo!.A.jogadores
    const [rafael] = s.emCampo!.B.jogadores
    s = gol(s, 'A', joao)
    s = gol(s, 'A', joao)
    s = vitoria(s, 'A')
    s = gol(s, 'A', joao)
    s = gol(s, 'B', rafael)
    s = gol(s, 'B') // sem autor: conta no placar, não na artilharia
    expect(s.placar).toEqual([1, 2])
    expect(artilharia(s).map((a) => [a.nome, a.gols])).toEqual([['João', 3], ['Rafael', 1]])
  })
})

describe('goleiro menos vazado', () => {
  it('cada gol conta contra o goleiro do outro gol; ordena pela média por jogo', () => {
    let s = comecar(sessao(LISTA, { ...configPadrao, goleiros: ['Zé', 'Tião'] }))
    s = gol(s, 'A') // Tião (gol B) sofre
    s = gol(s, 'A')
    s = vitoria(s, 'A') // Zé 0 em 1 jogo, Tião 2 em 1 jogo
    s = gol(s, 'B') // Zé sofre
    s = empate(s, 'A')
    const g = goleirosMenosVazados(s)
    expect(g.map((x) => [x.nome, x.jogos, x.sofridos])).toEqual([['Zé', 2, 1], ['Tião', 2, 2]])
  })

  it('sem goleiro fixo, ninguém aparece', () => {
    let s = comecar(sessao(LISTA))
    s = gol(s, 'A')
    s = vitoria(s, 'A')
    expect(goleirosMenosVazados(s)).toEqual([])
  })
})
