import { describe, expect, it } from 'vitest'
import {
  atualizarSubiram, comecar, empate, encerrarComSubstitutos, jogaramNaPelada, machucou, removerJogador, substitutoDe, substitutosParaDecidir,
  todosOsJogadores, vitoria, voltouDoMachucado,
} from '..'
import type { Estado } from '../../types/pelada'
import { blocos, nomes, sessao } from './utils'

// A B C D (Time 1) x E F G H (Time 2); fila I J K L (Time 3), M N (Time 4)
const inicio = () => comecar(sessao('ABCDEFGHIJKLMN'.split('')))
const id = (s: Estado, nome: string) => [...s.emCampo!.A.jogadores, ...s.emCampo!.B.jogadores, ...s.fila].find((j) => j.nome === nome)!.id

describe('jogador machucado', () => {
  it('machucou: o primeiro da fila entra no lugar e o machucado sai da fila', () => {
    const antes = inicio()
    expect(machucou(antes, 'A', 'x')).toBe(antes) // jogador que não está em campo: nada muda
    const m = machucou(antes, 'A', id(antes, 'B'))
    expect(nomes(m.emCampo!.A.jogadores)).toEqual(['A', 'I', 'C', 'D'])
    expect(blocos(m)).toEqual([['J', 'K', 'L', 'M'], ['N']])
    expect(m.machucados).toMatchObject([{ jogador: { nome: 'B' }, time: 1, substituto: { nome: 'I', deTime: 3 } }])
    expect(substitutoDe(m, id(m, 'I'))?.jogador.nome).toBe('B')
    expect(nomes(todosOsJogadores(m))).toContain('B') // continua na pelada (campo pago, nome repetido)
  })

  it('voltou na mesma partida: a lista volta a ser como era antes', () => {
    const antes = inicio()
    const m = machucou(antes, 'A', id(antes, 'B'))
    const v = voltouDoMachucado(m, id(antes, 'B'))
    expect(nomes(v.emCampo!.A.jogadores)).toEqual(['A', 'B', 'C', 'D'])
    expect(blocos(v)).toEqual(blocos(antes))
    expect(v.filaTimes).toEqual(antes.filaTimes)
    expect(v.machucados).toEqual([])
  })

  it('dois machucados no mesmo jogo voltando: a fila volta na ordem', () => {
    const antes = inicio()
    let s = machucou(antes, 'A', id(antes, 'B'))
    s = machucou(s, 'B', id(antes, 'F'))
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['E', 'J', 'G', 'H'])
    s = voltouDoMachucado(s, id(antes, 'B'))
    s = voltouDoMachucado(s, id(antes, 'F'))
    expect(blocos(s)).toEqual(blocos(antes))
  })

  it('dois machucados voltando na ordem contrária: a fila também volta na ordem', () => {
    const antes = inicio()
    let s = machucou(antes, 'A', id(antes, 'B'))
    s = machucou(s, 'B', id(antes, 'F'))
    s = voltouDoMachucado(s, id(antes, 'F'))
    s = voltouDoMachucado(s, id(antes, 'B'))
    expect(blocos(s)).toEqual(blocos(antes))
  })

  it('time do substituto venceu: ele fica no time, sem pergunta', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    expect(substitutosParaDecidir(s, ['B'])).toEqual([]) // quem sai é o Time 2
    s = encerrarComSubstitutos(s, {}, (e) => vitoria(e, 'A'))
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['A', 'I', 'C', 'D'])
    expect(s.machucados[0].substituto).toBeNull()
  })

  it('time do substituto perdeu e ele volta: entra com o time antigo', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    const pendentes = substitutosParaDecidir(s, ['A'])
    expect(pendentes.map((m) => m.substituto!.nome)).toEqual(['I'])
    s = encerrarComSubstitutos(s, { [pendentes[0].substituto!.id]: 'volta' }, (e) => vitoria(e, 'B'))
    expect(s.emCampo!.A.numero).toBe(3)
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['I', 'J', 'K', 'L'])
    expect(blocos(s)).toEqual([['M', 'N', 'A', 'C'], ['D']])
    // a partida guarda quem jogou: o machucado e o substituto
    expect(nomes(s.historico[0].timeA.jogadores).sort()).toEqual(['A', 'B', 'C', 'D', 'I'])
    expect(s.machucados[0].substituto).toBeNull()
  })

  it('substituto que voltou para o time antigo não ganha a marca de "subiu"', () => {
    const ini = inicio()
    const m = machucou(ini, 'A', id(ini, 'B'))
    const depois = atualizarSubiram(m, encerrarComSubstitutos(m, { [id(m, 'I')]: 'volta' }, (e) => vitoria(e, 'B')))
    expect(depois.subiram.map((s) => s.jogadorId)).not.toContain(id(m, 'I'))
  })

  it('time do substituto perdeu e ele fica: vai para o fim da fila com o time', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    s = encerrarComSubstitutos(s, { [id(s, 'I')]: 'fica' }, (e) => vitoria(e, 'B'))
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['J', 'K', 'L', 'M'])
    expect(blocos(s)).toEqual([['N', 'A', 'I', 'C'], ['D']])
  })

  it('no empate em que os dois saem, a decisão vale para o substituto do time que saiu', () => {
    let s = comecar(sessao('ABCDEFGHIJKLMNOP'.split('')))
    s = machucou(s, 'B', id(s, 'E'))
    expect(substitutosParaDecidir(s, ['A', 'B']).map((m) => m.substituto!.nome)).toEqual(['I'])
    s = encerrarComSubstitutos(s, { [id(s, 'I')]: 'volta' }, (e) => empate(e, 'A'))
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['I', 'J', 'K', 'L'])
  })

  it('depois que a partida dele acabou, volta para o fim da fila (mesmo se o time ganhou)', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    const b = s.machucados[0].jogador.id
    s = encerrarComSubstitutos(s, {}, (e) => vitoria(e, 'A'))
    s = voltouDoMachucado(s, b)
    expect(nomes(s.emCampo!.A.jogadores)).not.toContain('B')
    expect(blocos(s).flat().at(-1)).toBe('B')
    expect(s.machucados).toEqual([])
  })

  it('conta como presente: a partida em que se machucou fica no histórico com ele', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    s = encerrarComSubstitutos(s, {}, (e) => vitoria(e, 'B'))
    expect(nomes(jogaramNaPelada(s))).toContain('B')
  })

  it('foi embora: machucado sai da lista; substituto que foi embora não precisa mais de decisão', () => {
    const ini = inicio()
    let s = machucou(ini, 'A', id(ini, 'B'))
    s = removerJogador(s, id(s, 'I'))
    expect(s.machucados[0].substituto).toBeNull()
    s = removerJogador(s, s.machucados[0].jogador.id)
    expect(s.machucados).toEqual([])
  })
})
