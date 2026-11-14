import { describe, expect, it } from 'vitest'
import {
  cobrar, diferencas, encerrarPartida, iniciarPartida, jogosDisponiveis, juntar, novaDisputa, partidaDoJogo, penaltisNaPartida,
  placarDosPenaltis, separar,
} from '..'
import { sorteado, torneioCom } from './utils'

// A disputa de pênaltis fica gravada no jogo em andamento: vai para a nuvem (o telão acompanha)
// e não se perde se o celular do mesário fechar no meio.

describe('pênaltis gravados no jogo', () => {
  const comecado = () => {
    const torneio = sorteado(torneioCom(2, 'mata-mata'))
    const jogo = jogosDisponiveis(torneio)[0]
    return { torneio: iniciarPartida(torneio, jogo.id), jogoId: jogo.id }
  }

  it('grava, cobra e volta para antes dos pênaltis', () => {
    const { torneio, jogoId } = comecado()
    let comPenaltis = penaltisNaPartida(torneio, jogoId, novaDisputa('A', 5))
    comPenaltis = penaltisNaPartida(comPenaltis, jogoId, cobrar(partidaDoJogo(comPenaltis, jogoId)!.penaltis!, true, { id: 'j1', nome: 'Zé' }))
    expect(placarDosPenaltis(partidaDoJogo(comPenaltis, jogoId)!.penaltis!)).toEqual([1, 0])
    expect(partidaDoJogo(penaltisNaPartida(comPenaltis, jogoId, null), jogoId)!.penaltis).toBeNull()
  })

  it('vai para a nuvem com o jogo (o telão e outro celular veem as cobranças)', () => {
    const { torneio, jogoId } = comecado()
    const comPenaltis = penaltisNaPartida(torneio, jogoId, cobrar(novaDisputa('B', 3), false, null))
    expect(diferencas(torneio, comPenaltis).some((operacao) => JSON.stringify(operacao).includes("penaltis"))).toBe(true)
    const outroCelular = juntar(separar(comPenaltis))!
    expect(partidaDoJogo(outroCelular, jogoId)!.penaltis!.cobrancas).toEqual([{ lado: 'B', jogadorId: null, nome: null, gol: false }])
  })

  it('some quando o resultado é confirmado (o placar dos pênaltis fica no resultado)', () => {
    const { torneio, jogoId } = comecado()
    const comPenaltis = penaltisNaPartida(torneio, jogoId, novaDisputa('A', 1))
    const encerrado = encerrarPartida(comPenaltis, jogoId, [1, 0])
    expect(partidaDoJogo(encerrado, jogoId)).toBeUndefined()
    expect(encerrado.jogos.find((jogo) => jogo.id === jogoId)!.resultado!.penaltis).toEqual([1, 0])
  })
})
