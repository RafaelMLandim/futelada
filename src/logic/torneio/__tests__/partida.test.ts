import { describe, expect, it } from 'vitest'
import {
  campoDoJogo, campoLiberadoDosGrupos, camposLivres, cartaoNaPartida, proximosPorCampo, encerrarPartida, golNaPartida, iniciarPartida, jogosDisponiveis, jogosParaComecar,
  jogadoresDeLinha, removerGolDaPartida, situacaoDisciplinar, substituirNaPartida, timesDoJogo,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

function comecarPrimeiro(t: Torneio) {
  const jogo = jogosParaComecar(t)[0]
  t = iniciarPartida(t, jogo.id)
  const ids = timesDoJogo(t, jogo)
  const time = (l: 'A' | 'B') => t.times.find((x) => x.id === ids[l])!
  return { t, jogo, A: time('A'), B: time('B') }
}

describe('jogo do torneio', () => {
  it('gols contam no placar, o goleiro do outro time sofre, e o resultado vai para a tabela', () => {
    const base = sorteado(torneioCom(4, 'pontos'))
    let { t, jogo, A, B } = comecarPrimeiro(base)
    t = golNaPartida(t, jogo.id, 'A', A.jogadores[0])
    t = golNaPartida(t, jogo.id, 'A', null)
    t = golNaPartida(t, jogo.id, 'B', B.jogadores[1])
    t = removerGolDaPartida(t, jogo.id, 1) // o "sem autor" foi engano
    expect(t.emAndamento[0].placar).toEqual([1, 1])
    expect(t.emAndamento[0].gols.map((g) => g.goleiroSofreu)).toEqual([`Goleiro ${B.nome}`, `Goleiro ${A.nome}`])
    t = encerrarPartida(t, jogo.id)
    expect(t.emAndamento).toEqual([])
    expect(t.jogos.find((j) => j.id === jogo.id)!.resultado!.placar).toEqual([1, 1])
  })

  it('com 1 campo, não começa outro jogo com um em andamento', () => {
    const { t } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos')))
    expect(jogosParaComecar(t)).toEqual([])
    expect(() => iniciarPartida(t, jogosDisponiveis(t)[1].id)).toThrow('campos')
  })

  it('mata-mata empatado só encerra com pênaltis', () => {
    const { t, jogo } = comecarPrimeiro(sorteado(torneioCom(4, 'mata-mata')))
    expect(() => encerrarPartida(t, jogo.id)).toThrow('pênaltis')
    expect(encerrarPartida(t, jogo.id, [4, 2]).emAndamento).toEqual([])
  })

  it('substituição respeita expulsão; quem entrou conta como "jogou"', () => {
    let { t, jogo, A } = comecarPrimeiro(sorteado(torneioCom(2, 'pontos')))
    const [j1, j2] = jogadoresDeLinha(A)
    const [r1, r2] = jogadoresDeLinha(A).slice(4)
    t = cartaoNaPartida(t, jogo.id, 'A', j1, 'vermelho', 0)
    expect(() => substituirNaPartida(t, jogo.id, 'A', j1.id, r1.id)).toThrow('Expulso')
    t = substituirNaPartida(t, jogo.id, 'A', j2.id, r1.id)
    expect(t.emAndamento[0].escalacao.jogaram.A).toContain(r1.id)
    expect(t.emAndamento[0].escalacao.banco.A).toEqual([r2.id, j2.id])
    t = encerrarPartida(t, jogo.id)
    expect(situacaoDisciplinar(t).suspensos.has(j1.id)).toBe(true) // vermelho: suspenso no próximo
  })
})

describe('jogos simultâneos', () => {
  it('com 2 campos, dois jogos acontecem ao mesmo tempo, cada um no seu campo', () => {
    let t = sorteado(torneioCom(4, 'pontos', { campos: 2 }))
    const [j1] = jogosParaComecar(t)
    t = iniciarPartida(t, j1.id)
    const [j2] = jogosParaComecar(t)
    t = iniciarPartida(t, j2.id)
    expect(t.emAndamento.map((p) => p.campo)).toEqual([1, 2])
    expect(camposLivres(t)).toEqual([])
    // cada jogo tem o seu placar
    t = golNaPartida(t, j2.id, 'A', null)
    expect(t.emAndamento.map((p) => p.placar)).toEqual([[0, 0], [1, 0]])
    // o campo 1 libera quando o jogo acaba
    t = encerrarPartida(t, j1.id)
    expect(camposLivres(t)).toEqual([1])
  })

  it('um time não joga dois jogos ao mesmo tempo', () => {
    let t = sorteado(torneioCom(3, 'pontos', { campos: 2 }))
    const [j1] = jogosParaComecar(t)
    t = iniciarPartida(t, j1.id)
    // com 3 times, todo outro jogo tem um dos times que já está em campo
    expect(jogosParaComecar(t)).toEqual([])
    const outro = jogosDisponiveis(t).find((j) => j.id !== j1.id)!
    expect(() => iniciarPartida(t, outro.id)).toThrow('não pode começar')
  })
})

describe('cada grupo no seu campo', () => {
  it('Grupo A joga no Campo 1 e Grupo B no Campo 2; um não ocupa o campo do outro', () => {
    let t = sorteado(torneioCom(8, 'grupos', { grupos: 2, campos: 2 }))
    const deGrupo = t.jogos.filter((j) => j.fase === 'grupo')
    expect(deGrupo.every((j) => campoDoJogo(t, j) === j.grupo! + 1)).toBe(true)

    const proximos = proximosPorCampo(t)
    expect(proximos.map((x) => [x.campo, x.jogo.grupo])).toEqual([[1, 0], [2, 1]])
    t = iniciarPartida(t, proximos[0].jogo.id)
    expect(t.emAndamento[0].campo).toBe(1)
    // Campo 1 ocupado: só jogos do Grupo B podem começar (no Campo 2)
    expect(jogosParaComecar(t).every((j) => j.grupo === 1)).toBe(true)
    expect(proximosPorCampo(t).map((x) => x.campo)).toEqual([2])
  })

  it('mais grupos que campos: o campo que acaba os seus grupos ajuda o outro (não fica parado)', () => {
    // 3 grupos, 2 campos: A e C no Campo 1, B no Campo 2 (3 jogos no Campo 2, 6 no Campo 1)
    let t = sorteado(torneioCom(9, 'grupos', { grupos: 3, campos: 2, classificamPorGrupo: 1 }))
    expect(t.jogos.filter((j) => campoDoJogo(t, j) === 2).length).toBe(3)
    expect(campoLiberadoDosGrupos(t, 2)).toBe(false)
    // enquanto o Grupo B tem jogo, o Campo 2 só recebe o Grupo B
    expect(proximosPorCampo(t).find((x) => x.campo === 2)!.jogo.grupo).toBe(1)
    // joga os 3 jogos do Grupo B no Campo 2
    for (const jogo of t.jogos.filter((j) => j.grupo === 1)) {
      t = iniciarPartida(t, jogo.id, 2)
      t = encerrarPartida(t, jogo.id)
    }
    expect(campoLiberadoDosGrupos(t, 2)).toBe(true)
    // agora o Campo 2 pega jogos dos Grupos A e C, que eram do Campo 1
    const noCampo2 = proximosPorCampo(t).find((x) => x.campo === 2)!.jogo
    expect([0, 2]).toContain(noCampo2.grupo)
    t = iniciarPartida(t, noCampo2.id, 2)
    expect(t.emAndamento[0].campo).toBe(2)
    // e o Campo 1 continua com os dele ao mesmo tempo
    expect(proximosPorCampo(t).map((x) => x.campo)).toEqual([1])
  })

  it('desligado, os jogos de grupo vão para qualquer campo livre', () => {
    const t = sorteado(torneioCom(8, 'grupos', { grupos: 2, campos: 2, grupoPorCampo: false }))
    expect(t.jogos.every((j) => campoDoJogo(t, j) === null)).toBe(true)
  })
})
