import { describe, expect, it } from 'vitest'
import {
  aplicarOperacoes, diferencas, encerrarPartida, golNaPartida, iniciarPartida, jogosParaComecar, juntar, novoCodigo,
  separar, situacaoDisciplinar, cartaoNaPartida, timesDoJogo, type DadosNuvem,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

const vazio: DadosNuvem = { base: null, partidas: [], resultados: {} }
/** Simula um celular: aplica a ação e manda as diferenças para a "nuvem". */
const celular = (nuvem: DadosNuvem, fn: (t: Torneio) => Torneio) => {
  const antes = juntar(nuvem)!
  return aplicarOperacoes(nuvem, diferencas(antes, fn(antes)))
}

describe('sincronização do torneio', () => {
  it('separar e juntar devolvem o mesmo torneio', () => {
    let t = sorteado(torneioCom(4, 'pontos', { campos: 2 }))
    const [j1] = jogosParaComecar(t)
    t = iniciarPartida(t, j1.id)
    t = golNaPartida(t, j1.id, 'A', null)
    t = encerrarPartida(t, j1.id, null, 1000)
    const [j2] = jogosParaComecar(t)
    t = iniciarPartida(t, j2.id)
    expect(juntar(separar(t))).toEqual(t)
  })

  it('gol só grava o jogo em andamento; encerrar grava o resultado e tira o jogo', () => {
    let t = sorteado(torneioCom(4, 'pontos'))
    const [j] = jogosParaComecar(t)
    t = iniciarPartida(t, j.id)
    const comGol = golNaPartida(t, j.id, 'A', null)
    expect(diferencas(t, comGol).map((o) => o.tipo)).toEqual(['partida'])
    const encerrado = encerrarPartida(comGol, j.id, null, 5)
    expect(diferencas(comGol, encerrado).map((o) => o.tipo).sort()).toEqual(['apagarPartida', 'resultado'])
  })

  it('dois mesários marcando ao mesmo tempo não apagam o jogo um do outro', () => {
    // começa do torneio sorteado gravado pelo organizador
    const org = sorteado(torneioCom(4, 'pontos', { campos: 2 }))
    let nuvem: DadosNuvem = { ...vazio, base: separar(org).base }
    const [j1, j2] = jogosParaComecar(org)
    nuvem = celular(nuvem, (t) => iniciarPartida(t, j1.id)) // mesário do campo 1
    nuvem = celular(nuvem, (t) => iniciarPartida(t, j2.id)) // mesário do campo 2
    // os dois leram a mesma versão e cada um marca um gol no seu jogo
    const visto = juntar(nuvem)!
    const opsCampo1 = diferencas(visto, golNaPartida(visto, j1.id, 'A', null))
    const opsCampo2 = diferencas(visto, golNaPartida(golNaPartida(visto, j2.id, 'B', null), j2.id, 'B', null))
    nuvem = aplicarOperacoes(aplicarOperacoes(nuvem, opsCampo1), opsCampo2)
    const final = juntar(nuvem)!
    expect(final.emAndamento.find((p) => p.jogoId === j1.id)!.placar).toEqual([1, 0])
    expect(final.emAndamento.find((p) => p.jogoId === j2.id)!.placar).toEqual([0, 2])
  })

  it('a ordem dos jogos (para suspensões) vem da hora em que acabaram, de qualquer celular', () => {
    const org = sorteado(torneioCom(4, 'pontos', { campos: 2 }))
    let nuvem: DadosNuvem = { base: separar(org).base, partidas: [], resultados: {} }
    const [j1, j2] = jogosParaComecar(org)
    nuvem = celular(nuvem, (t) => iniciarPartida(t, j1.id))
    nuvem = celular(nuvem, (t) => iniciarPartida(t, j2.id))
    const time = (t: Torneio, jogoId: string) => t.times.find((x) => x.id === timesDoJogo(t, t.jogos.find((j) => j.id === jogoId)!).A)!
    // campo 2 acaba primeiro (hora 100), campo 1 depois (hora 200)
    nuvem = celular(nuvem, (t) => encerrarPartida(t, j2.id, null, 100))
    nuvem = celular(nuvem, (t) => encerrarPartida(cartaoNaPartida(t, j1.id, 'A', time(t, j1.id).jogadores[0], 'vermelho', 0), j1.id, null, 200))
    const t = juntar(nuvem)!
    expect(t.jogos.find((j) => j.id === j2.id)!.resultado!.sequencia).toBe(1)
    expect(t.jogos.find((j) => j.id === j1.id)!.resultado!.sequencia).toBe(2)
    expect(situacaoDisciplinar(t).suspensos.size).toBe(1)
  })

  it('código de 6 caracteres fáceis de ditar', () => {
    const c = novoCodigo()
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
  })
})
