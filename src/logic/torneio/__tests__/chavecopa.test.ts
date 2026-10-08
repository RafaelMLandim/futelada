import { describe, expect, it } from 'vitest'
import { chaveDosGrupos, jogosDisponiveis, nomeDaRodada, registrarResultado, resolverOrigem, timesDoJogo } from '..'
import type { JogoTorneio, Origem, Torneio } from '../../../types/torneio'
import { resultado, sorteado, torneioCom } from './utils'

// Chave em dois lados, como na Copa do Mundo (PLANO.md, seção 9.4.3).

const L = 'ABCDEFGH'
/** "1A", "2B", "melhor 1º A/C #1"… */
const rotulo = (o: Origem | null) => !o ? 'W.O.'
  : o.tipo === 'grupo' ? `${o.posicao}${L[o.grupo]}`
    : o.tipo === 'melhor' ? `${o.ordem}º melhor ${o.posicao}º ${o.grupos.map((g) => L[g]).join('/')}` : o.tipo
const pares = (pos: (Origem | null)[]) => {
  const r: string[] = []
  for (let i = 0; i < pos.length; i += 2) r.push(`${rotulo(pos[i])} x ${rotulo(pos[i + 1])}`)
  return r
}
/** Grupos de cada lado (metade de cima e de baixo), por posição. */
function gruposDoLado(pos: (Origem | null)[], lado: 0 | 1, posicao: number): number[] {
  const metade = pos.slice(lado * pos.length / 2, (lado + 1) * pos.length / 2)
  return metade.flatMap((o) => !o ? [] : o.tipo === 'grupo' && o.posicao === posicao ? [o.grupo] : o.tipo === 'melhor' && o.posicao === posicao && o.ordem === 1 ? o.grupos : [])
}

describe('chave da Copa: posições', () => {
  it('8 grupos, passam 2: igual à Copa do Mundo de 2022', () => {
    expect(pares(chaveDosGrupos(8, 2)!)).toEqual([
      '1A x 2B', '1C x 2D', '1E x 2F', '1G x 2H', // lado 1
      '1B x 2A', '1D x 2C', '1F x 2E', '1H x 2G', // lado 2
    ])
  })

  it('16 grupos, passam 2: 16 avos de final no mesmo padrão (1A x 2B… | 1B x 2A…)', () => {
    const p = pares(chaveDosGrupos(16, 2)!)
    expect(p).toHaveLength(16)
    expect(p.slice(0, 2)).toEqual(['1A x 2B', '1C x 2D'])
    expect(p.slice(8, 10)).toEqual(['1B x 2A', '1D x 2C'])
    expect(nomeDaRodada(32)).toBe('16 avos de final')
    expect(nomeDaRodada(64)).toBe('32 avos de final')
  })

  it('4 grupos, passam 2: quartas 1A x 2B, 1C x 2D | 1B x 2A, 1D x 2C', () => {
    expect(pares(chaveDosGrupos(4, 2)!)).toEqual(['1A x 2B', '1C x 2D', '1B x 2A', '1D x 2C'])
  })

  it('2 grupos, passam 2: semis 1A x 2B e 1B x 2A', () => {
    expect(pares(chaveDosGrupos(2, 2)!)).toEqual(['1A x 2B', '1B x 2A'])
  })

  for (const grupos of [2, 3, 4, 5, 6, 7, 8, 12, 16]) {
    it(`${grupos} grupos, passam 2: o 1º e o 2º do mesmo grupo ficam em lados opostos`, () => {
      const pos = chaveDosGrupos(grupos, 2)!
      expect(pos.length & (pos.length - 1)).toBe(0) // chave redonda (2, 4, 8, 16)
      expect(pos.filter(Boolean).length).toBe(grupos * 2) // todo classificado tem lugar
      for (const lado of [0, 1] as const) {
        const primeiros = gruposDoLado(pos, lado, 1)
        const segundos = gruposDoLado(pos, lado, 2)
        expect(primeiros.filter((g) => segundos.includes(g))).toEqual([])
      }
      // nunca um W.O. contra W.O.
      for (let i = 0; i < pos.length; i += 2) expect(pos[i] || pos[i + 1]).toBeTruthy()
    })
  }

  it('3 grupos, passam 2: em cada lado, o 1º de melhor campanha ganha o W.O.', () => {
    expect(pares(chaveDosGrupos(3, 2)!)).toEqual([
      '1º melhor 1º A/C x W.O.', '2º melhor 1º A/C x 1º melhor 2º B',
      '1º melhor 1º B x W.O.', '1º melhor 2º A/C x 2º melhor 2º A/C',
    ])
  })

  it('passa 1: 2 grupos é direto a final; 4 grupos 1A x 1B e 1C x 1D; 3 grupos o melhor campeão ganha o W.O.', () => {
    expect(pares(chaveDosGrupos(2, 1)!)).toEqual(['1A x 1B'])
    expect(pares(chaveDosGrupos(4, 1)!)).toEqual(['1A x 1B', '1C x 1D'])
    expect(pares(chaveDosGrupos(3, 1)!)).toEqual(['1º melhor 1º A/B/C x W.O.', '2º melhor 1º A/B/C x 3º melhor 1º A/B/C'])
  })

  it('3 ou mais passando por grupo: não se aplica (usa o cruzamento simples)', () => {
    expect(chaveDosGrupos(4, 3)).toBeNull()
  })
})

describe('chave da Copa: no torneio', () => {
  const nome = (t: Torneio, id: string | null) => t.times.find((x) => x.id === id)?.nome ?? null
  /** Joga a fase de grupos com o placar escolhido para cada jogo. */
  function jogarGrupos(t: Torneio, placar: (j: JogoTorneio, t: Torneio) => [number, number]): Torneio {
    for (const j of t.jogos.filter((x) => x.fase === 'grupo')) t = registrarResultado(t, j.id, resultado(...placar(j, t)))
    return t
  }

  it('4 grupos, passam 2: o mata-mata sai igual à Copa e só começa depois dos grupos', () => {
    let t = sorteado(torneioCom(16, 'grupos', { grupos: 4, classificamPorGrupo: 2 }))
    const mata = t.jogos.filter((j) => j.fase === 'mata')
    expect(mata.map((j) => j.rodada)).toEqual(['Quartas de final', 'Quartas de final', 'Quartas de final', 'Quartas de final', 'Semifinal', 'Semifinal', 'Final'])
    expect(jogosDisponiveis(t).every((j) => j.fase === 'grupo')).toBe(true)
    // casa sempre ganha 1 x 0
    t = jogarGrupos(t, () => [1, 0])
    const primeiro = (g: number) => resolverOrigem(t, { tipo: 'grupo', grupo: g, posicao: 1 })
    const segundo = (g: number) => resolverOrigem(t, { tipo: 'grupo', grupo: g, posicao: 2 })
    const q = mata.slice(0, 4).map((j) => timesDoJogo(t, j))
    expect(q[0]).toEqual({ A: primeiro(0), B: segundo(1) })
    expect(q[2]).toEqual({ A: primeiro(1), B: segundo(0) })
  })

  it('3 grupos, passa 1: o campeão de grupo com melhor campanha vai direto para a final (W.O.)', () => {
    let t = sorteado(torneioCom(9, 'grupos', { grupos: 3, classificamPorGrupo: 1 }))
    const mata = t.jogos.filter((j) => j.fase === 'mata')
    expect(mata.map((j) => j.rodada)).toEqual(['Semifinal', 'Final']) // 1 semi + final (o outro passa por W.O.)
    // Grupo B: o 1º ganha os 2 jogos por 5 x 0 (melhor campanha); nos outros grupos, 1 x 0
    const timeB = t.grupos[1]
    t = jogarGrupos(t, (j, tt) => {
      const casa = timesDoJogo(tt, j).A!
      return j.grupo === 1 && casa === timeB[0] ? [5, 0] : [1, 0]
    })
    const final = mata[1]
    const direto = timesDoJogo(t, final)
    const campeaoB = resolverOrigem(t, { tipo: 'grupo', grupo: 1, posicao: 1 })
    // quem tem a melhor campanha está na final sem jogar a semifinal
    expect([direto.A, direto.B]).toContain(campeaoB)
    expect(nome(t, campeaoB)).toBeTruthy()
    const semi = timesDoJogo(t, mata[0])
    expect([semi.A, semi.B]).not.toContain(campeaoB)
    expect(jogosDisponiveis(t).map((j) => j.id)).toEqual([mata[0].id]) // só a semifinal pode ser jogada
  })

  it('16 grupos (64 times): o mata-mata começa nos 16 avos e vai até a final', () => {
    const t = sorteado(torneioCom(64, 'grupos', { grupos: 16, classificamPorGrupo: 2, linha: 2 }, 2))
    const rodadas = [...new Set(t.jogos.filter((j) => j.fase === 'mata').map((j) => j.rodada))]
    expect(rodadas).toEqual(['16 avos de final', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'])
  })

  it('desligada (chaveCopa: false): continua o cruzamento simples de antes', () => {
    const copa = sorteado(torneioCom(16, 'grupos', { grupos: 4, classificamPorGrupo: 2 }))
    const simples = sorteado(torneioCom(16, 'grupos', { grupos: 4, classificamPorGrupo: 2, chaveCopa: false }))
    const primeira = (t: Torneio) => t.jogos.filter((j) => j.fase === 'mata').slice(0, 4).map((j) => `${rotulo(j.casa)} x ${rotulo(j.fora)}`)
    expect(primeira(copa)).toEqual(['1A x 2B', '1C x 2D', '1B x 2A', '1D x 2C'])
    expect(primeira(simples)).not.toEqual(primeira(copa))
  })
})
