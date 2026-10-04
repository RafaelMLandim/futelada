import { describe, expect, it } from 'vitest'
import { adicionarJogador, atualizarSubiram, comecar, empate, novoJogador, removerJogador, subiuDe, timesDaFila, vitoria } from '..'
import type { Estado, Jogador } from '../../types/pelada'
import { sessao } from './utils'

// Cenário completo de uma pelada (PLANO.md, seção 3), passo a passo, com 4 na linha.
// Os jogadores se chamam J1, J2... na ordem de chegada; "J5↑2" = J5 subiu do Time 2.

const fazer = (s: Estado, fn: (e: Estado) => Estado) => atualizarSubiram(s, fn(s))
const id = (s: Estado, nome: string) => [...s.fila, ...s.emCampo!.A.jogadores, ...s.emCampo!.B.jogadores].find((j) => j.nome === nome)!.id
const nomes = (s: Estado, js: Jogador[]) => js.map((j) => j.nome + (subiuDe(s, j.id) ? `↑${subiuDe(s, j.id)}` : '')).join(' ')
const retrato = (s: Estado) => {
  const { A, B } = s.emCampo!
  return `campo: T${A.numero}[${nomes(s, A.jogadores)}] x T${B.numero}[${nomes(s, B.jogadores)}] | fila: ` +
    timesDaFila(s).map((t) => `T${t.numero}[${nomes(s, t.jogadores)}]`).join(' ')
}

describe('cenário completo de rodízio', () => {
  it('perdas, time incompleto, atrasados, alguém indo embora e empates', () => {
    const passos: string[] = []
    let s = comecar(sessao(Array.from({ length: 14 }, (_, i) => `J${i + 1}`)))
    passos.push('0 começo         ' + retrato(s))
    s = fazer(s, (e) => vitoria(e, 'A')); passos.push('1 T1 vence T2    ' + retrato(s))
    s = fazer(s, (e) => vitoria(e, 'B')); passos.push('2 T3 vence T1    ' + retrato(s))
    s = fazer(s, (e) => adicionarJogador(e, novoJogador('J15'))); passos.push('3 chega J15      ' + retrato(s))
    s = fazer(s, (e) => removerJogador(e, id(e, 'J6'))); passos.push('4 J6 foi embora  ' + retrato(s))
    s = fazer(s, (e) => empate(e, 'A')); passos.push('5 empate, sai A  ' + retrato(s))
    s = fazer(s, (e) => adicionarJogador(adicionarJogador(e, novoJogador('J16')), novoJogador('J17'))); passos.push('6 chegam J16 J17 ' + retrato(s))
    s = fazer(s, (e) => empate(e, 'B')); passos.push('7 empate, 2 saem ' + retrato(s))
    s = fazer(s, (e) => vitoria(e, 'A')); passos.push('8 T1 vence T4    ' + retrato(s))
    s = fazer(s, (e) => removerJogador(e, id(e, 'J1'))); passos.push('9 J1 foi embora  ' + retrato(s))
    expect(passos).toEqual([
      '0 começo         campo: T1[J1 J2 J3 J4] x T2[J5 J6 J7 J8] | fila: T3[J9 J10 J11 J12] T4[J13 J14]',
      '1 T1 vence T2    campo: T1[J1 J2 J3 J4] x T3[J9 J10 J11 J12] | fila: T4[J13 J14 J5↑2 J6↑2] T2[J7 J8]',
      '2 T3 vence T1    campo: T4[J13 J14 J5 J6] x T3[J9 J10 J11 J12] | fila: T2[J7 J8 J1↑1 J2↑1] T1[J3 J4]',
      '3 chega J15      campo: T4[J13 J14 J5 J6] x T3[J9 J10 J11 J12] | fila: T2[J7 J8 J1↑1 J2↑1] T1[J3 J4 J15]',
      '4 J6 foi embora  campo: T4[J13 J14 J5 J7↑2] x T3[J9 J10 J11 J12] | fila: T2[J8 J1 J2 J3↑1] T1[J4 J15]',
      '5 empate, sai A  campo: T2[J8 J1 J2 J3] x T3[J9 J10 J11 J12] | fila: T1[J4 J15 J13↑4 J14↑4] T4[J5 J7]',
      '6 chegam J16 J17 campo: T2[J8 J1 J2 J3] x T3[J9 J10 J11 J12] | fila: T1[J4 J15 J13↑4 J14↑4] T4[J5 J7 J16 J17]',
      '7 empate, 2 saem campo: T1[J4 J15 J13↑4 J14↑4] x T4[J5 J7 J16 J17] | fila: T3[J9 J10 J11 J12] T2[J8 J1 J2 J3]',
      '8 T1 vence T4    campo: T1[J4 J15 J13↑4 J14↑4] x T3[J9 J10 J11 J12] | fila: T2[J8 J1 J2 J3] T4[J5 J7 J16 J17]',
      '9 J1 foi embora  campo: T1[J4 J15 J13 J14] x T3[J9 J10 J11 J12] | fila: T2[J8 J2 J3 J5↑4] T4[J7 J16 J17]',
    ])
  })
})
