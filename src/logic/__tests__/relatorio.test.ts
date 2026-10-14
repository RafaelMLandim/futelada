import { describe, expect, it } from 'vitest'
import { comecar, configPadrao, gol, peladaParaGuardar, vitoria } from '..'
import { anosDasPeladas, peladasDaTurma, relatorioDoAno } from '../relatorio'
import type { JogadorDaTurma } from '../turma'
import type { Estado } from '../../types/pelada'
import { LISTA, sessao } from './utils'

// Relatório da temporada (PLANO.md, seção 15.2).

const DIA = 24 * 3600_000
const em2026 = (dia: number) => new Date(2026, 0, 1).getTime() + dia * DIA
/** Uma pelada de um jogo: o time A (os 4 primeiros da lista) ganha com gols de `artilheiro`. */
function pelada(lista: string[], golsDoPrimeiro = 1, comGoleiros = false): Estado {
  let s = comecar(sessao(lista, { ...configPadrao, goleiros: comGoleiros ? ['ZÉ', 'TIÃO'] : [] }))
  for (let i = 0; i < golsDoPrimeiro; i++) s = gol(s, 'A', s.emCampo!.A.jogadores[0])
  return vitoria(s, 'A')
}
const guardar = (estado: Estado, dia: number, turma = 't1') => ({ ...peladaParaGuardar(estado, em2026(dia), 'x'), turma })

describe('relatório da temporada', () => {
  it('time do ano: quem mais veio (presença mínima de 65%); no empate, mais gols', () => {
    // 8 peladas com os mesmos 8: empate na presença → o João (gols) e depois quem tem mais vitórias
    const peladas = Array.from({ length: 8 }, (_, i) => guardar(pelada(LISTA), i))
    // uma pelada a mais com um craque que veio uma vez só (1 de 9 < 65%): não entra no time do ano
    peladas.push(guardar(pelada(['CRAQUE', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4']), 9))
    const r = relatorioDoAno(peladas, [], 2026)
    expect(r.peladas).toBe(9)
    expect(r.minimo).toBe(6)
    expect(r.timeDoAno.map((j) => [j.nome, j.vezesNaSelecao])).toEqual([['João', 8], ['Bruno', 8], ['Carlos', 8], ['Marcos', 8]]) // empate na presença: o João tem mais gols
    expect(r.timeDoAno.some((j) => j.nome === 'CRAQUE')).toBe(false)
    expect(r.artilheiro).toMatchObject({ nome: 'João', gols: 8 })
    expect(r.maisPresente?.peladas).toBe(8)
  })

  it('reconhece o mesmo jogador pelo id da turma (mesmo se o nome mudou) e, nas antigas, pelo nome', () => {
    const turma: JogadorDaTurma[] = [{ id: 'joao', nome: 'JOÃOZINHO', peladas: 3, ultimaPelada: 0 }]
    const p1 = guardar(pelada(['João', ...LISTA.slice(1)]), 1) // antiga: pelo nome? não — nome diferente da turma
    const comId = pelada(LISTA)
    comId.historico[0].timeA.jogadores[0] = { id: 'joao', nome: 'JOÃOZINHO' }
    comId.historico[0].gols.forEach((g) => { g.autorId = 'joao'; g.autor = 'JOÃOZINHO' })
    const r = relatorioDoAno([p1, guardar(comId, 2)], turma, 2026)
    expect(r.jogadores.find((j) => j.id === 'joao')).toMatchObject({ nome: 'JOÃOZINHO', peladas: 1, gols: 1 })
  })

  it('goleiro do ano: menor média, com presença mínima', () => {
    const peladas = [1, 2, 3, 4].map((d) => guardar(pelada(LISTA, 2, true), d))
    const r = relatorioDoAno(peladas, [], 2026)
    expect(r.goleiroDoAno).toMatchObject({ nome: 'ZÉ', sofridos: 0 }) // o ZÉ (time A) não sofreu
  })

  it('temporada é o ano; peladas sem turma ficam com a primeira turma', () => {
    const antiga = { ...peladaParaGuardar(pelada(LISTA), new Date(2025, 5, 1).getTime(), 'x') } // sem turma
    const nova = guardar(pelada(LISTA), 10, 't2')
    expect(anosDasPeladas([antiga, nova])).toEqual([2026, 2025])
    expect(peladasDaTurma([antiga, nova], 't1', 't1')).toEqual([antiga])
    expect(peladasDaTurma([antiga, nova], 't2', 't1')).toEqual([nova])
    expect(relatorioDoAno([antiga, nova], [], 2025).peladas).toBe(1)
  })

  it('time do ano: presença vem antes dos gols; quem veio menos de 65% fica de fora', () => {
    // o João (artilheiro) só veio a 6 das 10 (< 65%); o Bruno veio a todas, sem gols
    const comJoao = (i: number) => guardar(pelada(LISTA, 3), i)
    const semJoao = (i: number) => guardar(pelada(['Zeca', ...LISTA.slice(1)], 0), i)
    const peladas = [0, 1, 2, 3, 4, 5].map(comJoao).concat([6, 7, 8, 9].map(semJoao))
    const r = relatorioDoAno(peladas, [], 2026)
    expect(r.minimo).toBe(7)
    expect(r.artilheiro?.nome).toBe('João')
    expect(r.timeDoAno.some((j) => j.nome === 'João')).toBe(false)
    expect(r.timeDoAno.every((j) => j.peladas === 10)).toBe(true)
  })
})
