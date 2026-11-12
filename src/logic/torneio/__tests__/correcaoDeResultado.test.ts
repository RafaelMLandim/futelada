import { describe, expect, it } from 'vitest'
import {
  artilhariaDoTorneio, campeao, cartaoNaPartida, classificacao, corrigirResultado, diferencas, encerrarPartida, golNaPartida, impedimentoParaCorrigir,
  iniciarPartida, jogosParaComecar, placarTravado, situacaoDisciplinar, timesDoJogo,
} from '..'
import type { Gol, Placar } from '../../../types/pelada'
import type { Torneio } from '../../../types/torneio'
import { nomeDoTime, sorteado, torneioCom } from './utils'

// Corrigir o resultado de um jogo encerrado (só o organizador): em cada formato, o que muda, o que trava e o que não pode.

const jogoPorId = (torneio: Torneio, id: string) => torneio.jogos.find((jogo) => jogo.id === id)!
const timeDoLado = (torneio: Torneio, jogoId: string, lado: 'A' | 'B') => torneio.times.find((time) => time.id === timesDoJogo(torneio, jogoPorId(torneio, jogoId))[lado])!

/** Joga o jogo inteiro: gols do 1º jogador de linha de cada lado e, se preciso, os pênaltis. */
function jogar(torneio: Torneio, jogoId: string, golsA: number, golsB: number, penaltis: Placar | null = null): Torneio {
  let atual = iniciarPartida(torneio, jogoId)
  for (let gol = 0; gol < golsA; gol++) atual = golNaPartida(atual, jogoId, 'A', timeDoLado(atual, jogoId, 'A').jogadores[1])
  for (let gol = 0; gol < golsB; gol++) atual = golNaPartida(atual, jogoId, 'B', timeDoLado(atual, jogoId, 'B').jogadores[1])
  return encerrarPartida(atual, jogoId, penaltis)
}

/** Joga o próximo jogo que dá para começar (do jeito que o app oferece). */
function jogarProximo(torneio: Torneio, golsA: number, golsB: number, penaltis: Placar | null = null) {
  const jogo = jogosParaComecar(torneio)[0]
  return { torneio: jogar(torneio, jogo.id, golsA, golsB, penaltis), jogoId: jogo.id }
}

const golDe = (torneio: Torneio, jogoId: string, lado: 'A' | 'B', posicao = 1, contra = false): Gol => {
  const time = timeDoLado(torneio, jogoId, contra ? (lado === 'A' ? 'B' : 'A') : lado)
  return { lado, autorId: time.jogadores[posicao].id, autor: time.jogadores[posicao].nome, goleiroSofreu: null, ...(contra && { contra: true }) }
}
const resultadoDe = (torneio: Torneio, jogoId: string) => jogoPorId(torneio, jogoId).resultado!

describe('corrigir resultado · pontos corridos', () => {
  it('muda a tabela e a artilharia, mesmo depois de outros jogos', () => {
    let torneio = sorteado(torneioCom(4, 'pontos'))
    const primeiro = jogarProximo(torneio, 1, 0)
    torneio = jogarProximo(primeiro.torneio, 2, 2).torneio
    torneio = jogarProximo(torneio, 0, 3).torneio
    const vencedorAntes = timeDoLado(torneio, primeiro.jogoId, 'A')
    const pontosAntes = classificacao(torneio).find((linha) => linha.time === vencedorAntes.id)!.pontos
    expect(placarTravado(torneio, primeiro.jogoId)).toBe(false) // em pontos corridos nada depende do resultado
    // na verdade foi 1 x 2
    const gols = [...resultadoDe(torneio, primeiro.jogoId).gols, golDe(torneio, primeiro.jogoId, 'B'), golDe(torneio, primeiro.jogoId, 'B', 2)]
    torneio = corrigirResultado(torneio, primeiro.jogoId, { gols, cartoes: [], penaltis: null })
    expect(resultadoDe(torneio, primeiro.jogoId).placar).toEqual([1, 2])
    expect(classificacao(torneio).find((linha) => linha.time === vencedorAntes.id)!.pontos).toBe(pontosAntes - 3)
    const autor = timeDoLado(torneio, primeiro.jogoId, 'B').jogadores[2]
    expect(artilhariaDoTorneio(torneio).find((artilheiro) => artilheiro.id === autor.id)?.gols).toBe(1)
  })

  it('gol contra conta para o time certo; tirar todos os gols vira 0 x 0', () => {
    let { torneio, jogoId } = jogarProximo(sorteado(torneioCom(4, 'pontos')), 1, 1)
    torneio = corrigirResultado(torneio, jogoId, { gols: [golDe(torneio, jogoId, 'A', 3, true)], cartoes: [], penaltis: null })
    expect(resultadoDe(torneio, jogoId).placar).toEqual([1, 0])
    torneio = corrigirResultado(torneio, jogoId, { gols: [], cartoes: [], penaltis: null })
    expect(resultadoDe(torneio, jogoId).placar).toEqual([0, 0])
  })

  it('a ordem do jogo e a hora em que acabou não mudam; a nuvem recebe só esse resultado', () => {
    let { torneio, jogoId } = jogarProximo(sorteado(torneioCom(4, 'pontos')), 1, 0)
    torneio = jogarProximo(torneio, 0, 0).torneio
    const antes = resultadoDe(torneio, jogoId)
    const corrigido = corrigirResultado(torneio, jogoId, { gols: [], cartoes: [], penaltis: null })
    expect(resultadoDe(corrigido, jogoId).sequencia).toBe(antes.sequencia)
    expect(resultadoDe(corrigido, jogoId).encerradoEm).toBe(antes.encerradoEm)
    expect(diferencas(torneio, corrigido)).toEqual([{ tipo: 'resultado', jogoId, resultado: resultadoDe(corrigido, jogoId) }])
  })

  it('corrigir a última rodada muda o campeão', () => {
    let torneio = sorteado(torneioCom(2, 'pontos'))
    const { torneio: final, jogoId } = jogarProximo(torneio, 1, 0)
    torneio = final
    const lider = campeao(torneio)
    expect(lider).toBe(timeDoLado(torneio, jogoId, 'A').id)
    torneio = corrigirResultado(torneio, jogoId, { gols: [golDe(torneio, jogoId, 'B')], cartoes: [], penaltis: null })
    expect(campeao(torneio)).toBe(timeDoLado(torneio, jogoId, 'B').id)
  })

  it('jogo que não acabou não se corrige', () => {
    const torneio = sorteado(torneioCom(4, 'pontos'))
    const jogo = jogosParaComecar(torneio)[0]
    expect(impedimentoParaCorrigir(torneio, jogo.id)).toMatch('não foi encerrado')
    expect(() => corrigirResultado(torneio, jogo.id, { gols: [], cartoes: [], penaltis: null })).toThrow()
  })
})

describe('corrigir resultado · cartões e suspensões', () => {
  it('tirar o vermelho na correção tira a suspensão do jogo seguinte', () => {
    let torneio = sorteado(torneioCom(4, 'pontos'))
    const jogo = jogosParaComecar(torneio)[0]
    torneio = iniciarPartida(torneio, jogo.id)
    const expulso = timeDoLado(torneio, jogo.id, 'A').jogadores[2]
    torneio = encerrarPartida(cartaoNaPartida(torneio, jogo.id, 'A', expulso, 'vermelho', 1000), jogo.id)
    expect(situacaoDisciplinar(torneio).suspensos.has(expulso.id)).toBe(true)
    torneio = corrigirResultado(torneio, jogo.id, { gols: [], cartoes: [], penaltis: null })
    expect(situacaoDisciplinar(torneio).suspensos.has(expulso.id)).toBe(false)
  })
})

describe('corrigir resultado · mata-mata', () => {
  /** Mata-mata de 4 com disputa de 3º: semifinais m1 e m2, 3º lugar e final. */
  const chave = () => sorteado(torneioCom(4, 'mata-mata', { terceiroLugar: true }))

  it('antes da final começar, corrigir a semifinal troca quem vai para a final e para o 3º lugar', () => {
    let torneio = chave()
    const semi = jogarProximo(torneio, 2, 1)
    torneio = jogarProximo(semi.torneio, 1, 0).torneio
    const final = torneio.jogos.find((jogo) => jogo.rodada === 'Final')!
    const terceiro = torneio.jogos.find((jogo) => jogo.rodada === 'Disputa de 3º lugar')!
    const quemGanhou = timeDoLado(torneio, semi.jogoId, 'A').id
    const quemPerdeu = timeDoLado(torneio, semi.jogoId, 'B').id
    expect(Object.values(timesDoJogo(torneio, final))).toContain(quemGanhou)
    expect(placarTravado(torneio, semi.jogoId)).toBe(false)
    // foi 2 x 3
    const gols = [...resultadoDe(torneio, semi.jogoId).gols, golDe(torneio, semi.jogoId, 'B'), golDe(torneio, semi.jogoId, 'B')]
    torneio = corrigirResultado(torneio, semi.jogoId, { gols, cartoes: [], penaltis: null })
    expect(Object.values(timesDoJogo(torneio, final))).toContain(quemPerdeu)
    expect(Object.values(timesDoJogo(torneio, final))).not.toContain(quemGanhou)
    expect(Object.values(timesDoJogo(torneio, terceiro))).toContain(quemGanhou)
  })

  it('depois que o 3º lugar ou a final começou, o placar da semifinal trava; o autor do gol ainda corrige', () => {
    let torneio = chave()
    const semi = jogarProximo(torneio, 2, 1)
    torneio = jogarProximo(semi.torneio, 1, 0).torneio
    const proximo = jogosParaComecar(torneio)[0] // 3º lugar ou final
    torneio = iniciarPartida(torneio, proximo.id)
    expect(placarTravado(torneio, semi.jogoId)).toBe(true)
    const golsAntes = resultadoDe(torneio, semi.jogoId).gols
    // mudar o placar: não pode
    expect(() => corrigirResultado(torneio, semi.jogoId, { gols: golsAntes.slice(0, 2), cartoes: [], penaltis: null })).toThrow('placar não pode mudar')
    // trocar quem fez o primeiro gol (mesmo placar): pode
    const outroAutor = golDe(torneio, semi.jogoId, 'A', 3)
    const corrigido = corrigirResultado(torneio, semi.jogoId, { gols: [outroAutor, ...golsAntes.slice(1)], cartoes: [], penaltis: null })
    expect(resultadoDe(corrigido, semi.jogoId).placar).toEqual([2, 1])
    expect(resultadoDe(corrigido, semi.jogoId).gols[0].autorId).toBe(outroAutor.autorId)
  })

  it('o placar continua travado depois que o jogo seguinte acabou', () => {
    let torneio = chave()
    const semi = jogarProximo(torneio, 1, 0)
    torneio = jogarProximo(semi.torneio, 1, 0).torneio
    torneio = jogarProximo(torneio, 1, 0).torneio
    expect(placarTravado(torneio, semi.jogoId)).toBe(true)
  })

  it('empatar na correção pede pênaltis; deixar de empatar apaga os pênaltis', () => {
    let { torneio, jogoId } = jogarProximo(chave(), 1, 1, [4, 3])
    expect(resultadoDe(torneio, jogoId).penaltis).toEqual([4, 3])
    // virou 2 x 1: sem pênaltis
    const gols = [...resultadoDe(torneio, jogoId).gols, golDe(torneio, jogoId, 'A', 2)]
    torneio = corrigirResultado(torneio, jogoId, { gols, cartoes: [], penaltis: [4, 3] })
    expect(resultadoDe(torneio, jogoId).penaltis).toBeNull()
    // voltou ao empate sem dizer os pênaltis: não pode; pênaltis empatados: não pode
    const empate = gols.slice(0, 2)
    expect(() => corrigirResultado(torneio, jogoId, { gols: empate, cartoes: [], penaltis: null })).toThrow('pênaltis')
    expect(() => corrigirResultado(torneio, jogoId, { gols: empate, cartoes: [], penaltis: [3, 3] })).toThrow('pênaltis')
    torneio = corrigirResultado(torneio, jogoId, { gols: empate, cartoes: [], penaltis: [2, 4] })
    expect(resultadoDe(torneio, jogoId).penaltis).toEqual([2, 4])
  })

  it('com o placar travado, os pênaltis também não mudam', () => {
    let torneio = chave()
    const semi = jogarProximo(torneio, 0, 0, [5, 4])
    torneio = jogarProximo(semi.torneio, 1, 0).torneio
    torneio = iniciarPartida(torneio, jogosParaComecar(torneio)[0].id)
    expect(() => corrigirResultado(torneio, semi.jogoId, { gols: [], cartoes: [], penaltis: [4, 5] })).toThrow('placar não pode mudar')
    expect(() => corrigirResultado(torneio, semi.jogoId, { gols: [], cartoes: [], penaltis: [5, 4] })).not.toThrow()
  })

  it('corrigir a final muda o campeão', () => {
    let torneio = sorteado(torneioCom(2, 'mata-mata'))
    const final = jogarProximo(torneio, 1, 0)
    torneio = final.torneio
    expect(campeao(torneio)).toBe(timeDoLado(torneio, final.jogoId, 'A').id)
    torneio = corrigirResultado(torneio, final.jogoId, { gols: [golDe(torneio, final.jogoId, 'B'), golDe(torneio, final.jogoId, 'B')], cartoes: [], penaltis: null })
    expect(campeao(torneio)).toBe(timeDoLado(torneio, final.jogoId, 'B').id)
  })
})

describe('corrigir resultado · ida e volta', () => {
  const chave = () => sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true }))

  it('a ida pode virar empate sem pênaltis; depois que a volta começa, o placar da ida trava', () => {
    let torneio = chave()
    torneio = jogar(torneio, 'm1', 2, 0)
    torneio = corrigirResultado(torneio, 'm1', { gols: [], cartoes: [], penaltis: null })
    expect(resultadoDe(torneio, 'm1')).toMatchObject({ placar: [0, 0], penaltis: null })
    torneio = jogar(torneio, 'm2', 1, 0)
    torneio = iniciarPartida(torneio, 'm3') // volta do m1
    expect(placarTravado(torneio, 'm1')).toBe(true)
    expect(placarTravado(torneio, 'm2')).toBe(false) // a volta do m2 ainda não começou
  })

  it('na volta, o agregado empatado pede pênaltis', () => {
    let torneio = chave()
    torneio = jogar(torneio, 'm1', 1, 0) // ida: lado A da ida faz 1
    torneio = jogar(torneio, 'm3', 2, 0) // volta: o time de fora da ida (lado A da volta) faz 2 → agregado 2 x 1
    expect(() => corrigirResultado(torneio, 'm3', { gols: [golDe(torneio, 'm3', 'A')], cartoes: [], penaltis: null })).toThrow('pênaltis')
    const corrigido = corrigirResultado(torneio, 'm3', { gols: [golDe(torneio, 'm3', 'A')], cartoes: [], penaltis: [3, 2] })
    expect(resultadoDe(corrigido, 'm3').penaltis).toEqual([3, 2])
  })
})

describe('corrigir resultado · grupos + mata-mata', () => {
  const torneioDeGrupos = () => sorteado(torneioCom(8, 'grupos', { grupos: 2, classificamPorGrupo: 2 }))

  it('antes do mata-mata, corrigir um jogo do grupo muda os classificados; depois que o mata-mata começa, trava', () => {
    let torneio = torneioDeGrupos()
    const jogosDoGrupo = torneio.jogos.filter((jogo) => jogo.fase === 'grupo')
    const primeiro = jogosDoGrupo[0].id
    for (const jogo of jogosDoGrupo) torneio = jogar(torneio, jogo.id, jogo.id === primeiro ? 3 : 0, 0)
    const grupo = jogoPorId(torneio, primeiro).grupo!
    const lider = classificacao(torneio, grupo)[0].time
    expect(lider).toBe(timeDoLado(torneio, primeiro, 'A').id)
    expect(placarTravado(torneio, primeiro)).toBe(false)
    // foi 0 x 3: o outro time passa a liderar
    const gols = [golDe(torneio, primeiro, 'B'), golDe(torneio, primeiro, 'B'), golDe(torneio, primeiro, 'B')]
    torneio = corrigirResultado(torneio, primeiro, { gols, cartoes: [], penaltis: null })
    expect(classificacao(torneio, grupo)[0].time).toBe(timeDoLado(torneio, primeiro, 'B').id)
    // começa o mata-mata: os jogos dos grupos travam o placar
    torneio = iniciarPartida(torneio, jogosParaComecar(torneio)[0].id)
    expect(placarTravado(torneio, primeiro)).toBe(true)
    expect(() => corrigirResultado(torneio, primeiro, { gols: [], cartoes: [], penaltis: null })).toThrow('placar não pode mudar')
  })
})

describe('corrigir resultado · nomes', () => {
  it('os times do jogo continuam os mesmos depois da correção', () => {
    let { torneio, jogoId } = jogarProximo(sorteado(torneioCom(4, 'pontos')), 1, 0)
    const antes = [nomeDoTime(torneio, timeDoLado(torneio, jogoId, 'A').id), nomeDoTime(torneio, timeDoLado(torneio, jogoId, 'B').id)]
    torneio = corrigirResultado(torneio, jogoId, { gols: [], cartoes: [], penaltis: null })
    expect([nomeDoTime(torneio, timeDoLado(torneio, jogoId, 'A').id), nomeDoTime(torneio, timeDoLado(torneio, jogoId, 'B').id)]).toEqual(antes)
  })
})
