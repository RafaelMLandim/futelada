import { beforeEach, describe, expect, it, vi } from 'vitest'
import { abrirTorneio, guardarTorneioAberto, listaDeTorneios } from '../torneio'
import { trocarDeConta } from '../donoDoCelular'
import type { Torneio } from '../../types/torneio'
import { adicionarTime, novoTime, novoTorneio, regrasPadrao } from '../../logic/torneio'

// localStorage de mentira (os testes rodam fora do navegador)
const memoria = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (chave: string) => memoria.get(chave) ?? null,
  setItem: (chave: string, valor: string) => void memoria.set(chave, valor),
  removeItem: (chave: string) => void memoria.delete(chave),
})

const salvarLocal = (nome: string) => {
  const torneio = novoTorneio(nome, regrasPadrao)
  memoria.set('torneio:v1', JSON.stringify(torneio))
  return torneio
}
const abrirCompartilhado = (codigo: string, nome: string) => memoria.set('torneio:ativo', JSON.stringify({ codigo, campo: null, nome }))
const nomes = () => listaDeTorneios().map((resumo) => `${resumo.nome}${resumo.aberto ? ' (aberto)' : ''}`)

describe('vários torneios no mesmo celular', () => {
  beforeEach(() => memoria.clear())

  it('sem nenhum: a lista é vazia', () => {
    expect(listaDeTorneios()).toEqual([])
  })

  it('novo torneio: o aberto vai para a lista e os lugares ficam livres para criar outro', () => {
    salvarLocal('Copa da Firma')
    guardarTorneioAberto()
    expect(memoria.has('torneio:v1')).toBe(false)
    expect(nomes()).toEqual(['Copa da Firma'])
    salvarLocal('Copa do Bairro')
    expect(nomes()).toEqual(['Copa do Bairro (aberto)', 'Copa da Firma'])
  })

  it('abrir um da lista troca com o aberto (nada se perde)', () => {
    const firma = salvarLocal('Copa da Firma')
    guardarTorneioAberto()
    salvarLocal('Copa do Bairro')
    abrirTorneio(`local:${firma.id}`)
    expect(nomes()).toEqual(['Copa da Firma (aberto)', 'Copa do Bairro'])
    expect(JSON.parse(memoria.get('torneio:v1')!).nome).toBe('Copa da Firma')
  })

  it('compartilhado guardado é só o código; abrir volta a acompanhar ele', () => {
    abrirCompartilhado('ABC234', 'Copa na Nuvem')
    guardarTorneioAberto()
    expect(memoria.has('torneio:ativo')).toBe(false)
    salvarLocal('Copa Local')
    abrirTorneio('nuvem:ABC234')
    expect(JSON.parse(memoria.get('torneio:ativo')!).codigo).toBe('ABC234')
    expect(listaDeTorneios()).toEqual([
      { id: 'nuvem:ABC234', nome: 'Copa na Nuvem', codigo: 'ABC234', campeao: undefined, aberto: true },
      expect.objectContaining({ nome: 'Copa Local', aberto: false }),
    ])
  })

  it('o local que fica por baixo de um compartilhado aberto também aparece e vai junto para a lista', () => {
    salvarLocal('Copa Local')
    abrirCompartilhado('ABC234', 'Copa na Nuvem')
    expect(nomes()).toEqual(['Copa na Nuvem (aberto)', 'Copa Local'])
    guardarTorneioAberto()
    expect(nomes()).toEqual(['Copa na Nuvem', 'Copa Local'])
    expect(memoria.has('torneio:v1') || memoria.has('torneio:ativo')).toBe(false)
  })

  it('abrir o que já está aberto não muda nada', () => {
    const copa = salvarLocal('Copa')
    abrirTorneio(`local:${copa.id}`)
    expect(nomes()).toEqual(['Copa (aberto)'])
  })

  // ---- nenhum torneio pega dados do outro ----
  const aberto = () => JSON.parse(memoria.get('torneio:v1')!) as Torneio
  const editarAberto = (mudar: (torneio: Torneio) => Torneio) => memoria.set('torneio:v1', JSON.stringify(mudar(aberto())))
  const comTimes = (...nomesDosTimes: string[]) => (torneio: Torneio) => nomesDosTimes.reduce((t, nome) => adicionarTime(t, novoTime(nome, '#000')), torneio)
  const timesDoAberto = () => aberto().times.map((time) => time.nome)

  it('o que se faz num torneio não aparece no outro (times, nome, regras)', () => {
    const firma = salvarLocal('Copa da Firma')
    editarAberto(comTimes('Flamengo', 'Vasco'))
    editarAberto((t) => ({ ...t, regras: { ...t.regras, tempoMin: 15 } }))
    guardarTorneioAberto()
    const bairro = salvarLocal('Copa do Bairro')
    editarAberto(comTimes('Santos'))
    expect(timesDoAberto()).toEqual(['Santos'])
    expect(aberto().regras.tempoMin).toBe(regrasPadrao.tempoMin)

    // volta para a Firma: tudo dela, nada do Bairro
    abrirTorneio(`local:${firma.id}`)
    expect(aberto().nome).toBe('Copa da Firma')
    expect(timesDoAberto()).toEqual(['Flamengo', 'Vasco'])
    expect(aberto().regras.tempoMin).toBe(15)

    // muda a Firma de novo e volta para o Bairro: o Bairro continua só com o Santos
    editarAberto(comTimes('Botafogo'))
    abrirTorneio(`local:${bairro.id}`)
    expect(aberto().nome).toBe('Copa do Bairro')
    expect(timesDoAberto()).toEqual(['Santos'])
    abrirTorneio(`local:${firma.id}`)
    expect(timesDoAberto()).toEqual(['Flamengo', 'Vasco', 'Botafogo'])
  })

  it('trocar muitas vezes não duplica nem perde torneio', () => {
    const ids = ['A', 'B', 'C'].map((nome) => { const t = salvarLocal(`Copa ${nome}`); guardarTorneioAberto(); return `local:${t.id}` })
    for (let volta = 0; volta < 5; volta++) for (const id of [...ids].reverse()) abrirTorneio(id)
    expect(listaDeTorneios().map((resumo) => resumo.nome).sort()).toEqual(['Copa A', 'Copa B', 'Copa C'])
    expect(listaDeTorneios().filter((resumo) => resumo.aberto)).toHaveLength(1)
  })

  it('abrir um compartilhado não põe o código dele no local, nem o local na nuvem', () => {
    salvarLocal('Copa Local')
    editarAberto(comTimes('Grêmio'))
    guardarTorneioAberto()
    abrirCompartilhado('ABC234', 'Copa na Nuvem')
    guardarTorneioAberto()
    abrirTorneio('nuvem:ABC234')
    expect(memoria.has('torneio:v1')).toBe(false) // o local não fica por baixo do compartilhado
    expect(JSON.parse(memoria.get('torneio:ativo')!)).toEqual({ codigo: 'ABC234', campo: null, nome: 'Copa na Nuvem' })
    const local = listaDeTorneios().find((resumo) => resumo.nome === 'Copa Local')!
    abrirTorneio(local.id)
    expect(memoria.has('torneio:ativo')).toBe(false)
    expect(timesDoAberto()).toEqual(['Grêmio'])
    expect(aberto().nuvem).toBeUndefined()
  })

  it('outra conta no mesmo celular não vê os torneios guardados de quem saiu; quem volta encontra todos', () => {
    trocarDeConta({ uid: 'ana', nome: 'Ana', email: null, foto: null, anonimo: false })
    salvarLocal('Copa da Ana 1'); guardarTorneioAberto(); salvarLocal('Copa da Ana 2')
    trocarDeConta({ uid: 'beto', nome: 'Beto', email: null, foto: null, anonimo: false })
    expect(listaDeTorneios()).toEqual([])
    salvarLocal('Copa do Beto')
    trocarDeConta({ uid: 'ana', nome: 'Ana', email: null, foto: null, anonimo: false })
    expect(nomes()).toEqual(['Copa da Ana 2 (aberto)', 'Copa da Ana 1'])
  })
})

