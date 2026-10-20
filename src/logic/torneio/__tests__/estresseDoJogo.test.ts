// Estresse do jogo do torneio: torneios inteiros com jogadas aleatórias (só as que a tela oferece),
// conferindo depois de cada jogada que ninguém some, ninguém está em dois lugares e o placar bate.

import { describe, expect, it } from 'vitest'
import {
  artilhariaDoTorneio, cartaoNaPartida, cartoesDoTorneio, encerrarPartida, expulsosNaPartida, goleiroNaPartida, goleirosDoTorneio, golNaPartida,
  golVazioPorExpulsao, iniciarPartida, irParaOGol, jogosParaComecar, removerGolDaPartida, situacaoDisciplinar, substituirNaPartida, timesDoJogo,
} from '..'
import type { CorCartao, Lado } from '../../../types/pelada'
import type { Torneio } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

/** Sorteio repetível (mulberry32). */
function geradorDeSorteio(semente: number) {
  let estado = semente
  const proximo = () => {
    estado = (estado + 0x6d2b79f5) | 0
    let valor = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    valor = (valor + Math.imul(valor ^ (valor >>> 7), 61 | valor)) ^ valor
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296
  }
  const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)]
  return { proximo, escolher }
}

const LADOS_DO_JOGO: Lado[] = ['A', 'B']
const CORES: CorCartao[] = ['amarelo', 'amarelo', 'vermelho', 'azul']
const ACOES = ['gol', 'gol', 'contra', 'remover', 'cartao', 'cartao', 'substituir', 'goleiro da linha', 'goleiro do banco'] as const

function conferirJogo(torneio: Torneio, jogoId: string, contexto: string) {
  const partida = torneio.emAndamento.find((andamento) => andamento.jogoId === jogoId)!
  const jogo = torneio.jogos.find((candidato) => candidato.id === jogoId)!
  const ids = timesDoJogo(torneio, jogo)
  const expulsos = expulsosNaPartida(partida)
  const { escalacao } = partida
  for (const lado of LADOS_DO_JOGO) {
    const time = torneio.times.find((candidato) => candidato.id === ids[lado])!
    const lugares = [...escalacao.emCampo[lado], ...escalacao.banco[lado], ...escalacao.suspensos[lado]]
    // cada jogador do time está em exatamente um lugar (expulso continua em campo, riscado)
    expect([...lugares].sort(), `${contexto}: lugares do ${lado}`).toEqual(time.jogadores.map((jogador) => jogador.id).sort())
    const goleiro = goleiroNaPartida(torneio, partida, lado)
    if (goleiro) {
      expect(escalacao.emCampo[lado], `${contexto}: goleiro fora de campo`).toContain(goleiro.id)
      expect(expulsos.has(goleiro.id), `${contexto}: goleiro expulso no gol`).toBe(false)
    }
    const limite = torneio.regras.maxSubstituicoes
    if (limite !== null) expect(escalacao.substituicoes[lado], `${contexto}: passou do limite`).toBeLessThanOrEqual(limite)
    // em campo, sem contar os expulsos: no máximo a linha mais o goleiro
    const ativos = escalacao.emCampo[lado].filter((id) => !expulsos.has(id)).length
    expect(ativos, `${contexto}: gente demais em campo`).toBeLessThanOrEqual(torneio.regras.linha + 1)
  }
  const golsDoLado = (lado: Lado) => partida.gols.filter((gol) => gol.lado === lado).length
  expect(partida.placar, `${contexto}: placar`).toEqual([golsDoLado('A'), golsDoLado('B')])
}

function jogarTorneio(semente: number) {
  const sorteio = geradorDeSorteio(semente)
  const limite = sorteio.escolher([null, 0, 1, 3])
  let torneio: Torneio = sorteado(torneioCom(4, 'pontos', { maxSubstituicoes: limite }, sorteio.escolher([4, 5, 6, 8])))
  let jogadas = 0

  while (jogosParaComecar(torneio).length > 0) {
    const jogo = jogosParaComecar(torneio)[0]
    const suspensosAntes = situacaoDisciplinar(torneio).suspensos
    torneio = iniciarPartida(torneio, jogo.id)
    // suspenso não começa jogando
    for (const lado of LADOS_DO_JOGO) {
      const escalacao = torneio.emAndamento[0].escalacao
      for (const id of [...escalacao.emCampo[lado], ...escalacao.banco[lado]]) {
        expect(suspensosAntes.has(id), `semente ${semente}: suspenso ${id} começou jogando`).toBe(false)
      }
    }

    const passos = 10 + Math.floor(sorteio.proximo() * 30)
    for (let passo = 0; passo < passos; passo++) {
      const partida = torneio.emAndamento[0]
      const lado = sorteio.escolher(LADOS_DO_JOGO)
      const time = torneio.times.find((candidato) => candidato.id === timesDoJogo(torneio, jogo)[lado])!
      const expulsos = expulsosNaPartida(partida)
      const emCampo = partida.escalacao.emCampo[lado].filter((id) => !expulsos.has(id))
      const banco = partida.escalacao.banco[lado]
      const goleiro = goleiroNaPartida(torneio, partida, lado)
      const podeSubstituir = limite === null || partida.escalacao.substituicoes[lado] < limite
      const jogadorPorId = (id: string) => time.jogadores.find((jogador) => jogador.id === id)!
      const acao = sorteio.escolher(ACOES)
      const contexto = `semente ${semente}, jogo ${jogo.id}, passo ${passo} (${acao} ${lado})`
      if (acao === 'gol' && emCampo.length) {
        torneio = golNaPartida(torneio, jogo.id, lado, jogadorPorId(sorteio.escolher(emCampo)), 1000)
      } else if (acao === 'contra' && emCampo.length) {
        torneio = golNaPartida(torneio, jogo.id, lado === 'A' ? 'B' : 'A', jogadorPorId(sorteio.escolher(emCampo)), 1000, true)
      } else if (acao === 'remover' && partida.gols.length) {
        torneio = removerGolDaPartida(torneio, jogo.id, Math.floor(sorteio.proximo() * partida.gols.length))
      } else if (acao === 'cartao' && emCampo.length) {
        torneio = cartaoNaPartida(torneio, jogo.id, lado, jogadorPorId(sorteio.escolher(emCampo)), sorteio.escolher(CORES), 1000)
      } else if (acao === 'substituir' && emCampo.length && banco.length && podeSubstituir) {
        const sai = sorteio.escolher(emCampo)
        const entra = sorteio.escolher(banco)
        torneio = substituirNaPartida(torneio, jogo.id, lado, sai, entra)
        // quem substitui o goleiro vira o goleiro
        if (sai === goleiro?.id) expect(goleiroNaPartida(torneio, torneio.emAndamento[0], lado)?.id, contexto).toBe(entra)
      } else if (acao === 'goleiro da linha' && emCampo.length) {
        const vai = sorteio.escolher(emCampo)
        torneio = irParaOGol(torneio, jogo.id, lado, vai)
        expect(goleiroNaPartida(torneio, torneio.emAndamento[0], lado)?.id, contexto).toBe(vai)
      } else if (acao === 'goleiro do banco' && banco.length && !goleiro && !golVazioPorExpulsao(partida, lado)) {
        torneio = irParaOGol(torneio, jogo.id, lado, sorteio.escolher(banco))
      }
      jogadas++
      conferirJogo(torneio, jogo.id, contexto)
      // ida e volta da nuvem não muda nada
      expect(JSON.parse(JSON.stringify(torneio)), contexto).toEqual(torneio)
    }
    torneio = encerrarPartida(torneio, jogo.id)
  }

  // estatísticas fecham com os resultados
  const resultados = torneio.jogos.flatMap((jogo) => (jogo.resultado ? [jogo.resultado] : []))
  const golsComAutor = resultados.flatMap((resultado) => resultado.gols).filter((gol) => gol.autorId && !gol.contra).length
  expect(artilhariaDoTorneio(torneio).reduce((soma, artilheiro) => soma + artilheiro.gols, 0)).toBe(golsComAutor)
  for (const artilheiro of artilhariaDoTorneio(torneio)) expect(artilheiro.time, `${artilheiro.nome} sem time`).not.toBe('')
  for (const goleiro of goleirosDoTorneio(torneio)) expect(goleiro.time, `goleiro ${goleiro.nome} sem time`).not.toBe('')
  expect(() => cartoesDoTorneio(torneio)).not.toThrow()
  return jogadas
}

describe('estresse do jogo do torneio', () => {
  it('120 torneios com jogadas aleatórias mantêm a escalação, o goleiro e o placar coerentes', { timeout: 120_000 }, () => {
    let jogadas = 0
    for (let semente = 1; semente <= 120; semente++) jogadas += jogarTorneio(semente)
    expect(jogadas).toBeGreaterThan(2_000)
  })
})
