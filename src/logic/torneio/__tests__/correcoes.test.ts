import { describe, expect, it } from 'vitest'
import {
  cartaoNaPartida, corrigirResultado, desfazerSubstituicao, encerrarPartida, expulsosNaPartida, golNaPartida, impedimentoParaCorrigir, iniciarPartida,
  jogosParaComecar, removerCartaoDaPartida, siglaAutomatica, siglaDoTime, substituicaoParaDesfazer, substituirNaPartida, timesDoJogo, irParaOGol, placarTravado,
} from '..'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

function comecarPrimeiro(torneio: Torneio) {
  const jogo = jogosParaComecar(torneio)[0]
  const comecado = iniciarPartida(torneio, jogo.id)
  const ids = timesDoJogo(comecado, jogo)
  const time = (lado: 'A' | 'B') => comecado.times.find((time) => time.id === ids[lado])!
  return { torneio: comecado, jogo, A: time('A'), B: time('B') }
}

describe('correções no torneio', () => {
  it('tirar o 2º amarelo tira também o vermelho que ele gerou, e o jogador volta ao jogo', () => {
    let { torneio, jogo, A } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos')))
    const jogador = A.jogadores[1]
    torneio = cartaoNaPartida(torneio, jogo.id, 'A', jogador, 'amarelo', 1000)
    torneio = cartaoNaPartida(torneio, jogo.id, 'A', jogador, 'amarelo', 2000)
    expect(expulsosNaPartida(torneio.emAndamento[0]).has(jogador.id)).toBe(true)
    torneio = removerCartaoDaPartida(torneio, jogo.id, 1)
    expect(torneio.emAndamento[0].cartoes.map((cartao) => cartao.cor)).toEqual(['amarelo'])
    expect(expulsosNaPartida(torneio.emAndamento[0]).has(jogador.id)).toBe(false)
  })

  it('tirar o 1º de dois amarelos também tira o vermelho (fica um amarelo)', () => {
    let { torneio, jogo, A } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos')))
    const jogador = A.jogadores[1]
    torneio = cartaoNaPartida(torneio, jogo.id, 'A', jogador, 'amarelo', 1000)
    torneio = cartaoNaPartida(torneio, jogo.id, 'A', jogador, 'amarelo', 2000)
    torneio = removerCartaoDaPartida(torneio, jogo.id, 0)
    expect(torneio.emAndamento[0].cartoes.map((cartao) => cartao.cor)).toEqual(['amarelo'])
  })

  it('tirar um vermelho direto devolve o jogador', () => {
    let { torneio, jogo, B } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos')))
    torneio = cartaoNaPartida(torneio, jogo.id, 'B', B.jogadores[2], 'vermelho', 1000)
    torneio = removerCartaoDaPartida(torneio, jogo.id, 0)
    expect(torneio.emAndamento[0].cartoes).toEqual([])
  })

  it('desfaz a última substituição: quem saiu volta ao mesmo lugar e o limite volta a contar', () => {
    let { torneio, jogo, A } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos', { linha: 4 })))
    const antes = torneio.emAndamento[0].escalacao
    const sai = antes.emCampo.A[2]
    const entra = antes.banco.A[0]
    torneio = substituirNaPartida(torneio, jogo.id, 'A', sai, entra)
    expect(substituicaoParaDesfazer(torneio.emAndamento[0], 'A')?.entraId).toBe(entra)
    torneio = desfazerSubstituicao(torneio, jogo.id, 'A')
    const depois = torneio.emAndamento[0].escalacao
    expect(depois.emCampo.A).toEqual(antes.emCampo.A)
    expect(depois.banco.A).toContain(entra)
    expect(depois.substituicoes.A).toBe(0)
    expect(depois.jogaram.A).not.toContain(entra)
    expect(substituicaoParaDesfazer(torneio.emAndamento[0], 'A')).toBeNull()
    expect(A.id).toBeTruthy()
  })

  it('sem reentrada: quem saiu não volta (nem pelo gol vazio); com reentrada, volta', () => {
    let { torneio, jogo } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos', { linha: 4, reentrada: false })))
    const escalacao = torneio.emAndamento[0].escalacao
    const sai = escalacao.emCampo.A[2]
    const entra = escalacao.banco.A[0]
    torneio = substituirNaPartida(torneio, jogo.id, 'A', sai, entra)
    expect(() => substituirNaPartida(torneio, jogo.id, 'A', entra, sai)).toThrow('não pode voltar')
    expect(() => irParaOGol(torneio, jogo.id, 'A', sai)).toThrow()
    const aberto = comecarPrimeiro(sorteado(torneioCom(4, 'pontos', { linha: 4 })))
    const escalacaoAberta = aberto.torneio.emAndamento[0].escalacao
    const saiAberto = escalacaoAberta.emCampo.A[2]
    const entraAberto = escalacaoAberta.banco.A[0]
    let torneioAberto = substituirNaPartida(aberto.torneio, aberto.jogo.id, 'A', saiAberto, entraAberto)
    torneioAberto = substituirNaPartida(torneioAberto, aberto.jogo.id, 'A', entraAberto, saiAberto)
    expect(torneioAberto.emAndamento[0].escalacao.emCampo.A).toContain(saiAberto)
  })

  it('desfazer a troca do goleiro devolve o goleiro ao gol', () => {
    let { torneio, jogo } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos', { linha: 4 })))
    const partida = torneio.emAndamento[0]
    const goleiro = partida.goleiros!.A!
    const reserva = partida.escalacao.banco.A[0]
    torneio = substituirNaPartida(torneio, jogo.id, 'A', goleiro, reserva)
    expect(torneio.emAndamento[0].goleiros!.A).toBe(reserva)
    torneio = desfazerSubstituicao(torneio, jogo.id, 'A')
    expect(torneio.emAndamento[0].goleiros!.A).toBe(goleiro)
  })

  it('corrige o resultado encerrado: o placar sai dos gols', () => {
    let { torneio, jogo, A, B } = comecarPrimeiro(sorteado(torneioCom(4, 'pontos')))
    torneio = golNaPartida(torneio, jogo.id, 'A', A.jogadores[1])
    torneio = golNaPartida(torneio, jogo.id, 'A', A.jogadores[2])
    torneio = encerrarPartida(torneio, jogo.id)
    const resultado = torneio.jogos.find((outro) => outro.id === jogo.id)!.resultado!
    // o segundo gol foi do outro time
    const gols = [resultado.gols[0], { ...resultado.gols[1], lado: 'B' as const, autorId: B.jogadores[1].id, autor: B.jogadores[1].nome }]
    torneio = corrigirResultado(torneio, jogo.id, { gols, cartoes: [], penaltis: null })
    const corrigido = torneio.jogos.find((outro) => outro.id === jogo.id)!.resultado!
    expect(corrigido.placar).toEqual([1, 1])
    expect(corrigido.sequencia).toBe(resultado.sequencia)
  })

  it('mata-mata: não corrige depois que o jogo seguinte começou; empate pede pênaltis', () => {
    let { torneio, jogo, A } = comecarPrimeiro(sorteado(torneioCom(4, 'mata-mata')))
    torneio = golNaPartida(torneio, jogo.id, 'A', A.jogadores[1])
    torneio = encerrarPartida(torneio, jogo.id)
    expect(impedimentoParaCorrigir(torneio, jogo.id)).toBeNull()
    expect(() => corrigirResultado(torneio, jogo.id, { gols: [], cartoes: [], penaltis: null })).toThrow('pênaltis')
    const comPenaltis = corrigirResultado(torneio, jogo.id, { gols: [], cartoes: [], penaltis: [4, 3] })
    expect(comPenaltis.jogos.find((outro) => outro.id === jogo.id)!.resultado!.penaltis).toEqual([4, 3])
    // joga a outra semifinal e começa a final
    const outra = comecarPrimeiro(torneio)
    torneio = encerrarPartida(golNaPartida(outra.torneio, outra.jogo.id, 'A', outra.A.jogadores[1]), outra.jogo.id)
    const final = jogosParaComecar(torneio).find((proximo) => proximo.rodada === 'Final')!
    torneio = iniciarPartida(torneio, final.id)
    expect(placarTravado(torneio, jogo.id)).toBe(true)
    expect(impedimentoParaCorrigir(torneio, jogo.id)).toBeNull() // ainda dá para corrigir autores e cartões
  })
})

describe('sigla do time', () => {
  it('sai do nome: palavra principal, sem acento; com número, a inicial e o número', () => {
    expect(siglaAutomatica('Vermelho FC')).toBe('VER')
    expect(siglaAutomatica('Esporte Clube Vitória')).toBe('VIT')
    expect(siglaAutomatica('São Paulo')).toBe('SAO')
    expect(siglaAutomatica('Time 3')).toBe('T3')
    expect(siglaDoTime({ nome: 'Flamengo', sigla: 'fla ' })).toBe('FLA')
  })
})
