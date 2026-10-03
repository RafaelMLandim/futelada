import { describe, expect, it } from 'vitest'
import { cartoesDoDia, comecar, darCartao, expulso, restanteAzul, vitoria } from '..'
import { LISTA, sessao } from './utils'

describe('cartões', () => {
  it('vermelho expulsa só da partida; na próxima ele volta normal', () => {
    let s = comecar(sessao(LISTA))
    const joao = s.emCampo!.A.jogadores[0]
    s = darCartao(s, 'A', joao, 'vermelho', 0)
    expect(expulso(s, joao.id)).toBe(true)
    s = vitoria(s, 'B') // Time 1 perde; João vai para a fila e depois entra
    expect(expulso(s, joao.id)).toBe(false)
  })

  it('segundo amarelo na mesma partida vira vermelho', () => {
    let s = comecar(sessao(LISTA))
    const joao = s.emCampo!.A.jogadores[0]
    s = darCartao(s, 'A', joao, 'amarelo', 0)
    expect(expulso(s, joao.id)).toBe(false)
    s = darCartao(s, 'A', joao, 'amarelo', 1000)
    expect(expulso(s, joao.id)).toBe(true)
    expect(s.cartoes.at(-1)).toMatchObject({ cor: 'vermelho', porDoisAmarelos: true })
  })

  it('azul deixa o jogador fora pelo tempo configurado (padrão 2 min)', () => {
    let s = comecar(sessao(LISTA))
    const rafael = s.emCampo!.B.jogadores[0]
    s = darCartao(s, 'B', rafael, 'azul', 60_000)
    expect(restanteAzul(s, rafael.id, 60_000)).toBe(120_000)
    expect(restanteAzul(s, rafael.id, 150_000)).toBe(30_000)
    expect(restanteAzul(s, rafael.id, 200_000)).toBe(0)
  })

  it('soma os cartões do dia por jogador', () => {
    let s = comecar(sessao(LISTA))
    const joao = s.emCampo!.A.jogadores[0]
    s = darCartao(s, 'A', joao, 'amarelo', 0)
    s = darCartao(s, 'A', joao, 'amarelo', 0)
    s = vitoria(s, 'A')
    s = darCartao(s, 'A', joao, 'azul', 0)
    expect(cartoesDoDia(s)).toEqual([{ id: joao.id, nome: 'João', amarelo: 2, vermelho: 1, azul: 1 }])
  })
})
