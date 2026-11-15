import { describe, expect, it } from 'vitest'
import {
  bancoSugerido, cronoDaPartida, encerrarPartida, iniciarPartida, jogadoresDeLinha, jogosParaComecar, numerosDasCamisas, reservasDoJogo, substituirNaPartida, timesDoJogo,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

// 5 na linha e 7 jogadores de linha por time: 2 reservas
const torneioComReservas = () => sorteado(torneioCom(4, 'pontos', { linha: 5 }, 7))

function timeDoLado(torneio: Torneio, jogoId: string, lado: 'A' | 'B') {
  const jogo = torneio.jogos.find((candidato) => candidato.id === jogoId)!
  return torneio.times.find((time) => time.id === timesDoJogo(torneio, jogo)[lado])!
}

describe('escalação do jogo do torneio', () => {
  it('conta os reservas de cada time (sem reserva, a janela não precisa abrir)', () => {
    const torneio = torneioComReservas()
    expect(reservasDoJogo(torneio, jogosParaComecar(torneio)[0])).toEqual({ A: 2, B: 2 })
    const semReservas = sorteado(torneioCom(4, 'pontos', { linha: 5 }, 5))
    expect(reservasDoJogo(semReservas, jogosParaComecar(semReservas)[0])).toEqual({ A: 0, B: 0 })
  })

  it('o banco escolhido fica no banco e os outros começam', () => {
    let torneio = torneioComReservas()
    const jogo = jogosParaComecar(torneio)[0]
    const linhaA = jogadoresDeLinha(timeDoLado(torneio, jogo.id, 'A'))
    const banco = { A: [linhaA[0].id, linhaA[1].id], B: bancoSugerido(torneio, jogo).B }
    torneio = iniciarPartida(torneio, jogo.id, undefined, banco)
    const { escalacao } = torneio.emAndamento[0]
    expect(escalacao.banco.A).toEqual([linhaA[0].id, linhaA[1].id])
    expect(escalacao.emCampo.A).toHaveLength(6) // goleiro + 5
    expect(escalacao.emCampo.A).toContain(linhaA[6].id)
  })

  it('antes do apito, trocar não conta como substituição e quem saiu não jogou', () => {
    let torneio = torneioComReservas()
    const jogo = jogosParaComecar(torneio)[0]
    torneio = iniciarPartida(torneio, jogo.id)
    const { emCampo, banco } = torneio.emAndamento[0].escalacao
    const sai = emCampo.A[1]
    const entra = banco.A[0]
    torneio = substituirNaPartida(torneio, jogo.id, 'A', sai, entra)
    const partida = torneio.emAndamento[0]
    expect(partida.escalacao.substituicoes.A).toBe(0)
    expect(partida.substituicoesFeitas ?? []).toHaveLength(0)
    expect(partida.escalacao.jogaram.A).not.toContain(sai)
    expect(partida.escalacao.titulares!.A).toContain(entra)
    // depois do apito, conta
    torneio = cronoDaPartida(torneio, jogo.id, true)
    torneio = substituirNaPartida(torneio, jogo.id, 'A', entra, sai)
    expect(torneio.emAndamento[0].escalacao.substituicoes.A).toBe(1)
    expect(torneio.emAndamento[0].escalacao.titulares!.A).toContain(entra) // titulares ficam como no apito
  })

  it('o próximo jogo do time sugere a escalação do último', () => {
    let torneio = torneioComReservas()
    const jogo = jogosParaComecar(torneio)[0]
    const time = timeDoLado(torneio, jogo.id, 'A')
    const linha = jogadoresDeLinha(time)
    // no primeiro jogo, os últimos da lista ficam no banco
    expect(bancoSugerido(torneio, jogo).A).toEqual([linha[5].id, linha[6].id])
    torneio = iniciarPartida(torneio, jogo.id, undefined, { A: [linha[0].id, linha[1].id], B: [] })
    torneio = encerrarPartida(torneio, jogo.id)
    const proximo = jogosParaComecar(torneio).find((candidato) => Object.values(timesDoJogo(torneio, candidato)).includes(time.id))!
    const lado = timesDoJogo(torneio, proximo).A === time.id ? 'A' : 'B'
    expect(bancoSugerido(torneio, proximo)[lado]).toEqual([linha[0].id, linha[1].id])
  })
})

describe('números das camisas', () => {
  it('troca só os números (com o time em campo, a escalação continua igual)', () => {
    let torneio = torneioComReservas()
    const jogo = jogosParaComecar(torneio)[0]
    torneio = iniciarPartida(torneio, jogo.id)
    const time = timeDoLado(torneio, jogo.id, 'A')
    const [primeiro, segundo] = jogadoresDeLinha(time)
    const antes = torneio.emAndamento[0].escalacao
    torneio = numerosDasCamisas(torneio, time.id, { [primeiro.id]: 10, [segundo.id]: undefined })
    const depois = timeDoLado(torneio, jogo.id, 'A')
    expect(depois.jogadores.find((jogador) => jogador.id === primeiro.id)!.camisa).toBe(10)
    expect('camisa' in depois.jogadores.find((jogador) => jogador.id === segundo.id)!).toBe(false)
    expect(depois.jogadores.map((jogador) => jogador.id)).toEqual(time.jogadores.map((jogador) => jogador.id))
    expect(torneio.emAndamento[0].escalacao).toEqual(antes)
  })
})
