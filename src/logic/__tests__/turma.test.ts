import { describe, expect, it } from 'vitest'
import { comecar, vitoria } from '..'
import { jogaramNaPelada, naTurma, nomeSugerido, parecidoNaTurma, resumoDasTurmas, sugestoes, textoDoDia, turmaDoHistorico, type JogadorDaTurma } from '../turma'
import { LISTA, sessao } from './utils'

const jt = (id: string, nome: string, peladas: number, ultimaPelada = 0, arquivado = false): JogadorDaTurma => ({ id, nome, peladas, ultimaPelada, arquivado })
const TURMA = [
  jt('j1', 'JUNINHO', 12, 10), jt('j2', 'JULIO', 3, 20), jt('j3', 'JOÃO PEDRO', 8, 5), jt('j4', 'BETO', 20, 30),
  jt('j5', 'ZÉ GOLEIRO', 2, 1), jt('j6', 'MARCÃO', 1, 1, true),
]

describe('turma: sugestões na Lista', () => {
  it('começa igual (o nome ou uma palavra), os mais frequentes primeiro, sem acento/maiúsculas', () => {
    expect(sugestoes(TURMA, 'ju', []).map((j) => j.nome)).toEqual(['JUNINHO', 'JULIO'])
    expect(sugestoes(TURMA, 'pedro', []).map((j) => j.nome)).toEqual(['JOÃO PEDRO'])
    expect(sugestoes(TURMA, 'joao', []).map((j) => j.nome)).toEqual(['JOÃO PEDRO'])
  })

  it('uma letra trocada (com 4 letras ou mais) também sugere', () => {
    expect(sugestoes(TURMA, 'junonho', []).map((j) => j.nome)).toEqual(['JUNINHO'])
  })

  it('quem já está na lista e quem foi arquivado não aparecem', () => {
    expect(sugestoes(TURMA, 'ju', [{ id: 'j1', nome: 'JUNINHO' }]).map((j) => j.nome)).toEqual(['JULIO'])
    expect(sugestoes(TURMA, 'marc', [])).toEqual([])
  })
})

describe('turma: nomes parecidos', () => {
  it('"é ele?" para uma letra de diferença ou nome com sobrenome', () => {
    expect(parecidoNaTurma(TURMA, 'JUNIHNO')).toBeNull() // duas letras trocadas: não
    expect(parecidoNaTurma(TURMA, 'JUNINH')?.nome).toBe('JUNINHO')
    expect(parecidoNaTurma(TURMA, 'BETO S')?.nome).toBe('BETO')
    expect(parecidoNaTurma(TURMA, 'JUNINHO')).toBeNull() // igual não é "parecido"
  })

  it('reconhece o jogador da pelada pelo id ou, nas peladas antigas, pelo nome', () => {
    expect(naTurma(TURMA, { id: 'j4', nome: 'OUTRO NOME' })?.id).toBe('j4')
    expect(naTurma(TURMA, { id: 'antigo', nome: 'beto' })?.id).toBe('j4')
    expect(naTurma(TURMA, { id: 'antigo', nome: 'NOVATO' })).toBeNull()
  })
})

describe('turma: a partir do histórico', () => {
  it('junta os nomes iguais das peladas antigas e conta a presença de quem jogou', () => {
    let s1 = comecar(sessao(LISTA))
    s1 = vitoria(s1, 'A')
    const s2 = vitoria(comecar(sessao(['joão', ...LISTA.slice(1)])), 'B')
    let n = 0
    const turma = turmaDoHistorico([{ data: 1, estado: s1 }, { data: 2, estado: s2 }], () => `t${++n}`)
    const joao = turma.find((j) => j.nome === 'joão')!
    expect(joao).toMatchObject({ peladas: 2, ultimaPelada: 2 }) // nome da pelada mais recente
    expect(turma.find((j) => j.nome === 'Mano')).toBeUndefined() // ficou na fila: não jogou
    expect(jogaramNaPelada(s1)).toHaveLength(8)
  })
})

describe('qual pelada é hoje', () => {
  // 01/11/2026 é domingo; 07/11/2026 é sábado
  const dia = (texto: string) => new Date(`${texto}T20:00:00`).getTime()
  const turmas = [{ id: 'quinta', nome: 'PELADA DE QUINTA' }, { id: 'sabado', nome: 'FUT DE SÁBADO' }]
  const peladas = [
    { data: dia('2026-10-29'), turma: 'quinta' }, { data: dia('2026-11-05'), turma: 'quinta' },
    { data: dia('2026-10-31'), turma: 'sabado' }, { data: dia('2026-10-24'), turma: 'sabado' },
  ]

  it('põe primeiro a turma que joga no dia de hoje, com o dia, a última e quantas', () => {
    const resumo = resumoDasTurmas(turmas, peladas, new Date('2026-11-07T10:00:00'))
    expect(resumo.map((turma) => turma.id)).toEqual(['sabado', 'quinta'])
    expect(resumo[0]).toMatchObject({ peladas: 2, diaDaSemana: 6, ultima: dia('2026-10-31') })
    expect(textoDoDia(6)).toBe('Joga aos sábados')
    expect(textoDoDia(4)).toBe('Joga às quintas')
  })

  it('sem turma do dia, a que jogou por último vem primeiro; turma nova fica sem dia', () => {
    const resumo = resumoDasTurmas([...turmas, { id: 'nova', nome: 'NOVA' }], peladas, new Date('2026-11-09T10:00:00'))
    expect(resumo.map((turma) => turma.id)).toEqual(['quinta', 'sabado', 'nova'])
    expect(resumo[2]).toMatchObject({ peladas: 0, ultima: null, diaDaSemana: null })
  })

  it('sugere o nome pelo dia de hoje', () => {
    expect(nomeSugerido(new Date('2026-11-07T10:00:00'))).toBe('PELADA DE SÁBADO')
  })
})
