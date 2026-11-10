import { describe, expect, it } from 'vitest'
import { adicionarJogador, chegouGoleiro, contaNaLista, incluirConta, quemFoiEmbora, removerJogador, voltouParaALista, resumoParaAsCartas, comecar, configPadrao, contasDaPelada, definirGoleiros, goleiroDaSelecao, passarParaALinha, passarParaOGol, escolherGoleiro, trocarGoleiros, vitoria } from '..'
import { LISTA, sessao } from './utils'

describe('goleiros fixos', () => {
  const com = (goleiros: string[]) => sessao(LISTA, { ...configPadrao, goleiros })

  it('com um só goleiro, ele fica com o time que venceu', () => {
    let s = comecar(com(['Zé']))
    expect(s.goleiros).toEqual({ A: 'Zé', B: null })
    s = vitoria(s, 'B')
    expect(s.goleiros).toEqual({ A: null, B: 'Zé' })
  })

  it('com dois goleiros, um em cada gol; quem perde deixa o goleiro para o time que entra', () => {
    let s = comecar(com(['Zé', 'Tião']))
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
    s = vitoria(s, 'B') // Time 1 perde; Zé fica no gol do Time 3
    expect(s.emCampo!.A.numero).toBe(3)
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
  })

  it('o vencedor pode trocar de goleiro', () => {
    let s = comecar(com(['Zé', 'Tião']))
    s = trocarGoleiros(s)
    expect(s.goleiros).toEqual({ A: 'Tião', B: 'Zé' })
  })

  it('goleiro reserva pode entrar num gol; escolher o do outro gol troca os dois', () => {
    let s = comecar(com(['Zé', 'Tião', 'Beto']))
    s = escolherGoleiro(s, 'A', 'Beto')
    expect(s.goleiros).toEqual({ A: 'Beto', B: 'Tião' })
    s = escolherGoleiro(s, 'A', 'Tião')
    expect(s.goleiros).toEqual({ A: 'Tião', B: 'Beto' })
  })

  it('cadastrar goleiro no meio da pelada preenche o gol vazio; remover libera', () => {
    let s = comecar(com(['Zé']))
    s = definirGoleiros(s, ['Zé', 'Tião'])
    expect(s.goleiros).toEqual({ A: 'Zé', B: 'Tião' })
    s = definirGoleiros(s, ['Tião'])
    expect(s.goleiros).toEqual({ A: null, B: 'Tião' })
  })

  it('goleiro que chegou pelo link entra na lista ligado à conta; o mesmo nome é a mesma pessoa', () => {
    let s = comecar(sessao(LISTA, configPadrao))
    s = chegouGoleiro(s, 'TAFFAREL', 'conta-taffarel')
    expect(s.config.goleiros).toEqual(['TAFFAREL'])
    expect(s.goleiros.A).toBe('TAFFAREL')
    expect(contasDaPelada(s)['goleiro:taffarel']).toBe('conta-taffarel')
    s = chegouGoleiro(s, 'taffarel', 'conta-taffarel')
    expect(s.config.goleiros).toEqual(['TAFFAREL'])
    s = chegouGoleiro(s, 'DIDA', null) // só com o nome: entra no gol, sem carta
    expect(s.config.goleiros).toEqual(['TAFFAREL', 'DIDA'])
    expect(Object.keys(s.contasDosGoleiros ?? {})).toEqual(['TAFFAREL'])
  })

  it('goleiro da seleção: o que mais venceu (sem vitória, ninguém)', () => {
    let s = comecar(sessao(LISTA, { ...configPadrao, goleiros: ['ZÉ', 'TIÃO'] }))
    expect(goleiroDaSelecao(s)).toBeNull()
    s = vitoria(s, 'A')
    expect(goleiroDaSelecao(s)?.nome).toBe(s.historico[0].goleiros.A)
  })

  it('quem está na fila vai para o gol levando a conta, e volta para a linha com ela', () => {
    let s = sessao(LISTA, configPadrao)
    s = adicionarJogador(s, { id: 'r', nome: 'RONALDO', conta: 'conta-ronaldo' })
    s = passarParaOGol(s, 'r')
    expect(s.fila.some((jogador) => jogador.id === 'r')).toBe(false)
    expect(s.config.goleiros).toEqual(['RONALDO'])
    expect(s.contasDosGoleiros).toEqual({ RONALDO: 'conta-ronaldo' })
    s = passarParaALinha(s, 'RONALDO')
    expect(s.config.goleiros).toEqual([])
    expect(s.fila.at(-1)).toMatchObject({ nome: 'RONALDO', conta: 'conta-ronaldo' })
    expect(s.contasDosGoleiros).toEqual({ RONALDO: 'conta-ronaldo' }) // os jogos dele no gol continuam indo para a carta
  })

  it('quem está em campo não vai para o gol no meio da partida', () => {
    const s = comecar(sessao(LISTA, configPadrao))
    const emCampo = s.emCampo!.A.jogadores[0]
    expect(passarParaOGol(s, emCampo.id)).toBe(s)
  })

  it('quem foi embora depois de jogar continua com os números na carta (linha e goleiro)', () => {
    let s = sessao([...LISTA.slice(0, 7), 'RONALDO'], configPadrao)
    s = { ...s, fila: s.fila.map((jogador) => (jogador.nome === 'RONALDO' ? { ...jogador, conta: 'conta-ronaldo' } : jogador)) }
    s = chegouGoleiro(s, 'DIDA', 'conta-dida')
    s = comecar(s)
    s = vitoria(s, 'B')
    const ronaldo = s.fila.find((jogador) => jogador.nome === 'RONALDO') ?? s.emCampo!.B.jogadores.find((jogador) => jogador.nome === 'RONALDO')!
    s = removerJogador(s, ronaldo.id)
    s = definirGoleiros(s, [])
    const contas = resumoParaAsCartas(s).map((resumo) => [resumo.conta, resumo.jogos])
    expect(contas).toEqual(expect.arrayContaining([['conta-ronaldo', 1], ['conta-dida', 1]]))
  })

  it('quem foi embora e voltou volta como o mesmo jogador: mesma conta, números juntos', () => {
    let s = sessao(LISTA.slice(0, 8), configPadrao)
    const ronaldo = { id: 'r', nome: 'RONALDO', conta: 'conta-ronaldo' }
    s = comecar(adicionarJogador(s, ronaldo))
    s = removerJogador(s, 'r') // saiu antes de jogar (engano)
    expect(quemFoiEmbora(s, 'ronaldo')).toEqual(ronaldo)
    expect(quemFoiEmbora(s, 'ROMARIO')).toBeNull()
    s = voltouParaALista(s, ronaldo)
    expect(s.fila.at(-1)).toEqual(ronaldo)
    expect(quemFoiEmbora(s, 'RONALDO')).toBeNull() // já está na lista
  })

  it('o organizador se inclui com a conta: uma vez só, na fila ou no gol', () => {
    let s = sessao(LISTA.slice(0, 3), configPadrao)
    s = incluirConta(s, 'conta-dono', 'RAFAEL', false)
    expect(s.fila.at(-1)).toMatchObject({ nome: 'RAFAEL', conta: 'conta-dono' })
    expect(contaNaLista(s, 'conta-dono')).toBe(true)
    const depois = incluirConta(s, 'conta-dono', 'RAFAEL', true) // já está: não entra de novo, nem no gol
    expect(depois).toBe(s)
    let noGol = incluirConta(sessao(LISTA.slice(0, 3), configPadrao), 'conta-dono', 'RAFAEL', true)
    expect(noGol.config.goleiros).toEqual(['RAFAEL'])
    expect(contaNaLista(noGol, 'conta-dono')).toBe(true)
    noGol = removerJogador(noGol, 'nada')
    expect(contaNaLista(noGol, 'outra-conta')).toBe(false)
  })
})
