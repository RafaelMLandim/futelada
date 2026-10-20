import { describe, expect, it } from 'vitest'
import {
  cartaoNaPartida, converterGoleirosAntigos, encerrarPartida, goleiroDoTime, goleiroNaPartida, golNaPartida, golVazioPorExpulsao, iniciarPartida,
  irParaOGol, jogadoresDeLinha, jogosDisponiveis, jogosParaComecar, situacaoDisciplinar, substituirNaPartida, timesDoJogo,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

/** Começa o próximo jogo do torneio; `timeA` e `timeB` são os times de cada lado. */
function comecarProximoJogo(torneioAntes: Torneio) {
  const jogo = jogosParaComecar(torneioAntes)[0]
  const torneio = iniciarPartida(torneioAntes, jogo.id)
  const ids = timesDoJogo(torneio, jogo)
  const timeDoLado = (lado: 'A' | 'B') => torneio.times.find((time) => time.id === ids[lado])!
  return { torneio, jogoId: jogo.id, timeA: timeDoLado('A'), timeB: timeDoLado('B') }
}

describe('goleiro do torneio (um jogador do time marcado como goleiro)', () => {
  it('começa o jogo em campo, no gol, e sofre os gols do outro time', () => {
    let { torneio, jogoId, timeA, timeB } = comecarProximoJogo(sorteado(torneioCom(2, 'pontos')))
    const partida = () => torneio.emAndamento[0]
    const goleiroA = goleiroDoTime(timeA)!
    expect(partida().escalacao.emCampo.A[0]).toBe(goleiroA.id)
    expect(partida().escalacao.emCampo.A).toHaveLength(torneio.regras.linha + 1)
    expect(goleiroNaPartida(torneio, partida(), 'A')).toEqual(goleiroA)
    torneio = golNaPartida(torneio, jogoId, 'B', jogadoresDeLinha(timeB)[0])
    expect(partida().gols[0].goleiroSofreu).toBe(goleiroA.nome)
    // o goleiro também faz gol, como qualquer jogador
    torneio = golNaPartida(torneio, jogoId, 'A', goleiroA)
    expect(partida().gols[1]).toMatchObject({ autorId: goleiroA.id, goleiroSofreu: goleiroDoTime(timeB)!.nome })
  })

  it('reserva que substitui o goleiro vira o goleiro', () => {
    let { torneio, jogoId, timeA } = comecarProximoJogo(sorteado(torneioCom(2, 'pontos')))
    const [reserva] = torneio.emAndamento[0].escalacao.banco.A
    torneio = substituirNaPartida(torneio, jogoId, 'A', goleiroDoTime(timeA)!.id, reserva)
    expect(goleiroNaPartida(torneio, torneio.emAndamento[0], 'A')?.id).toBe(reserva)
    expect(torneio.emAndamento[0].escalacao.banco.A).toContain(goleiroDoTime(timeA)!.id)
    expect(torneio.emAndamento[0].escalacao.substituicoes.A).toBe(1)
  })

  it('jogador da linha vai para o gol e vira o goleiro; o goleiro fica na linha (sem substituição)', () => {
    let { torneio, jogoId, timeA } = comecarProximoJogo(sorteado(torneioCom(2, 'pontos')))
    const daLinha = jogadoresDeLinha(timeA)[1].id
    const emCampoAntes = torneio.emAndamento[0].escalacao.emCampo.A
    torneio = irParaOGol(torneio, jogoId, 'A', daLinha)
    const partida = torneio.emAndamento[0]
    expect(goleiroNaPartida(torneio, partida, 'A')?.id).toBe(daLinha)
    expect(partida.escalacao.emCampo.A).toEqual(emCampoAntes)
    expect(partida.escalacao.substituicoes.A).toBe(0)
    // com goleiro no gol, quem vem do banco entra pela substituição (não direto no gol)
    expect(() => irParaOGol(torneio, jogoId, 'A', partida.escalacao.banco.A[0])).toThrow(/substituição/)
  })

  it('goleiro expulso: o gol fica vazio, só alguém da linha vai para o gol e o time fica com um a menos', () => {
    let { torneio, jogoId, timeA } = comecarProximoJogo(sorteado(torneioCom(2, 'pontos')))
    torneio = cartaoNaPartida(torneio, jogoId, 'A', goleiroDoTime(timeA)!, 'vermelho', 0)
    const partida = () => torneio.emAndamento[0]
    expect(goleiroNaPartida(torneio, partida(), 'A')).toBeNull()
    expect(golVazioPorExpulsao(partida(), 'A')).toBe(true)
    expect(() => irParaOGol(torneio, jogoId, 'A', partida().escalacao.banco.A[0])).toThrow()
    expect(() => irParaOGol(torneio, jogoId, 'A', goleiroDoTime(timeA)!.id)).toThrow('Expulso')
    const daLinha = jogadoresDeLinha(timeA)[0].id
    torneio = irParaOGol(torneio, jogoId, 'A', daLinha)
    expect(goleiroNaPartida(torneio, partida(), 'A')?.id).toBe(daLinha)
    torneio = encerrarPartida(torneio, jogoId)
    const resultado = torneio.jogos.find((jogo) => jogo.id === jogoId)!.resultado!
    expect(resultado.goleiros.A).toBe(jogadoresDeLinha(timeA)[0].nome)
  })

  it('o vermelho suspende o goleiro no próximo jogo: começa com o gol vazio e o reserva entra sem contar substituição', () => {
    const base = sorteado(torneioCom(3, 'pontos'))
    let { torneio, jogoId, timeA } = comecarProximoJogo(base)
    const goleiro = goleiroDoTime(timeA)!
    torneio = cartaoNaPartida(torneio, jogoId, 'A', goleiro, 'vermelho', 0)
    torneio = encerrarPartida(torneio, jogoId)
    expect(situacaoDisciplinar(torneio).suspensos.has(goleiro.id)).toBe(true)

    const proximo = jogosDisponiveis(torneio).find((jogo) => Object.values(timesDoJogo(torneio, jogo)).includes(timeA.id))!
    torneio = iniciarPartida(torneio, proximo.id)
    const lado = timesDoJogo(torneio, proximo).A === timeA.id ? 'A' : 'B'
    const partida = () => torneio.emAndamento.find((andamento) => andamento.jogoId === proximo.id)!
    expect(partida().escalacao.suspensos[lado]).toContain(goleiro.id)
    expect(partida().escalacao.emCampo[lado]).not.toContain(goleiro.id)
    expect(goleiroNaPartida(torneio, partida(), lado)).toBeNull()
    expect(golVazioPorExpulsao(partida(), lado)).toBe(false)
    const [reserva] = partida().escalacao.banco[lado]
    torneio = irParaOGol(torneio, proximo.id, lado, reserva)
    expect(goleiroNaPartida(torneio, partida(), lado)?.id).toBe(reserva)
    expect(partida().escalacao.substituicoes[lado]).toBe(0)
    torneio = encerrarPartida(torneio, proximo.id)
    // cumpriu a suspensão
    expect(situacaoDisciplinar(torneio).suspensos.has(goleiro.id)).toBe(false)
  })

  it('torneio de versão antiga: o goleiro pelo nome vira um jogador marcado como goleiro, inclusive no jogo em andamento', () => {
    const { torneio } = comecarProximoJogo(sorteado(torneioCom(2, 'pontos')))
    // como era antes: goleiro só pelo nome, fora da lista, e o jogo sem `goleiros`
    const antigo = {
      ...torneio,
      times: torneio.times.map((time) => ({ ...time, goleiro: 'PAREDÃO', jogadores: jogadoresDeLinha(time) })),
      emAndamento: torneio.emAndamento.map(({ goleiros: _goleiros, ...partida }) => ({
        ...partida,
        escalacao: { ...partida.escalacao, emCampo: { A: partida.escalacao.emCampo.A.slice(1), B: partida.escalacao.emCampo.B.slice(1) } },
      })),
    } as unknown as Torneio
    const convertido = converterGoleirosAntigos(antigo)
    const [primeiroTime] = convertido.times
    expect(goleiroDoTime(primeiroTime)).toEqual({ id: `${primeiroTime.id}-goleiro`, nome: 'PAREDÃO', goleiro: true })
    expect('goleiro' in primeiroTime).toBe(false)
    const partida = convertido.emAndamento[0]
    expect(goleiroNaPartida(convertido, partida, 'A')?.nome).toBe('PAREDÃO')
    expect(partida.escalacao.emCampo.A).toHaveLength(convertido.regras.linha + 1)
    // converter de novo não muda nada (cada celular converte o mesmo torneio igual)
    expect(converterGoleirosAntigos(convertido)).toEqual(convertido)
  })
})
