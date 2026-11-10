import { ligarConta, nomeSemRepetir, adicionarJogador as adicionarParaTeste, novoJogador as novoParaTeste } from '..'
import { configPadrao as configParaTeste, novaSessao as sessaoParaTeste } from '..'
import { describe, expect, it } from 'vitest'
import { adicionarJogador, alterarLinha, comecar, novoJogador, removerJogador } from '..'
import { blocos, LISTA, nomes, sessao } from './utils'

describe('chegadas e saídas', () => {
  it('atrasado completa o time que está faltando gente', () => {
    let s = comecar(sessao(LISTA))
    s = adicionarJogador(s, novoJogador('Pedro'))
    expect(blocos(s)).toEqual([['Mano', 'Lucas', 'Pedro']])
  })

  it('quem vai embora de campo é substituído pelo primeiro da fila e a fila sobe', () => {
    const lista = 'ABCDEFGHIJKLMN'.split('')
    let s = comecar(sessao(lista))
    const e = s.emCampo!.B.jogadores[0]
    s = removerJogador(s, e.id)
    expect(nomes(s.emCampo!.B.jogadores)).toEqual(['I', 'F', 'G', 'H'])
    expect(blocos(s)).toEqual([['J', 'K', 'L', 'M'], ['N']])
  })

  it('quem vai embora da fila sai e a fila sobe', () => {
    let s = comecar(sessao(LISTA))
    s = removerJogador(s, s.fila[0].id)
    expect(blocos(s)).toEqual([['Lucas']])
  })

  it('mudar a linha no meio não mexe em quem está em campo', () => {
    let s = comecar(sessao([...LISTA, 'Pedro', 'Thiago']))
    s = alterarLinha(s, 3)
    expect(s.emCampo!.A.jogadores).toHaveLength(4)
    expect(blocos(s)).toEqual([['Mano', 'Lucas', 'Pedro'], ['Thiago']])
  })
})

const estadoComJogadores = (quantos: number) => Array.from({ length: quantos }, (_, indice) => novoParaTeste(`J${indice}`))
  .reduce(adicionarParaTeste, sessaoParaTeste(configParaTeste))

describe('nomes repetidos e conta', () => {
  it('nome livre continua igual; repetido ganha um número', () => {
    expect(nomeSemRepetir('BRUNO', ['CAIO'])).toBe('BRUNO')
    expect(nomeSemRepetir('BRUNO', ['BRUNO', 'CAIO'])).toBe('BRUNO 2')
    expect(nomeSemRepetir('Bruno', ['BRUNO', 'BRUNO 2'])).toBe('Bruno 3')
  })

  it('liga a conta só ao jogador certo', () => {
    const inicio = estadoComJogadores(2)
    const [alvo, outro] = inicio.fila
    const novo = ligarConta(inicio, alvo.id, 'conta-1')
    expect(novo.fila.find((jogador) => jogador.id === alvo.id)?.conta).toBe('conta-1')
    expect(novo.fila.find((jogador) => jogador.id === outro.id)?.conta).toBeUndefined()
  })
})
