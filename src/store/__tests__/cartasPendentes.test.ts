import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumoDaCarta } from '../../logic/carta'
import { enviarPendencias, registrarDepois, retirarDepois } from '../cartasPendentes'

// localStorage de mentira (os testes rodam fora do navegador)
const memoria = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (chave: string) => memoria.get(chave) ?? null,
  setItem: (chave: string, valor: string) => void memoria.set(chave, valor),
  removeItem: (chave: string) => void memoria.delete(chave),
})

const nuvem = vi.hoisted(() => ({ registrarNaCarta: vi.fn(), retirarDaCarta: vi.fn() }))
vi.mock('../../nuvem', () => ({ obterNuvem: async () => nuvem }))

const jogadores = [{ conta: 'zico' }] as ResumoDaCarta[]
const semSinal = Object.assign(new Error('sem sinal'), { code: 'functions/unavailable' })
const pendentes = () => JSON.parse(memoria.get('cartas:pendentes') ?? '[]') as unknown[]
const terminarEnvio = () => vi.waitFor(async () => { await enviarPendencias(); await Promise.resolve() })

describe('números da carta guardados até chegarem ao servidor', () => {
  beforeEach(() => {
    memoria.clear()
    memoria.set('celular:dono', 'organizador')
    nuvem.registrarNaCarta.mockReset().mockResolvedValue(undefined)
    nuvem.retirarDaCarta.mockReset().mockResolvedValue(undefined)
  })

  it('com internet, manda e não deixa nada guardado', async () => {
    registrarDepois(1, 't1', jogadores)
    await vi.waitFor(() => expect(pendentes()).toEqual([]))
    expect(nuvem.registrarNaCarta).toHaveBeenCalledWith(1, 't1', jogadores)
  })

  it('sem sinal, guarda; quando a internet volta, manda', async () => {
    nuvem.registrarNaCarta.mockRejectedValueOnce(semSinal)
    registrarDepois(1, 't1', jogadores)
    await vi.waitFor(() => expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1))
    await terminarEnvio()
    await vi.waitFor(() => expect(pendentes()).toEqual([]))
    expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(2)
  })

  it('pedido recusado pelo servidor não fica tentando para sempre', async () => {
    nuvem.registrarNaCarta.mockRejectedValue(Object.assign(new Error('não'), { code: 'functions/invalid-argument' }))
    registrarDepois(1, 't1', jogadores)
    await vi.waitFor(() => expect(pendentes()).toEqual([]))
    expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1)
  })

  it('pelada apagada antes de sair: o registro nem é mandado', async () => {
    nuvem.registrarNaCarta.mockRejectedValueOnce(semSinal)
    registrarDepois(1, 't1', jogadores)
    await vi.waitFor(() => expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    retirarDepois(1, ['zico'])
    await vi.waitFor(() => expect(pendentes()).toEqual([]))
    expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1)
    expect(nuvem.retirarDaCarta).toHaveBeenCalledWith(1, ['zico'])
  })

  it('o pendente de uma conta não sai pela conta de outra pessoa no mesmo celular', async () => {
    nuvem.registrarNaCarta.mockRejectedValueOnce(semSinal)
    registrarDepois(1, 't1', jogadores)
    await vi.waitFor(() => expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    memoria.set('celular:dono', 'outra-pessoa')
    await enviarPendencias()
    expect(nuvem.registrarNaCarta).toHaveBeenCalledTimes(1)
    expect(pendentes()).toHaveLength(1)
  })

  it('sem conta, não guarda nada', () => {
    memoria.delete('celular:dono')
    registrarDepois(1, 't1', jogadores)
    expect(pendentes()).toEqual([])
  })
})
