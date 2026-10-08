import { describe, expect, it } from 'vitest'
import {
  acrescimosNaPartida, aplicarOperacoes, campeao, cartaoNaPartida, comecarIntervalo, comecarProrrogacao, decorridoNoPeriodo, diferencas, encerrarPartida,
  golNaPartida, iniciarPartida, jogosDisponiveis, juntar, nomeDoPeriodo, partidaDoJogo, precisaDePenaltis, proximoTempo, registrarResultado, removerGolDaPartida,
  resolverOrigem, separar, temposDaFase, ultimoPeriodo, vaiParaProrrogacao, vencedor,
} from '..'
import { restanteAzulNaLista } from '../../cartoes'
import { tempoDecorrido } from '../../cronometro'
import { completar } from '../../../store/torneio'
import type { RegrasTorneio, Torneio } from '../../../types/torneio'
import { nomeDoTime, resultado, sorteado, torneioCom } from './utils'

// Todas as combinações de tempos, intervalo, prorrogação e pênaltis (PLANO.md, seção 9.4.2).

const MIN = 60_000
const jogo = (t: Torneio, id: string) => t.jogos.find((j) => j.id === id)!
const partida = (t: Torneio, id: string) => partidaDoJogo(t, id)!

/** Relógio corre `min` minutos e para. */
function correr(t: Torneio, id: string, min: number): Torneio {
  return {
    ...t,
    emAndamento: t.emAndamento.map((p) => (p.jogoId === id
      ? { ...p, crono: { ...p.crono, rodando: false, inicio: 0, acumulado: p.crono.acumulado + min * MIN } }
      : p)),
  }
}

/** Joga o tempo atual até o fim (duração do tempo). */
const jogarOTempo = (t: Torneio, id: string) => {
  const p = partida(t, id)
  return correr(t, id, (p.prorrogacao ? t.regras.minutosProrrogacao : t.regras.tempoMin))
}

/** Joga todos os tempos da fase atual (com ou sem intervalo) e para no fim do último. */
function jogarFase(t: Torneio, id: string): Torneio {
  t = jogarOTempo(t, id)
  while (!ultimoPeriodo(t.regras, partida(t, id))) {
    if (t.regras.intervaloMin > 0) t = comecarIntervalo(t, id)
    t = proximoTempo(t, id)
    t = jogarOTempo(t, id)
  }
  return t
}

function final(regras: Partial<RegrasTorneio>) {
  const t = sorteado(torneioCom(2, 'mata-mata', regras))
  return { t: iniciarPartida(t, 'm1'), id: 'm1' }
}

describe('todas as combinações de tempos e intervalo', () => {
  for (const tempos of [1, 2, 3, 4]) {
    for (const intervaloMin of [0, 5]) {
      it(`${tempos} tempo(s), intervalo ${intervaloMin} min: passa por todos os tempos na ordem e para no último`, () => {
        let { t, id } = final({ tempos, tempoMin: 7, intervaloMin })
        const vistos: string[] = []
        t = jogarOTempo(t, id)
        vistos.push(nomeDoPeriodo(t.regras, partida(t, id)))
        while (!ultimoPeriodo(t.regras, partida(t, id))) {
          if (intervaloMin) {
            t = comecarIntervalo(t, id, 1_000)
            expect(partida(t, id).intervaloAte).toBe(1_000 + intervaloMin * MIN)
            expect(partida(t, id).crono.rodando).toBe(false)
          }
          t = proximoTempo(t, id)
          expect(decorridoNoPeriodo(partida(t, id))).toBe(0) // cada tempo começa do zero
          expect(partida(t, id).intervaloAte).toBeNull()
          t = jogarOTempo(t, id)
          vistos.push(nomeDoPeriodo(t.regras, partida(t, id)))
        }
        expect(vistos).toEqual(tempos === 1 ? [''] : Array.from({ length: tempos }, (_, i) => `${i + 1}º tempo`))
        // o jogo inteiro durou tempos × 7 min (o intervalo não conta)
        expect(tempoDecorrido(partida(t, id).crono)).toBe(tempos * 7 * MIN)
        expect(() => proximoTempo(t, id)).toThrow('último')
      })
    }
  }

  it('acréscimos valem só para o tempo em que foram dados', () => {
    let { t, id } = final({ tempos: 2, tempoMin: 10 })
    t = jogarOTempo(t, id)
    t = acrescimosNaPartida(t, id, 2)
    expect(partida(t, id).crono.acrescimoMin).toBe(2)
    t = correr(t, id, 2)
    t = proximoTempo(t, id)
    expect(partida(t, id).crono.acrescimoMin).toBeUndefined() // 2º tempo começa sem acréscimo
    expect(decorridoNoPeriodo(partida(t, id))).toBe(0)
    expect(tempoDecorrido(partida(t, id).crono)).toBe(12 * MIN)
  })

  it('cartão azul conta o jogo todo: dado no fim do 1º tempo, acaba no começo do 2º (o intervalo não conta)', () => {
    let { t, id } = final({ tempos: 2, tempoMin: 10, intervaloMin: 5, minutosAzul: 2 })
    const j = t.times[0].jogadores[0]
    t = correr(t, id, 9)
    t = cartaoNaPartida(t, id, 'A', j, 'azul', tempoDecorrido(partida(t, id).crono)) // aos 9'
    t = correr(t, id, 1)
    t = comecarIntervalo(t, id)
    t = proximoTempo(t, id)
    expect(restanteAzulNaLista(partida(t, id).cartoes, j.id, 2, tempoDecorrido(partida(t, id).crono))).toBe(1 * MIN) // falta 1 min
    t = correr(t, id, 1)
    expect(restanteAzulNaLista(partida(t, id).cartoes, j.id, 2, tempoDecorrido(partida(t, id).crono))).toBe(0)
  })

  it('o gol guarda o tempo: 3º tempo, 4º tempo; removendo um gol o placar volta', () => {
    let { t, id } = final({ tempos: 4, tempoMin: 5 })
    for (let i = 0; i < 2; i++) { t = jogarOTempo(t, id); t = proximoTempo(t, id) }
    t = golNaPartida(t, id, 'A', null, MIN)
    t = jogarOTempo(t, id); t = proximoTempo(t, id)
    t = golNaPartida(t, id, 'B', null, 2 * MIN)
    expect(partida(t, id).gols.map((g) => g.periodo)).toEqual(['3ºT', '4ºT'])
    t = removerGolDaPartida(t, id, 0)
    expect(partida(t, id).placar).toEqual([0, 1])
  })
})

describe('jogo único de mata-mata: todas as saídas', () => {
  const casos: { nome: string; regras: Partial<RegrasTorneio>; placar: [number, number]; prorroga: boolean; penaltis: boolean }[] = [
    { nome: 'vitória no tempo normal', regras: { prorrogacao: true }, placar: [2, 1], prorroga: false, penaltis: false },
    { nome: 'empate, prorrogação ligada', regras: { prorrogacao: true }, placar: [1, 1], prorroga: true, penaltis: true },
    { nome: 'empate, prorrogação desligada', regras: { prorrogacao: false }, placar: [1, 1], prorroga: false, penaltis: true },
    { nome: '0 x 0, prorrogação ligada', regras: { prorrogacao: true }, placar: [0, 0], prorroga: true, penaltis: true },
  ]
  for (const c of casos) {
    it(c.nome, () => {
      let { t, id } = final(c.regras)
      for (let i = 0; i < c.placar[0]; i++) t = golNaPartida(t, id, 'A', null, MIN)
      for (let i = 0; i < c.placar[1]; i++) t = golNaPartida(t, id, 'B', null, MIN)
      t = jogarFase(t, id)
      expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(c.prorroga)
      expect(precisaDePenaltis(t, jogo(t, id), partida(t, id).placar)).toBe(c.penaltis)
      if (!c.penaltis) {
        expect(vencedor(encerrarPartida(t, id).jogos[0], t)).toBe('A')
      }
    })
  }

  for (const temposProrrogacao of [1, 2, 3]) {
    it(`prorrogação de ${temposProrrogacao} tempo(s): gol na prorrogação decide, sem pênaltis`, () => {
      let { t, id } = final({ tempos: 2, prorrogacao: true, temposProrrogacao, minutosProrrogacao: 5 })
      t = jogarFase(t, id) // 0 x 0
      t = comecarProrrogacao(t, id)
      expect(temposDaFase(t.regras, partida(t, id))).toBe(temposProrrogacao)
      expect(nomeDoPeriodo(t.regras, partida(t, id))).toBe(temposProrrogacao === 1 ? 'Prorrogação' : '1º tempo da prorrogação')
      expect(() => comecarProrrogacao(t, id)).toThrow() // não tem segunda prorrogação
      t = jogarFase(t, id)
      t = golNaPartida(t, id, 'B', null, 4 * MIN)
      expect(partida(t, id).gols[0].periodo).toBe(temposProrrogacao === 1 ? 'Pror.' : `Pror. ${temposProrrogacao}ºT`)
      expect(precisaDePenaltis(t, jogo(t, id), partida(t, id).placar)).toBe(false)
      const fim = encerrarPartida(t, id)
      expect(vencedor(fim.jogos[0], fim)).toBe('B')
      expect(campeao(fim)).toBe(resolverOrigem(fim, jogo(fim, 'm1').fora)) // o time B (que fez o gol) é campeão
    })
  }

  it('empate também na prorrogação: pênaltis decidem e o vencedor é campeão', () => {
    let { t, id } = final({ prorrogacao: true, temposProrrogacao: 2 })
    t = golNaPartida(t, id, 'A', null, MIN); t = golNaPartida(t, id, 'B', null, MIN)
    t = jogarFase(t, id)
    t = comecarProrrogacao(t, id)
    t = golNaPartida(t, id, 'A', null, MIN); t = golNaPartida(t, id, 'B', null, MIN) // 2 x 2
    t = jogarFase(t, id)
    expect(precisaDePenaltis(t, jogo(t, id), partida(t, id).placar)).toBe(true)
    expect(() => encerrarPartida(t, id, [3, 3])).toThrow('pênaltis') // pênaltis não podem empatar
    const fim = encerrarPartida(t, id, [4, 5])
    expect(vencedor(fim.jogos[0], fim)).toBe('B')
    expect(fim.jogos[0].resultado!.placar).toEqual([2, 2])
  })

  it('encerrar antes do fim (no 1º tempo) empatado ainda oferece a prorrogação', () => {
    let { t, id } = final({ tempos: 2, prorrogacao: true })
    t = correr(t, id, 3) // 1º tempo, 3 min
    expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(true)
  })
})

describe('ida e volta: todas as saídas', () => {
  /** Torneio de 4 em ida e volta com a ida m1 já jogada. */
  function comIda(ida: [number, number], regras: Partial<RegrasTorneio>) {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, ...regras }))
    t = registrarResultado(t, 'm1', resultado(...ida))
    return iniciarPartida(t, 'm3') // volta de m1
  }

  it('a ida nunca vai para prorrogação nem pênaltis, mesmo com a prorrogação ligada', () => {
    for (const placar of [[0, 0], [2, 2], [3, 1]] as [number, number][]) {
      let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, prorrogacao: true, tempos: 2 }))
      t = iniciarPartida(t, 'm1')
      for (let i = 0; i < placar[0]; i++) t = golNaPartida(t, 'm1', 'A', null, MIN)
      for (let i = 0; i < placar[1]; i++) t = golNaPartida(t, 'm1', 'B', null, MIN)
      t = jogarFase(t, 'm1')
      expect(vaiParaProrrogacao(t, jogo(t, 'm1'), partida(t, 'm1'))).toBe(false)
      expect(precisaDePenaltis(t, jogo(t, 'm1'), partida(t, 'm1').placar)).toBe(false)
      expect(encerrarPartida(t, 'm1').jogos.find((j) => j.id === 'm1')!.resultado!.placar).toEqual(placar)
    }
  })

  // volta: lado A é o time de fora da ida. Ida 2 x 1 → quem jogou fora na ida precisa de 1 gol de diferença
  const casos: { nome: string; ida: [number, number]; volta: [number, number]; prorrogacao: boolean; prorroga: boolean; penaltis: boolean }[] = [
    { nome: 'agregado com vencedor (sem gol fora de casa)', ida: [2, 1], volta: [2, 2], prorrogacao: true, prorroga: false, penaltis: false },
    { nome: 'agregado empatado, prorrogação ligada', ida: [2, 1], volta: [1, 0], prorrogacao: true, prorroga: true, penaltis: true },
    { nome: 'agregado empatado, prorrogação desligada → pênaltis', ida: [2, 1], volta: [1, 0], prorrogacao: false, prorroga: false, penaltis: true },
    { nome: 'ida e volta 0 x 0, prorrogação ligada', ida: [0, 0], volta: [0, 0], prorrogacao: true, prorroga: true, penaltis: true },
    { nome: 'mais gols fora de casa NÃO desempata (2 x 2 agregado)', ida: [0, 2], volta: [0, 2], prorrogacao: true, prorroga: true, penaltis: true },
  ]
  for (const c of casos) {
    it(c.nome, () => {
      let t = comIda(c.ida, { prorrogacao: c.prorrogacao })
      for (let i = 0; i < c.volta[0]; i++) t = golNaPartida(t, 'm3', 'A', null, MIN)
      for (let i = 0; i < c.volta[1]; i++) t = golNaPartida(t, 'm3', 'B', null, MIN)
      t = jogarFase(t, 'm3')
      expect(vaiParaProrrogacao(t, jogo(t, 'm3'), partida(t, 'm3'))).toBe(c.prorroga)
      expect(precisaDePenaltis(t, jogo(t, 'm3'), partida(t, 'm3').placar)).toBe(c.penaltis)
    })
  }

  it('prorrogação da volta: gol decide no agregado; senão, pênaltis; quem vence vai para a final', () => {
    // gol na prorrogação
    let t = comIda([2, 1], { prorrogacao: true })
    t = golNaPartida(t, 'm3', 'A', null, MIN) // agregado 2 x 2
    t = jogarFase(t, 'm3')
    t = comecarProrrogacao(t, 'm3')
    t = golNaPartida(t, 'm3', 'B', null, MIN) // agregado 2 x 3 para o lado B da volta (casa da ida)
    t = jogarFase(t, 'm3')
    expect(precisaDePenaltis(t, jogo(t, 'm3'), partida(t, 'm3').placar)).toBe(false)
    let fim = encerrarPartida(t, 'm3')
    const casaDaIda = nomeDoTime(fim, resolverOrigem(fim, jogo(fim, 'm1').casa))
    expect(nomeDoTime(fim, resolverOrigem(fim, { tipo: 'vencedor', jogo: 'm3' }))).toBe(casaDaIda)

    // empate na prorrogação → pênaltis
    t = comIda([2, 1], { prorrogacao: true })
    t = golNaPartida(t, 'm3', 'A', null, MIN)
    t = jogarFase(t, 'm3')
    t = comecarProrrogacao(t, 'm3')
    t = jogarFase(t, 'm3')
    expect(precisaDePenaltis(t, jogo(t, 'm3'), partida(t, 'm3').placar)).toBe(true)
    fim = encerrarPartida(t, 'm3', [5, 4])
    const foraDaIda = nomeDoTime(fim, resolverOrigem(fim, jogo(fim, 'm1').fora))
    expect(nomeDoTime(fim, resolverOrigem(fim, { tipo: 'vencedor', jogo: 'm3' }))).toBe(foraDaIda) // lado A da volta venceu nos pênaltis
  })

  it('final em jogo único depois das voltas também tem prorrogação', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { mataIdaEVolta: true, finalUnica: true, prorrogacao: true }))
    for (const [id, p] of [['m1', [1, 0]], ['m2', [1, 0]], ['m3', [0, 0]], ['m4', [0, 0]]] as [string, [number, number]][]) {
      t = registrarResultado(t, id, resultado(...p))
    }
    const final = jogosDisponiveis(t).find((j) => j.rodada === 'Final')!
    expect(final.perna).toBeUndefined()
    t = iniciarPartida(t, final.id)
    t = jogarFase(t, final.id)
    expect(vaiParaProrrogacao(t, jogo(t, final.id), partida(t, final.id))).toBe(true)
  })
})

describe('outros formatos e situações', () => {
  it('pontos corridos e fase de grupos: empate é empate (sem prorrogação nem pênaltis)', () => {
    for (const formato of ['pontos', 'grupos'] as const) {
      let t = sorteado(torneioCom(8, formato, { prorrogacao: true, tempos: 2, grupos: 2 }))
      const id = t.jogos.find((j) => j.fase !== 'mata')!.id
      t = iniciarPartida(t, id)
      t = jogarFase(t, id)
      expect(vaiParaProrrogacao(t, jogo(t, id), partida(t, id))).toBe(false)
      expect(encerrarPartida(t, id).jogos.find((j) => j.id === id)!.resultado!.placar).toEqual([0, 0])
    }
  })

  it('disputa de 3º lugar empatada vai para a prorrogação', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { terceiroLugar: true, prorrogacao: true }))
    t = registrarResultado(t, 'm1', resultado(1, 0))
    t = registrarResultado(t, 'm2', resultado(1, 0))
    const terceiro = jogosDisponiveis(t).find((j) => /3/.test(j.rodada))!
    t = iniciarPartida(t, terceiro.id)
    t = jogarFase(t, terceiro.id)
    expect(vaiParaProrrogacao(t, jogo(t, terceiro.id), partida(t, terceiro.id))).toBe(true)
  })

  it('dois jogos ao mesmo tempo: cada um no seu tempo (um na prorrogação, outro no 1º tempo)', () => {
    let t = sorteado(torneioCom(4, 'mata-mata', { campos: 2, tempos: 2, prorrogacao: true }))
    t = iniciarPartida(t, 'm1')
    t = iniciarPartida(t, 'm2')
    t = jogarFase(t, 'm1')
    t = comecarProrrogacao(t, 'm1')
    expect(partida(t, 'm1')).toMatchObject({ prorrogacao: true, periodo: 1 })
    expect(partida(t, 'm2').prorrogacao).toBeUndefined()
    expect(partida(t, 'm2').periodo).toBeUndefined() // ainda no 1º tempo
  })

  it('compartilhado: tempo, intervalo e prorrogação vão para a nuvem e voltam iguais nos outros celulares', () => {
    let { t, id } = final({ tempos: 2, intervaloMin: 3, prorrogacao: true })
    t = { ...t, nuvem: { codigo: 'ABC123', organizador: 'u1' } }
    let nuvem = separar(t)
    const passo = (novo: Torneio) => { nuvem = aplicarOperacoes(nuvem, diferencas(t, novo)); t = novo }
    passo(jogarOTempo(t, id))
    passo(comecarIntervalo(t, id, 5_000))
    expect(juntar(nuvem)!.emAndamento[0].intervaloAte).toBe(5_000 + 3 * MIN)
    passo(proximoTempo(t, id))
    passo(jogarOTempo(t, id))
    passo(comecarProrrogacao(t, id))
    expect(juntar(nuvem)!.emAndamento[0]).toEqual(partida(t, id))
  })

  it('torneio antigo (sem as regras novas) ganha 1 tempo, sem intervalo e sem prorrogação', () => {
    const { t } = final({})
    const { tempos: _a, intervaloMin: _b, prorrogacao: _c, temposProrrogacao: _d, minutosProrrogacao: _e, ...antigas } = t.regras
    const antigo = completar({ ...t, regras: antigas as RegrasTorneio })
    expect(antigo.regras).toMatchObject({ tempos: 1, intervaloMin: 0, prorrogacao: false, temposProrrogacao: 2, minutosProrrogacao: 5 })
    // partida antiga (sem os campos de tempo): continua no 1º tempo, que é o último
    expect(ultimoPeriodo(antigo.regras, antigo.emAndamento[0])).toBe(true)
    expect(nomeDoPeriodo(antigo.regras, antigo.emAndamento[0])).toBe('')
  })
})
