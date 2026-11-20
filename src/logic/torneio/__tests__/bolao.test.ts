import { describe, expect, it } from 'vitest'
import {
  cartaoNaPartida, encerrarPartida, golNaPartida, iniciarPartida, jogosDisponiveis, palpiteDoJogoFechado, palpiteDoTorneioFechado,
  placarDoPalpite, pontosDoJogo, pontosDoTorneio, preferenciasDoBolao, rankingDoBolao, respostasDoTorneio, situacaoDoJogo, timesDoJogo,
  type PalpiteDoJogo, type SituacaoDoJogo,
} from '..'
import type { Gol, Cartao } from '../../../types/pelada'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

// Bolão: palpites só por pontos (PLANO.md, seção 23).
const gol = (autorId: string, contra = false): Gol => ({ lado: 'A', autorId, autor: autorId, goleiroSofreu: null, contra })
const cartao = (jogadorId: string, cor: Cartao['cor']): Cartao => ({ lado: 'B', jogadorId, nome: jogadorId, cor, tempoMs: 0 })
const palpite = (dados: Partial<PalpiteDoJogo>): PalpiteDoJogo => ({ placar: [0, 0], gols: [], cartoes: [], em: 0, ...dados })

describe('bolão: pontos de um jogo', () => {
  const fim: SituacaoDoJogo = {
    placar: [3, 1], encerrado: true,
    gols: [gol('daniel'), gol('daniel'), gol('lorran'), { ...gol('ze', true), lado: 'B' }],
    cartoes: [cartao('pedro', 'amarelo'), cartao('marcao', 'amarelo'), cartao('marcao', 'vermelho')],
  }

  it('placar exato +3, gols por jogador (+2 cada, até quantos ele fez) e cartões (+2; vermelho certo +4)', () => {
    const conta = pontosDoJogo(palpite({
      placar: [3, 1],
      gols: [{ lado: 'A', jogador: 'daniel' }, { lado: 'A', jogador: 'daniel' }, { lado: 'A', jogador: 'felipe' }, { lado: 'B', jogador: null }],
      cartoes: [{ lado: 'B', jogador: 'pedro', cor: 'amarelo' }, { lado: 'B', jogador: 'marcao', cor: 'vermelho' }],
    }), fim)
    expect(conta.placar).toBe(3)
    expect(conta.cravou).toBe(true)
    expect(conta.gols).toEqual([
      { jogador: 'daniel', palpite: 2, feitos: 2, pontos: 4 },
      { jogador: 'felipe', palpite: 1, feitos: 0, pontos: 0 },
    ])
    expect(conta.cartoes.map((item) => item.pontos)).toEqual([2, 4])
    expect(conta.total).toBe(3 + 4 + 2 + 4)
  })

  it('só o vencedor +1; errou o vencedor 0; gol contra não conta para quem fez; palpitou 2 e ele fez 1: +2', () => {
    expect(pontosDoJogo(palpite({ placar: [2, 0] }), fim).placar).toBe(1)
    expect(pontosDoJogo(palpite({ placar: [1, 1] }), fim).placar).toBe(0)
    expect(pontosDoJogo(palpite({ gols: [{ lado: 'B', jogador: 'ze' }] }), fim).gols[0].pontos).toBe(0)
    expect(pontosDoJogo(palpite({ gols: [{ lado: 'A', jogador: 'lorran' }, { lado: 'A', jogador: 'lorran' }] }), fim).gols[0].pontos).toBe(2)
    // vermelho palpitado em quem só levou amarelo: vale como cartão (+2)
    expect(pontosDoJogo(palpite({ cartoes: [{ lado: 'B', jogador: 'pedro', cor: 'vermelho' }] }), fim).cartoes[0]).toMatchObject({ levou: 'amarelo', pontos: 2 })
  })

  it('jogo em andamento: gols e cartões já contam, o placar só no fim', () => {
    const conta = pontosDoJogo(palpite({ placar: [3, 1], gols: [{ lado: 'A', jogador: 'daniel' }] }), { ...fim, encerrado: false, placar: [2, 1] })
    expect(conta.placar).toBeNull()
    expect(conta.cravou).toBe(false)
    expect(conta.total).toBe(2)
  })

  it('o placar do palpite é a soma dos gols, com e sem jogador', () => {
    expect(placarDoPalpite([{ lado: 'A', jogador: 'x' }, { lado: 'A', jogador: null }, { lado: 'B', jogador: 'y' }])).toEqual([2, 1])
  })

  it('preferências: % de quem palpitou gol ou cartão em cada jogador (cada pessoa conta uma vez)', () => {
    const lista = [
      palpite({ gols: [{ lado: 'A', jogador: 'daniel' }, { lado: 'A', jogador: 'daniel' }], cartoes: [{ lado: 'B', jogador: 'marcao', cor: 'amarelo' }] }),
      palpite({ gols: [{ lado: 'A', jogador: 'felipe' }] }),
      palpite({ gols: [{ lado: 'A', jogador: 'daniel' }, { lado: 'A', jogador: null }] }),
      palpite({}),
    ]
    expect(preferenciasDoBolao(lista)).toEqual({ gols: { daniel: 50, felipe: 25 }, cartoes: { marcao: 25 } })
    expect(preferenciasDoBolao([])).toEqual({ gols: {}, cartoes: {} })
  })
})

describe('bolão no torneio', () => {
  /** Joga o próximo jogo: `acoes` recebe os times de cada lado. */
  type Time = Torneio['times'][number]
  const jogar = (torneio: Torneio, acoes: (t: Torneio, A: Time, B: Time, jogoId: string) => Torneio, encerrar = true) => {
    const jogo = jogosDisponiveis(torneio)[0]
    let t = iniciarPartida(torneio, jogo.id)
    const ids = timesDoJogo(t, jogo)
    const time = (lado: 'A' | 'B') => t.times.find((item) => item.id === ids[lado])!
    t = acoes(t, time('A'), time('B'), jogo.id)
    return { torneio: encerrar ? encerrarPartida(t, jogo.id) : t, jogoId: jogo.id, A: time('A'), B: time('B') }
  }

  it('palpites fecham quando o jogo começa (o do torneio, no 1º jogo)', () => {
    const inicio = sorteado(torneioCom(3, 'pontos'))
    const primeiro = jogosDisponiveis(inicio)[0].id
    expect(palpiteDoTorneioFechado(inicio)).toBe(false)
    expect(palpiteDoJogoFechado(inicio, primeiro)).toBe(false)
    const comecou = iniciarPartida(inicio, primeiro)
    expect(palpiteDoTorneioFechado(comecou)).toBe(true)
    expect(palpiteDoJogoFechado(comecou, primeiro)).toBe(true)
    expect(situacaoDoJogo(comecou, primeiro)).toMatchObject({ placar: [0, 0], encerrado: false })
  })

  it('respostas e ranking: campeão, artilheiro e quem levou mais cartões; empate pelos placares cravados', () => {
    let t = sorteado(torneioCom(2, 'pontos'))
    expect(respostasDoTorneio(t)).toBeNull()
    const jogo = jogar(t, (x, A, B, id) => cartaoNaPartida(golNaPartida(golNaPartida(x, id, 'A', A.jogadores[1]), id, 'A', A.jogadores[1]), id, 'B', B.jogadores[2], 'amarelo', 0))
    t = jogo.torneio
    const respostas = respostasDoTorneio(t)!
    expect(respostas).toMatchObject({ campeao: jogo.A.id, vice: jogo.B.id, artilheiros: [jogo.A.jogadores[1].id], maisCartoes: [jogo.B.jogadores[2].id], garcons: [] })

    const certeiro = { campeao: jogo.A.id, vice: jogo.B.id, artilheiro: jogo.A.jogadores[1].id, garcom: null, maisCartoes: null, em: 0 }
    expect(pontosDoTorneio(certeiro, respostas)).toMatchObject({ campeao: 10, vice: 5, artilheiro: 8, garcom: 0, total: 23 })
    expect(pontosDoTorneio(undefined, respostas).total).toBe(0)

    const participantes = ['Ana', 'Beto', 'Caio', 'Duda', 'Edu', 'Fabi'].map((nome, indice) => ({ uid: nome.toLowerCase(), nome, em: indice }))
    const errado = { ...certeiro, campeao: jogo.B.id, vice: null, artilheiro: null }
    const palpites = {
      [jogo.jogoId]: {
        ana: palpite({ placar: [2, 0] }), // cravou: 3
        beto: palpite({ placar: [1, 0], gols: [{ lado: 'A', jogador: jogo.A.jogadores[1].id }] }), // vencedor 1 + gol 2 = 3
        duda: palpite({ placar: [2, 0] }), // cravou: 3, igual à Ana em tudo
        edu: palpite({ placar: [3, 0] }), // vencedor 1 (+ campeão 10 = 11)
        fabi: palpite({ placar: [0, 1], gols: [{ lado: 'A', jogador: jogo.A.jogadores[1].id }, { lado: 'A', jogador: jogo.A.jogadores[1].id }] }), // gols 4 (+ 0)
      },
    }
    const doTorneio = { caio: { ...certeiro }, edu: { ...certeiro, vice: null, artilheiro: null }, fabi: errado, ana: errado }
    const ranking = rankingDoBolao(t, participantes, doTorneio, palpites)
    expect(ranking.map((linha) => [linha.nome, linha.posicao, linha.pontos])).toEqual([
      ['Caio', 1, 23], ['Edu', 2, 11], ['Fabi', 3, 4], ['Ana', 4, 3], ['Duda', 4, 3], ['Beto', 6, 3],
    ])
    // Ana e Duda: mesmos pontos, cravados, campeão, gols e vencedores → dividem o 4º; Beto (sem cravar) fica atrás
    expect(ranking.find((linha) => linha.nome === 'Beto')).toMatchObject({ cravados: 0, gols: 1, vencedores: 1 })
  })
})
