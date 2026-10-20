import { describe, expect, it } from 'vitest'
import {
  campeao, classificacao, jogosDisponiveis, problemasParaSortear, registrarResultado, timesDoJogo, vencedor,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { cartao, nomeDoTime, resultado, sorteado, torneioCom } from './utils'

/** Joga todos os jogos disponíveis com o placar decidido por `placar(nomeA, nomeB)`. */
function jogarTudo(t: Torneio, placar: (a: string, b: string) => [number, number], penaltis: [number, number] = [4, 3]) {
  let disponiveis = jogosDisponiveis(t)
  while (disponiveis.length) {
    const jogo = disponiveis[0]
    const times = timesDoJogo(t, jogo)
    const [a, b] = placar(nomeDoTime(t, times.A)!, nomeDoTime(t, times.B)!)
    t = registrarResultado(t, jogo.id, resultado(a, b, a === b && jogo.fase === 'mata' ? { penaltis } : {}))
    disponiveis = jogosDisponiveis(t)
  }
  return t
}
// Time de número menor vence (Time 1 é o melhor)
const menorVence = (a: string, b: string): [number, number] => (Number(a.split(' ')[1]) < Number(b.split(' ')[1]) ? [2, 0] : [0, 2])

describe('criação e sorteio', () => {
  it('não sorteia com time aberto ou com menos jogadores que a linha', () => {
    const t = torneioCom(3, 'pontos', {}, 3)
    t.times[0].fechado = false
    expect(problemasParaSortear(t)).toEqual([
      'Feche o time Time 1', 'Time 1 precisa de pelo menos 4 jogadores de linha',
      'Time 2 precisa de pelo menos 4 jogadores de linha', 'Time 3 precisa de pelo menos 4 jogadores de linha',
    ])
  })
})

describe('pontos corridos', () => {
  it('todos jogam contra todos e o campeão é o líder', () => {
    let t = sorteado(torneioCom(4, 'pontos'))
    expect(t.jogos).toHaveLength(6)
    expect(campeao(t)).toBeNull()
    t = jogarTudo(t, menorVence)
    expect(classificacao(t).map((l) => [nomeDoTime(t, l.time), l.pontos])).toEqual([
      ['Time 1', 9], ['Time 2', 6], ['Time 3', 3], ['Time 4', 0],
    ])
    expect(nomeDoTime(t, campeao(t))).toBe('Time 1')
  })

  it('desempate: vitórias, depois saldo de gols (gols pró não conta)', () => {
    let t = sorteado(torneioCom(3, 'pontos'))
    const placares: Record<string, [number, number]> = {
      'Time 1-Time 2': [1, 0], 'Time 2-Time 1': [0, 1],
      'Time 1-Time 3': [0, 1], 'Time 3-Time 1': [1, 0],
      'Time 2-Time 3': [3, 1], 'Time 3-Time 2': [1, 3],
    }
    t = jogarTudo(t, (a, b) => placares[`${a}-${b}`])
    // Todos com 3 pontos e 1 vitória; saldo: Time 2 +1, Time 1 0, Time 3 -1
    expect(classificacao(t).map((l) => [nomeDoTime(t, l.time), l.pontos, l.saldo])).toEqual([
      ['Time 2', 3, 1], ['Time 1', 3, 0], ['Time 3', 3, -1],
    ])
  })

  it('desempate por cartões: menos vermelhos, depois menos amarelos', () => {
    let t = sorteado(torneioCom(2, 'pontos', { idaEVolta: true }))
    const [ida, volta] = t.jogos
    const timeA = (j: typeof ida) => timesDoJogo(t, j).A!
    const jogadorDe = (timeId: string) => t.times.find((x) => x.id === timeId)!.jogadores[0].id
    // Ida 1 x 1 com um amarelo para o mandante; volta 1 x 1 com um vermelho para o mandante
    t = registrarResultado(t, ida.id, resultado(1, 1, { cartoes: [cartao('A', jogadorDe(timeA(ida)), 'amarelo')] }))
    t = registrarResultado(t, volta.id, resultado(1, 1, { cartoes: [cartao('A', jogadorDe(timeA(volta)), 'vermelho')] }))
    // empatados em pontos, vitórias e saldo: quem tem menos vermelhos fica na frente
    const tabela = classificacao(t)
    expect(tabela[0].time).toBe(timeA(ida)) // só amarelo
    expect(tabela[0]).toMatchObject({ vermelhos: 0, amarelos: 1 })
    expect(tabela[1]).toMatchObject({ vermelhos: 1, amarelos: 0 })
  })
})

describe('mata-mata', () => {
  it('empate exige pênaltis; quem vence avança até a final', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { terceiroLugar: true }))
    const semi = jogosDisponiveis(t)[0]
    expect(() => registrarResultado(t, semi.id, resultado(1, 1))).toThrow('pênaltis')
    t = registrarResultado(t, semi.id, resultado(1, 1, { penaltis: [3, 4] }))
    expect(vencedor(t.jogos.find((j) => j.id === semi.id)!)).toBe('B')
    t = jogarTudo(t, menorVence)
    const nomes = t.jogos.map((j) => j.rodada)
    expect(nomes).toEqual(['Semifinal', 'Semifinal', 'Disputa de 3º lugar', 'Final'])
    expect(campeao(t)).not.toBeNull()
  })
})

describe('grupos + mata-mata', () => {
  it('2 grupos de 3: passam 2 de cada; 1º de um grupo pega o 2º do outro', () => {
    let t = sorteado(torneioCom(6, 'grupos', { grupos: 2, classificamPorGrupo: 2 }))
    expect(t.grupos.map((g) => g.length)).toEqual([3, 3])
    expect(t.jogos.filter((j) => j.fase === 'grupo')).toHaveLength(6)
    const semis = t.jogos.filter((j) => j.rodada === 'Semifinal')
    expect(semis).toHaveLength(2)
    expect(jogosDisponiveis(t).every((j) => j.fase === 'grupo')).toBe(true) // semis só depois dos grupos

    t = jogarTudo(t, menorVence)
    const primeiro = (g: number) => classificacao(t, g)[0].time
    const segundo = (g: number) => classificacao(t, g)[1].time
    const [semi1, semi2] = t.jogos.filter((j) => j.rodada === 'Semifinal')
    expect(timesDoJogo(t, semi1)).toEqual({ A: primeiro(0), B: segundo(1) })
    expect(timesDoJogo(t, semi2)).toEqual({ A: primeiro(1), B: segundo(0) })
    expect(nomeDoTime(t, campeao(t))).toBe('Time 1')
  })
})
