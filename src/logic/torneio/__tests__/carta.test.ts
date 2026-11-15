import { describe, expect, it } from 'vitest'
import { resumoDoTorneioParaAsCartas, timesDoJogo } from '..'
import { conquistasDosTorneios, nivelDoTorneio, notaDaCarta, notaDoTorneio, numerosDosTorneios, type TorneioDaCarta } from '../../carta'
import type { Torneio } from '../../../types/torneio'
import type { Lado } from '../../../types/pelada'
import { resultado, sorteado, torneioCom } from './utils'

/** 2 times (1 jogo); o artilheiro do time A e o goleiro do time B têm conta. */
function torneioComContas(): { torneio: Torneio; artilheiro: string; goleiroB: string; ladoDoA: 'A' | 'B' } {
  let torneio = sorteado(torneioCom(2, 'pontos'))
  const [timeA, timeB] = torneio.times
  const artilheiro = timeA.jogadores[1].id
  const goleiroB = timeB.jogadores[0].id // o primeiro é o goleiro
  torneio = {
    ...torneio,
    times: torneio.times.map((time) => ({
      ...time,
      jogadores: time.jogadores.map((jogador) => (jogador.id === artilheiro ? { ...jogador, conta: 'conta-art' } : jogador.id === goleiroB ? { ...jogador, conta: 'conta-gol' } : jogador)),
    })),
  }
  const jogo = torneio.jogos[0]
  const ladoDoA: Lado = timesDoJogo(torneio, jogo).A === timeA.id ? 'A' : 'B'
  const ladoDoB: Lado = ladoDoA === 'A' ? 'B' : 'A'
  const jogaram = { [ladoDoA]: timeA.jogadores.slice(0, 5).map((jogador) => jogador.id), [ladoDoB]: timeB.jogadores.slice(0, 5).map((jogador) => jogador.id) } as Record<'A' | 'B', string[]>
  const placar: [number, number] = ladoDoA === 'A' ? [2, 0] : [0, 2]
  const gol = { lado: ladoDoA, autorId: artilheiro, autor: 'ART', goleiroSofreu: timeB.jogadores[0].nome }
  torneio = {
    ...torneio,
    jogos: torneio.jogos.map((item) => (item.id === jogo.id ? {
      ...item,
      resultado: resultado(placar[0], placar[1], {
        jogaram, gols: [gol, gol], cartoes: [{ lado: ladoDoA, jogadorId: artilheiro, nome: 'ART', cor: 'amarelo', tempoMs: 0 }],
        goleiros: { A: null, B: null }, noGol: { [ladoDoA]: timeA.jogadores[0].id, [ladoDoB]: goleiroB } as Record<'A' | 'B', string>,
        titulares: jogaram,
      }),
    } : item)),
  }
  return { torneio, artilheiro, goleiroB, ladoDoA }
}

describe('carta do torneio', () => {
  it('soma os números de quem tem conta e dá os prêmios no fim do torneio', () => {
    const { torneio } = torneioComContas()
    const resumos = resumoDoTorneioParaAsCartas(torneio)
    const artilheiro = resumos.find((resumo) => resumo.conta === 'conta-art')!
    expect(artilheiro).toMatchObject({ jogos: 1, vitorias: 1, gols: 2, amarelos: 1, campeao: true, vice: false, artilheiro: true })
    const goleiro = resumos.find((resumo) => resumo.conta === 'conta-gol')!
    expect(goleiro).toMatchObject({ jogos: 1, vitorias: 0, gols: 0, jogosSemSofrer: 0, campeao: false, vice: true })
    // quem jogou só com o nome não aparece
    expect(resumos).toHaveLength(2)
  })

  it('sem o torneio acabar, não tem campeão nem prêmios', () => {
    const { torneio } = torneioComContas()
    const semFim = { ...torneio, jogos: [...torneio.jogos, { ...torneio.jogos[0], id: 'outro', resultado: null }] }
    const artilheiro = resumoDoTorneioParaAsCartas(semFim).find((resumo) => resumo.conta === 'conta-art')!
    expect(artilheiro).toMatchObject({ gols: 2, campeao: false, artilheiro: false })
  })

  it('a carta soma os torneios e conta as conquistas', () => {
    const torneio = (extra: Partial<TorneioDaCarta>): TorneioDaCarta => ({ id: 'T', nome: 'Copa', data: 1, jogos: 3, vitorias: 2, empates: 0, gols: 4, assistencias: 1, amarelos: 0, vermelhos: 0, ...extra })
    const lista = [torneio({ id: 'A', campeao: true, artilheiro: true }), torneio({ id: 'B', vice: true })]
    expect(numerosDosTorneios(lista)).toMatchObject({ peladas: 2, jogos: 6, gols: 8 })
    const conquistas = conquistasDosTorneios(lista)
    expect(conquistas.find((conquista) => conquista.id === 'campeao')!.nivel).toBe('bronze')
    expect(conquistas.find((conquista) => conquista.id === 'competidor')!.nivel).toBe('bronze')
    expect(conquistas.find((conquista) => conquista.id === 'garcom-do-torneio')!.nivel).toBeNull()
  })

  it('a cor da carta de cada torneio vem do desempenho nele', () => {
    const torneio = (extra: Partial<TorneioDaCarta>): TorneioDaCarta => ({ id: 'T', nome: 'Copa', data: 1, jogos: 3, vitorias: 2, empates: 0, gols: 4, assistencias: 1, amarelos: 0, vermelhos: 0, ...extra })
    expect(nivelDoTorneio(torneio({}))).toBe('bronze')
    expect(nivelDoTorneio(torneio({ vice: true }))).toBe('prata')
    expect(nivelDoTorneio(torneio({ garcom: true }))).toBe('prata')
    expect(nivelDoTorneio(torneio({ campeao: true }))).toBe('ouro')
    expect(nivelDoTorneio(torneio({ campeao: true, luvaDeOuro: true }))).toBe('diamante')
    expect(nivelDoTorneio(torneio({ campeao: true, artilheiro: true, garcom: true }))).toBe('lendaria')
  })

  it('o número da carta: na pelada, a porcentagem dos pontos (até 99); no torneio, o de cada cor', () => {
    const torneio = (extra: Partial<TorneioDaCarta>): TorneioDaCarta => ({ id: 'T', nome: 'Copa', data: 1, jogos: 3, vitorias: 2, empates: 0, gols: 4, assistencias: 1, amarelos: 0, vermelhos: 0, ...extra })
    expect(notaDoTorneio(torneio({}))).toBe(20)
    expect(notaDoTorneio(torneio({ vice: true, artilheiro: true }))).toBe(75)
    expect(notaDoTorneio(torneio({ campeao: true, luvaDeOuro: true }))).toBe(92)
    expect(notaDoTorneio(torneio({ campeao: true, artilheiro: true, garcom: true, luvaDeOuro: true }))).toBe(99)
    expect(notaDaCarta(conquistasDosTorneios([]))).toBe(0)
    const ouro = { id: 'x', nome: 'x', descricao: '', valor: 9, metas: [1, 2, 3] as [number, number, number], nivel: 'ouro' as const, proximaMeta: null }
    expect(notaDaCarta(Array.from({ length: 6 }, (_, i) => ({ ...ouro, id: `c${i}` })))).toBe(99)
  })

  it('o melhor jogador (escolhido pelo organizador) conta como prêmio', () => {
    const torneio = (extra: Partial<TorneioDaCarta>): TorneioDaCarta => ({ id: 'T', nome: 'Copa', data: 1, jogos: 3, vitorias: 2, empates: 0, gols: 4, assistencias: 1, amarelos: 0, vermelhos: 0, ...extra })
    expect(nivelDoTorneio(torneio({ campeao: true, melhorJogador: true }))).toBe('diamante')
    expect(conquistasDosTorneios([torneio({ melhorJogador: true })]).find((conquista) => conquista.id === 'melhor-jogador')!.nivel).toBe('bronze')
  })
})
