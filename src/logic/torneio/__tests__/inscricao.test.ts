import { describe, expect, it } from 'vitest'
import { juntarInscricoes, novoTorneio, vagasDaInscricao } from '..'
import type { JogadorInscrito, TimeInscrito } from '../../../types/torneio'
import { sorteado, torneioCom } from './utils'

const jogador = (id: string, extra: Partial<JogadorInscrito> = {}): JogadorInscrito => ({ id, nome: id.toUpperCase(), comConta: false, em: 1, ...extra })
const inscrito = (id: string, jogadores: JogadorInscrito[] = [], extra: Partial<TimeInscrito> = {}): TimeInscrito =>
  ({ id, capitao: 'cap', nomeDoCapitao: 'CAP', nome: `TIME ${id}`, cor: '#D62828', em: 1, jogadores, ...extra })

describe('inscrição pelo link', () => {
  it('o time inscrito entra no torneio com os jogadores do link (com conta, fica ligado a ela)', () => {
    const torneio = juntarInscricoes(novoTorneio('Copa'), [inscrito('a', [
      jogador('joao', { comConta: true, camisa: 10, em: 2 }),
      jogador('pedro', { goleiro: true, em: 1 }),
    ])], null)
    expect(torneio.times).toHaveLength(1)
    const [time] = torneio.times
    expect(time).toMatchObject({ nome: 'TIME a', cor: '#D62828', inscricao: 'a', capitao: 'cap' })
    expect(time.jogadores).toEqual([
      { id: 'ipedro', nome: 'PEDRO', inscrito: 'pedro', goleiro: true },
      { id: 'ijoao', nome: 'JOAO', inscrito: 'joao', conta: 'joao', camisa: 10 },
    ])
  })

  it('o time pode ter vários goleiros: ficam no começo da lista, na ordem em que entraram', () => {
    const torneio = juntarInscricoes(novoTorneio('Copa'), [inscrito('a', [
      jogador('linha', { em: 1 }), jogador('um', { goleiro: true, em: 2 }), jogador('dois', { goleiro: true, em: 3 }),
    ])], null)
    expect(torneio.times[0].jogadores.map((item) => [item.inscrito, !!item.goleiro])).toEqual([['um', true], ['dois', true], ['linha', false]])
  })

  it('quem saiu do link sai do time; quem o organizador pôs à mão continua', () => {
    let torneio = juntarInscricoes(novoTorneio('Copa'), [inscrito('a', [jogador('um'), jogador('dois')])], null)
    torneio = { ...torneio, times: torneio.times.map((time) => ({ ...time, jogadores: [...time.jogadores, { id: 'mao', nome: 'NA MÃO' }] })) }
    torneio = juntarInscricoes(torneio, [inscrito('a', [jogador('dois')])], null)
    expect(torneio.times[0].jogadores.map((item) => item.id)).toEqual(['idois', 'mao'])
  })

  it('o nome e a cor seguem os do capitão; o time que saiu do link sai do torneio', () => {
    const base = torneioCom(1, 'pontos')
    let torneio = juntarInscricoes(base, [inscrito('a'), inscrito('b')], null)
    torneio = juntarInscricoes(torneio, [inscrito('b', [], { nome: 'NOVO NOME', cor: '#1E5FBF' })], null)
    expect(torneio.times.map((time) => time.nome)).toEqual(['Time 1', 'NOVO NOME'])
    expect(torneio.times[1].cor).toBe('#1E5FBF')
  })

  it('com o limite cheio, quem se inscreveu por último fica de fora', () => {
    const torneio = juntarInscricoes(torneioCom(1, 'pontos'), [inscrito('tarde', [], { em: 3 }), inscrito('cedo', [], { em: 2 }), inscrito('meio', [], { em: 2.5 })], 3)
    expect(torneio.times.map((time) => time.inscricao ?? 'mão')).toEqual(['mão', 'cedo', 'meio'])
    expect(vagasDaInscricao(3, 3)).toBe(0)
    expect(vagasDaInscricao(3, null)).toBeNull()
  })

  it('sem mudança devolve o mesmo torneio; depois do sorteio não mexe mais', () => {
    const torneio = juntarInscricoes(novoTorneio('Copa'), [inscrito('a', [jogador('um')])], null)
    expect(juntarInscricoes(torneio, [inscrito('a', [jogador('um')])], null)).toBe(torneio)
    const jaSorteado = sorteado(torneioCom(4, 'pontos'))
    expect(juntarInscricoes(jaSorteado, [inscrito('a')], null)).toBe(jaSorteado)
  })
})

describe('esse sou eu', () => {
  it('o jogador digitado passa a ser da conta; não troca quem já tem conta nem liga a conta duas vezes', async () => {
    const { ligarContaAoJogador } = await import('..')
    const torneio = torneioCom(2, 'pontos')
    const [primeiro, segundo] = torneio.times[0].jogadores.slice(1)
    const ligado = ligarContaAoJogador(torneio, primeiro.id, 'conta-1')
    expect(ligado.times[0].jogadores.find((jogador) => jogador.id === primeiro.id)!.conta).toBe('conta-1')
    expect(ligarContaAoJogador(ligado, segundo.id, 'conta-1')).toBe(ligado)
    expect(ligarContaAoJogador(ligado, primeiro.id, 'conta-2')).toBe(ligado)
  })
})
