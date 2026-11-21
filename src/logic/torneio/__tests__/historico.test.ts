import { describe, expect, it } from 'vitest'
import {
  encerrarPartida, euNoTorneio, golNaPartida, iniciarPartida, jogosDisponiveis, numerosDoHistorico, timesDoJogo, torneioParaOHistorico,
  type LinhaDoRanking,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { resultado, sorteado, torneioCom } from './utils'

// Histórico de torneios (PLANO.md, seção 24).
function torneioJogado(): { torneio: Torneio; campeao: string; vice: string; artilheiro: string } {
  let torneio = sorteado(torneioCom(2, 'pontos'))
  const [timeA, timeB] = torneio.times
  const artilheiro = timeA.jogadores[1].id
  torneio = {
    ...torneio,
    nuvem: { codigo: 'ABC123', organizador: 'conta-org' },
    times: torneio.times.map((time) => ({
      ...time,
      jogadores: time.jogadores.map((jogador) => (jogador.id === artilheiro ? { ...jogador, conta: 'conta-art', camisa: 10 } : jogador)),
    })),
  }
  const jogo = torneio.jogos[0]
  const ladoDoA = timesDoJogo(torneio, jogo).A === timeA.id ? 'A' : 'B'
  const jogaram = { A: [] as string[], B: [] as string[] }
  jogaram[ladoDoA] = timeA.jogadores.slice(0, 5).map((jogador) => jogador.id)
  const gol = { lado: ladoDoA, autorId: artilheiro, autor: 'ART', goleiroSofreu: null } as const
  torneio = {
    ...torneio,
    jogos: torneio.jogos.map((item) => (item.id === jogo.id ? {
      ...item,
      resultado: resultado(ladoDoA === 'A' ? 2 : 0, ladoDoA === 'A' ? 0 : 2, {
        jogaram, gols: [gol, gol], encerradoEm: 1_700_000_000_000,
        cartoes: [{ lado: ladoDoA, jogadorId: artilheiro, nome: 'ART', cor: 'amarelo', tempoMs: 0 }],
      }),
    } : item)),
  }
  return { torneio, campeao: timeA.id, vice: timeB.id, artilheiro }
}

const linha = (uid: string, nome: string, posicao: number, pontos: number): LinhaDoRanking =>
  ({ uid, nome, posicao, pontos, cravados: 1, campeao: 1, gols: 0, vencedores: 1, em: 0 })

describe('histórico de torneios', () => {
  it('sem campeão não vai para o histórico', () => {
    expect(torneioParaOHistorico(sorteado(torneioCom(2, 'pontos')))).toBeNull()
  })

  it('guarda o pódio, os destaques, os jogos, quem jogou com conta e o bolão', () => {
    const { torneio, campeao, vice } = torneioJogado()
    const encerrado = torneioParaOHistorico(torneio, [linha('conta-bolao', 'Fabi', 1, 30), linha('conta-art', 'Art', 2, 12)])!
    expect(encerrado).toMatchObject({ nome: 'Copa', data: 1_700_000_000_000, organizador: 'conta-org', podio: [campeao, vice], final: null })
    expect(encerrado.artilheiro).toEqual({ nome: 'ART', time: campeao, valor: 2 })
    expect(encerrado.cartoes).toMatchObject({ nome: 'ART', valor: 1, segundo: 0 })
    expect(encerrado.jogos).toHaveLength(1)
    expect(encerrado.jogadores['conta-art']).toEqual({ time: campeao, camisa: 10, jogos: 1, gols: 2, assistencias: 0, amarelos: 1, vermelhos: 0 })
    expect(encerrado.bolao).toMatchObject({ participantes: 2, primeiros: [{ nome: 'Fabi', posicao: 1, pontos: 30 }, { nome: 'Art', posicao: 2, pontos: 12 }] })
    // o Firestore não aceita undefined
    expect(JSON.stringify(encerrado)).not.toContain('undefined')
  })

  it('o que cada um fez: jogou e foi campeão, organizou, só palpitou', () => {
    const { torneio, campeao } = torneioJogado()
    const encerrado = torneioParaOHistorico(torneio, [linha('conta-bolao', 'Fabi', 1, 30)])!
    expect(euNoTorneio(encerrado, 'conta-art')).toMatchObject({ organizou: false, colocacao: 'campeao', time: { id: campeao }, jogador: { gols: 2 } })
    expect(euNoTorneio(encerrado, 'conta-org')).toMatchObject({ organizou: true, jogador: null, colocacao: null })
    expect(euNoTorneio(encerrado, 'conta-bolao')).toMatchObject({ organizou: false, bolao: { posicao: 1, pontos: 30 } })
    expect(numerosDoHistorico([encerrado, encerrado], 'conta-art')).toEqual({ torneios: 2, titulos: 2, gols: 4, melhorBolao: null })
    expect(numerosDoHistorico([encerrado], 'conta-bolao').melhorBolao).toBe(1)
  })

  it('mata-mata: pódio com a disputa de 3º e a final do ponto de vista do campeão', () => {
    let torneio = sorteado(torneioCom(4, 'mata-mata', { terceiroLugar: true }))
    let final: { casa: string; fora: string } | null = null
    while (jogosDisponiveis(torneio).length) {
      const jogo = jogosDisponiveis(torneio)[0]
      torneio = iniciarPartida(torneio, jogo.id)
      const times = timesDoJogo(torneio, jogo)
      // o time de fora sempre ganha 1 a 0
      const time = torneio.times.find((item) => item.id === times.B)!
      torneio = encerrarPartida(golNaPartida(torneio, jogo.id, 'B', time.jogadores[1]), jogo.id)
      if (jogo.rodada === 'Final') final = { casa: times.A!, fora: times.B! }
    }
    const encerrado = torneioParaOHistorico(torneio)!
    expect(encerrado.podio).toHaveLength(3)
    expect(encerrado.podio.slice(0, 2)).toEqual([final!.fora, final!.casa])
    expect(encerrado.final).toEqual({ placar: [1, 0], penaltis: null })
  })
})
