import { describe, expect, it } from 'vitest'
import {
  artilhariaDoTorneio, assistenciasDoTorneio, cartaoNaPartida, cartoesDoTorneio, encerrarPartida, golNaPartida, goleirosDoTorneio,
  iniciarPartida, jogosDisponiveis, passeNaPartida, regrasPadrao, timesDoJogo,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

/** Joga o próximo jogo aplicando `acoes` com os times de cada lado. */
type T = Torneio['times'][number]
function jogar(t: Torneio, acoes: (t: Torneio, A: T, B: T, jogoId: string) => Torneio) {
  const jogo = jogosDisponiveis(t)[0]
  t = iniciarPartida(t, jogo.id)
  const ids = timesDoJogo(t, jogo)
  const time = (l: 'A' | 'B') => t.times.find((x) => x.id === ids[l])!
  return encerrarPartida(acoes(t, time('A'), time('B'), jogo.id), jogo.id)
}

describe('estatísticas do torneio', () => {
  const base = () => {
    return sorteado(torneioCom(4, 'pontos'))
  }

  it('artilharia soma os gols de todos os jogos, com o time de cada um', () => {
    let t = base()
    t = jogar(t, (x, A, _B, id) => golNaPartida(golNaPartida(x, id, 'A', A.jogadores[0]), id, 'A', A.jogadores[0]))
    t = jogar(t, (x, _A, B, id) => golNaPartida(x, id, 'B', B.jogadores[1]))
    const art = artilhariaDoTorneio(t)
    expect(art[0]).toMatchObject({ gols: 2 })
    expect(art).toHaveLength(2)
    expect(t.times.some((x) => x.id === art[0].time)).toBe(true)
  })

  it('assistências: passe guardado no gol e líderes do torneio (gol contra e sem passe não contam)', () => {
    expect(regrasPadrao.assistencias).toBe(false)
    let t = base()
    let passador = ''
    t = jogar(t, (x, A, B, id) => {
      passador = A.jogadores[1].id
      x = passeNaPartida(golNaPartida(x, id, 'A', A.jogadores[0]), id, 0, A.jogadores[1])
      x = passeNaPartida(golNaPartida(x, id, 'A', A.jogadores[2]), id, 1, A.jogadores[1])
      x = golNaPartida(x, id, 'B', B.jogadores[0]) // sem passe
      return passeNaPartida(golNaPartida(x, id, 'B', A.jogadores[0], undefined, true), id, 3, B.jogadores[1]) // gol contra
    })
    const lideres = assistenciasDoTorneio(t)
    expect(lideres).toHaveLength(1)
    expect(lideres[0]).toMatchObject({ id: passador, assistencias: 2 })
    expect(t.times.some((time) => time.id === lideres[0].time)).toBe(true)
  })

  it('assistências: passe trocado para ninguém some do gol', () => {
    let t = base()
    t = jogar(t, (x, A, _B, id) => passeNaPartida(passeNaPartida(golNaPartida(x, id, 'A', A.jogadores[0]), id, 0, A.jogadores[1]), id, 0, null))
    expect(assistenciasDoTorneio(t)).toEqual([])
    expect(t.jogos.find((jogo) => jogo.resultado)!.resultado!.gols[0].assistencia).toBeUndefined()
  })

  it('goleiro menos vazado pela média de gols sofridos', () => {
    let t = base()
    t = jogar(t, (x, _A, _B, id) => golNaPartida(golNaPartida(x, id, 'A', null), id, 'A', null)) // goleiro do B sofre 2
    const g = goleirosDoTorneio(t)
    expect(g.map((x) => [x.jogos, x.sofridos])).toEqual([[1, 0], [1, 2]])
  })

  it('cartões do torneio mostram os acumulados e quem está suspenso', () => {
    let t = base()
    let suspenso = ''
    let amarelado = ''
    t = jogar(t, (x, A, _B, id) => {
      suspenso = A.jogadores[0].id
      amarelado = A.jogadores[1].id
      return cartaoNaPartida(cartaoNaPartida(x, id, 'A', A.jogadores[0], 'vermelho', 0), id, 'A', A.jogadores[1], 'amarelo', 0)
    })
    const c = cartoesDoTorneio(t)
    expect(c[0]).toMatchObject({ id: suspenso, vermelhos: 1, suspenso: true })
    expect(c[1]).toMatchObject({ id: amarelado, amarelos: 1, acumulados: 1, suspenso: false })
  })
})
