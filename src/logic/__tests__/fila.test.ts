import { describe, expect, it } from 'vitest'
import { alterarLinha, atualizarSubiram, comecar, configPadrao, definirColete, sortearPrimeirosTimes, vitoria } from '..'
import { blocos, LISTA, nomes, sessao } from './utils'

describe('montagem dos times', () => {
  it('corta a lista de chegada em blocos do tamanho da linha', () => {
    const s = sessao(LISTA)
    expect(blocos(s)).toEqual([
      ['João', 'Carlos', 'Bruno', 'Marcos'],
      ['Rafael', 'Daniel', 'Junior', 'Landim'],
      ['Mano', 'Lucas'],
    ])
  })

  it('tamanho da linha é dinâmico', () => {
    const s = alterarLinha(sessao(LISTA), 5)
    expect(blocos(s)).toEqual([
      ['João', 'Carlos', 'Bruno', 'Marcos', 'Rafael'],
      ['Daniel', 'Junior', 'Landim', 'Mano', 'Lucas'],
    ])
  })

  it('começa com os dois primeiros times em campo', () => {
    const s = comecar(sessao(LISTA))
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['João', 'Carlos', 'Bruno', 'Marcos'])
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['Rafael', 'Daniel', 'Junior', 'Landim'])
    expect(blocos(s)).toEqual([['Mano', 'Lucas']])
  })
})

describe('coletes', () => {
  it('padrão é Vermelho contra Azul; quem entra veste o colete de quem saiu', () => {
    let s = comecar(sessao(LISTA))
    expect(configPadrao.coletes.A.nome).toBe('Vermelho')
    expect(configPadrao.coletes.B.nome).toBe('Azul')
    s = vitoria(s, 'B') // Vermelho perde; o time que entra fica no lado A (Vermelho)
    expect(nomes(s.emCampo!.A.jogadores)).toEqual(['Mano', 'Lucas', 'João', 'Carlos'])
  })

  it('escolher a cor do outro lado troca os coletes', () => {
    let s = sessao(LISTA)
    s = definirColete(s, 'A', { nome: 'Azul', cor: '#1E5FBF' })
    expect(s.config.coletes.A.nome).toBe('Azul')
    expect(s.config.coletes.B.nome).toBe('Vermelho')
    s = definirColete(s, 'B', { nome: 'Amarelo', cor: '#FFD23F' })
    expect(s.config.coletes).toEqual({ A: { nome: 'Azul', cor: '#1E5FBF' }, B: { nome: 'Amarelo', cor: '#FFD23F' } })
  })
})

describe('sorteio do primeiro jogo (contra panelinha)', () => {
  it('mistura só os jogadores dos 2 primeiros times; o resto da fila fica igual', () => {
    const s = sessao(LISTA) // 10 jogadores, 4 na linha: T1 e T2 com 8, sobram Mano e Lucas
    const aleatorio = () => 0 // sempre troca com o primeiro: ordem muda de forma previsível
    const m = sortearPrimeirosTimes(s, aleatorio)
    expect(nomes(m.fila.slice(0, 8)).sort()).toEqual(LISTA.slice(0, 8).sort())
    expect(nomes(m.fila.slice(0, 8))).not.toEqual(LISTA.slice(0, 8))
    expect(nomes(m.fila.slice(8))).toEqual(['Mano', 'Lucas'])
  })

  it('depois do primeiro jogo não mistura mais, e começar não marca ninguém como "subiu"', () => {
    const s = sessao(LISTA)
    const comecou = atualizarSubiram(s, comecar(sortearPrimeirosTimes(s, () => 0)))
    expect(comecou.subiram).toEqual([])
    const depois = vitoria(comecou, 'A')
    expect(sortearPrimeirosTimes(depois)).toBe(depois)
  })
})
