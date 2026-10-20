import { describe, expect, it } from 'vitest'
import { cobrar, iniciarEscalacao, jogosDisponiveis, novaDisputa, placarDosPenaltis, quemBate, registrarResultado,
  situacaoDisciplinar, substituir, timesDoJogo, vencedorDosPenaltis, goleiroDoTime, jogadoresDeLinha } from '..'
import type { Torneio } from '../../../types/torneio'
import { cartao, resultado, sorteado, torneioCom } from './utils'

/** O `n`º jogador de linha do time (o goleiro fica de fora da contagem). */
const jogador = (t: Torneio, time: number, n: number) => jogadoresDeLinha(t.times[time])[n - 1].id

/** Joga o próximo jogo do Time 1 (lado onde ele estiver) com os cartões dados. */
function jogoDoTime1(t: Torneio, cartoes: (lado: 'A' | 'B') => ReturnType<typeof cartao>[] = () => []) {
  const jogo = jogosDisponiveis(t).find((j) => Object.values(timesDoJogo(t, j)).includes(t.times[0].id))!
  const lado = timesDoJogo(t, jogo).A === t.times[0].id ? 'A' : 'B'
  return registrarResultado(t, jogo.id, resultado(0, 0, { cartoes: cartoes(lado) }))
}

describe('pênaltis', () => {
  it('alternados; decide antes quando um lado não alcança mais', () => {
    let p = novaDisputa('A', 3)
    for (const gol of [true, false, true, false]) p = cobrar(p, gol) // A 2 x 0 B, faltam A1 e B1
    expect(quemBate(p)).toBe('A')
    expect(vencedorDosPenaltis(p)).toBe('A') // B só tem 1 cobrança: chega no máximo a 1
    expect(() => cobrar(p, true)).toThrow()
  })

  it('empatadas as normais, alternadas até alguém errar', () => {
    let p = novaDisputa('B', 3)
    for (let i = 0; i < 6; i++) p = cobrar(p, true) // 3 x 3
    expect(vencedorDosPenaltis(p)).toBeNull()
    p = cobrar(p, true) // B faz
    expect(vencedorDosPenaltis(p)).toBeNull()
    p = cobrar(p, false) // A erra
    expect(placarDosPenaltis(p)).toEqual([3, 4])
    expect(vencedorDosPenaltis(p)).toBe('B')
  })
})

describe('suspensões', () => {
  it('vermelho suspende o próximo jogo do time e depois libera', () => {
    let t = sorteado(torneioCom(4, 'pontos'))
    const j1 = jogador(t, 0, 1)
    t = jogoDoTime1(t, (lado) => [cartao(lado, j1, 'vermelho')])
    expect(situacaoDisciplinar(t).suspensos.has(j1)).toBe(true)
    t = jogoDoTime1(t) // cumpriu
    expect(situacaoDisciplinar(t).suspensos.has(j1)).toBe(false)
  })

  it('3 amarelos acumulados suspendem e zeram a contagem', () => {
    let t = sorteado(torneioCom(4, 'pontos', { idaEVolta: true }))
    const j1 = jogador(t, 0, 1)
    t = jogoDoTime1(t, (l) => [cartao(l, j1, 'amarelo')])
    t = jogoDoTime1(t, (l) => [cartao(l, j1, 'amarelo')])
    expect(situacaoDisciplinar(t).amarelos.get(j1)).toBe(2)
    t = jogoDoTime1(t, (l) => [cartao(l, j1, 'amarelo')])
    expect(situacaoDisciplinar(t).suspensos.has(j1)).toBe(true)
    expect(situacaoDisciplinar(t).amarelos.get(j1)).toBe(0)
  })

  it('dois amarelos no jogo viram vermelho e zeram os acumulados', () => {
    let t = sorteado(torneioCom(4, 'pontos'))
    const j1 = jogador(t, 0, 1)
    t = jogoDoTime1(t, (l) => [cartao(l, j1, 'amarelo'), cartao(l, j1, 'amarelo'), cartao(l, j1, 'vermelho', true)])
    const s = situacaoDisciplinar(t)
    expect(s.suspensos.has(j1)).toBe(true)
    expect(s.amarelos.get(j1)).toBe(0)
  })

  it('suspenso não começa o jogo: entra o primeiro reserva no lugar', () => {
    let t = sorteado(torneioCom(4, 'pontos'))
    const j1 = jogador(t, 0, 1)
    t = jogoDoTime1(t, (l) => [cartao(l, j1, 'vermelho')])
    const jogo = jogosDisponiveis(t).find((j) => Object.values(timesDoJogo(t, j)).includes(t.times[0].id))!
    const lado = timesDoJogo(t, jogo).A === t.times[0].id ? 'A' : 'B'
    const esc = iniciarEscalacao(t, jogo)
    expect(esc.suspensos[lado]).toEqual([j1])
    expect(esc.emCampo[lado]).toEqual([goleiroDoTime(t.times[0])!.id, ...[2, 3, 4, 5].map((n) => jogador(t, 0, n))])
    expect(esc.banco[lado]).toEqual([jogador(t, 0, 6)])
  })
})

describe('substituições', () => {
  const preparar = () => {
    const t = sorteado(torneioCom(2, 'pontos'))
    const jogo = t.jogos[0]
    const lado = timesDoJogo(t, jogo).A === t.times[0].id ? 'A' as const : 'B' as const
    return { t, esc: iniciarEscalacao(t, jogo), lado }
  }

  it('quem sai vai para o banco (continua no time) e pode voltar', () => {
    const { t, esc: e0, lado } = preparar()
    const [j1, j5] = [jogador(t, 0, 1), jogador(t, 0, 5)]
    let esc = substituir(e0, lado, j1, j5)
    expect(esc.emCampo[lado]).toContain(j5)
    expect(esc.banco[lado]).toContain(j1)
    esc = substituir(esc, lado, j5, j1)
    expect(esc.emCampo[lado]).toContain(j1)
    expect(esc.jogaram[lado]).toContain(j5)
    expect(esc.substituicoes[lado]).toBe(2)
  })

  it('respeita o limite de substituições e não substitui expulso', () => {
    const { t, esc: e0, lado } = preparar()
    const [j1, j2, j5, j6] = [1, 2, 5, 6].map((n) => jogador(t, 0, n))
    expect(() => substituir(e0, lado, j1, j5, null, new Set([j1]))).toThrow('Expulso')
    const esc = substituir(e0, lado, j1, j5, 1)
    expect(() => substituir(esc, lado, j2, j6, 1)).toThrow('Limite')
  })
})
