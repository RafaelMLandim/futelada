import { describe, expect, it } from 'vitest'
import {
  comecarIntervalo, comecarProrrogacao, decorridoNoPeriodo, encerrarPartida, golNaPartida, iniciarPartida, nomeDoPeriodo,
  partidaDoJogo, precisaDePenaltis, proximoTempo, registrarResultado, ultimoPeriodo, vaiParaProrrogacao,
} from '..'
import type { RegrasTorneio, Torneio } from '../../../types/torneio'
import { resultado, sorteado, torneioCom } from './utils'

// Tempos regulamentares, intervalo e prorrogação (PLANO.md, seção 9.5).

const MIN = 60_000
const jogo = (t: Torneio, id: string) => t.jogos.find((j) => j.id === id)!
const partida = (t: Torneio, id: string) => partidaDoJogo(t, id)!

/** Simula o relógio correndo `min` minutos (e parado no fim). */
function correr(t: Torneio, id: string, min: number): Torneio {
  return {
    ...t,
    emAndamento: t.emAndamento.map((p) => (p.jogoId === id
      ? { ...p, crono: { ...p.crono, rodando: false, inicio: 0, acumulado: p.crono.acumulado + min * MIN } }
      : p)),
  }
}

/** Mata-mata de 2 times (uma final) já com o jogo em andamento. */
function final(regras: Partial<RegrasTorneio>) {
  const t = sorteado(torneioCom(2, 'mata-mata', regras))
  const id = t.jogos[0].id
  return { t: iniciarPartida(t, id), id }
}

describe('tempos regulamentares e intervalo', () => {
  it('2 tempos de 10 min com intervalo: cada tempo conta do zero e o gol guarda em que tempo saiu', () => {
    let { t, id } = final({ tempos: 2, tempoMin: 10, intervaloMin: 5 })
    expect(nomeDoPeriodo(t.regras, partida(t, id))).toBe('1º tempo')
    t = correr(t, id, 10)
    expect(decorridoNoPeriodo(partida(t, id))).toBe(10 * MIN)
    expect(ultimoPeriodo(t.regras, partida(t, id))).toBe(false)

    t = comecarIntervalo(t, id, 1000)
    expect(partida(t, id).intervaloAte).toBe(1000 + 5 * MIN)
    expect(partida(t, id).crono.rodando).toBe(false)

    t = proximoTempo(t, id, 2000)
    const p = partida(t, id)
    expect([p.periodo, p.intervaloAte, decorridoNoPeriodo(p)]).toEqual([2, null, 0])
    expect(nomeDoPeriodo(t.regras, p)).toBe('2º tempo')
    expect(ultimoPeriodo(t.regras, p)).toBe(true)

    t = correr(t, id, 3)
    expect(decorridoNoPeriodo(partida(t, id))).toBe(3 * MIN) // o 2º tempo conta do zero
    t = golNaPartida(t, id, 'A', null, 2 * MIN)
    expect(partida(t, id).gols[0]).toMatchObject({ periodo: '2ºT', tempoMs: 2 * MIN, duracaoMin: 10 })
    expect(() => proximoTempo(t, id)).toThrow('último')
  })

  it('um tempo só (padrão): sem nome de tempo e o gol não marca período', () => {
    let { t, id } = final({})
    expect(nomeDoPeriodo(t.regras, partida(t, id))).toBe('')
    t = golNaPartida(t, id, 'A', null, MIN)
    expect(partida(t, id).gols[0].periodo).toBeUndefined()
  })
})

describe('prorrogação no mata-mata', () => {
  it('jogo único empatado + prorrogação ligada → prorrogação; empatou de novo → pênaltis', () => {
    let { t, id } = final({ prorrogacao: true, temposProrrogacao: 2, minutosProrrogacao: 5 })
    t = golNaPartida(t, id, 'A', null, MIN)
    t = golNaPartida(t, id, 'B', null, 2 * MIN)
    expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(true)

    t = comecarProrrogacao(t, id)
    const p = partida(t, id)
    expect([p.prorrogacao, p.periodo]).toEqual([true, 1])
    expect(nomeDoPeriodo(t.regras, p)).toBe('1º tempo da prorrogação')
    expect(vaiParaProrrogacao(t, jogo(t, id), p)).toBe(false) // só uma prorrogação
    t = proximoTempo(t, id)
    expect(nomeDoPeriodo(t.regras, partida(t, id))).toBe('2º tempo da prorrogação')
    // gol na prorrogação: rótulo e duração do tempo da prorrogação
    t = golNaPartida(t, id, 'A', null, 4 * MIN)
    t = golNaPartida(t, id, 'B', null, 5 * MIN)
    expect(partida(t, id).gols[2]).toMatchObject({ periodo: 'Pror. 2ºT', duracaoMin: 5 })
    // empatou também na prorrogação: pênaltis
    expect(precisaDePenaltis(t, jogo(t, id), partida(t, id).placar)).toBe(true)
    expect(() => encerrarPartida(t, id)).toThrow('pênaltis')
    expect(encerrarPartida(t, id, [3, 2]).jogos[0].resultado!.penaltis).toEqual([3, 2])
  })

  it('prorrogação desligada: empate vai direto para os pênaltis', () => {
    const { t, id } = final({ prorrogacao: false })
    expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(false)
    expect(precisaDePenaltis(t, jogo(t, id), [0, 0])).toBe(true)
    expect(() => comecarProrrogacao(t, id)).toThrow('prorrogação')
  })

  it('com vencedor no tempo normal não tem prorrogação', () => {
    let { t, id } = final({ prorrogacao: true })
    t = golNaPartida(t, id, 'A', null, MIN)
    expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(false)
  })

  it('fase de grupos/pontos nunca tem prorrogação', () => {
    let t = sorteado(torneioCom(4, 'pontos', { prorrogacao: true }))
    const id = t.jogos[0].id
    t = iniciarPartida(t, id)
    expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(false)
  })
})

describe('prorrogação em ida e volta', () => {
  it('a ida empatada termina normal (sem prorrogação nem pênaltis); a volta usa o agregado', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, prorrogacao: true }))
    t = iniciarPartida(t, 'm1')
    expect(vaiParaProrrogacao(t, jogo(t, 'm1'), partida(t, 'm1'))).toBe(false) // ida 0 x 0
    t = encerrarPartida(t, 'm1')
    expect(jogo(t, 'm1').resultado!.placar).toEqual([0, 0])

    // ida 2 x 1 (registrada direto), volta 1 x 0 para o time de fora da ida → agregado 2 x 2
    t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, prorrogacao: true }))
    t = registrarResultado(t, 'm1', resultado(2, 1))
    t = iniciarPartida(t, 'm3')
    t = golNaPartida(t, 'm3', 'A', null, MIN) // lado A da volta é o de fora da ida
    expect(vaiParaProrrogacao(t, jogo(t, 'm3'), partida(t, 'm3'))).toBe(true)
    // gol na volta que desempata o agregado: sem prorrogação (não existe gol fora de casa)
    const desempatou = golNaPartida(t, 'm3', 'A', null, 2 * MIN)
    expect(vaiParaProrrogacao(desempatou, jogo(desempatou, 'm3'), partida(desempatou, 'm3'))).toBe(false)

    // prorrogação da volta empatada no agregado → pênaltis
    t = comecarProrrogacao(t, 'm3')
    expect(precisaDePenaltis(t, jogo(t, 'm3'), partida(t, 'm3').placar)).toBe(true)
  })
})
