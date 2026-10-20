import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '../../nuvem/tipos'
import { trocarDeConta } from '../donoDoCelular'

// localStorage de mentira (os testes rodam fora do navegador)
const memoria = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (chave: string) => memoria.get(chave) ?? null,
  setItem: (chave: string, valor: string) => void memoria.set(chave, valor),
  removeItem: (chave: string) => void memoria.delete(chave),
})

const conta = (uid: string): Perfil => ({ uid, nome: uid, email: null, foto: null, anonimo: false })
const anonimo = (uid: string): Perfil => ({ uid, nome: null, email: null, foto: null, anonimo: true })
const pelada = () => localStorage.getItem('pelada:v5')
const torneio = () => localStorage.getItem('torneio:v1')

describe('pelada e torneio do celular separados por conta', () => {
  beforeEach(() => memoria.clear())

  it('quem entra num celular com pelada sem dono (versão antiga do app) fica com ela', () => {
    localStorage.setItem('pelada:v5', 'da versão antiga')
    trocarDeConta(conta('ana'))
    expect(pelada()).toBe('da versão antiga')
  })

  it('outra conta que entra no mesmo celular não cai na pelada nem no torneio de quem saiu', () => {
    trocarDeConta(conta('ana'))
    localStorage.setItem('pelada:v5', 'pelada da ana')
    localStorage.setItem('torneio:v1', 'torneio da ana')
    localStorage.setItem('torneio:ativo', 'torneio compartilhado da ana')
    trocarDeConta(anonimo('x')) // saiu da conta
    expect(pelada()).toBeNull()
    expect(torneio()).toBeNull()
    expect(localStorage.getItem('torneio:ativo')).toBeNull()
    trocarDeConta(conta('beto'))
    expect(pelada()).toBeNull()
    expect(torneio()).toBeNull()
  })

  it('quem volta encontra a pelada e o torneio como deixou', () => {
    trocarDeConta(conta('ana'))
    localStorage.setItem('pelada:v5', 'pelada da ana')
    localStorage.setItem('torneio:ativo', 'torneio compartilhado da ana')
    trocarDeConta(anonimo('x'))
    trocarDeConta(conta('beto'))
    localStorage.setItem('pelada:v5', 'pelada do beto')
    trocarDeConta(anonimo('y'))
    trocarDeConta(conta('ana'))
    expect(pelada()).toBe('pelada da ana')
    expect(localStorage.getItem('torneio:ativo')).toBe('torneio compartilhado da ana')
    trocarDeConta(anonimo('z'))
    trocarDeConta(conta('beto'))
    expect(pelada()).toBe('pelada do beto')
    expect(localStorage.getItem('torneio:ativo')).toBeNull()
  })

  it('troca direta de uma conta para outra (sem passar pelo anônimo) também separa', () => {
    trocarDeConta(conta('ana'))
    localStorage.setItem('pelada:v5', 'pelada da ana')
    trocarDeConta(conta('beto'))
    expect(pelada()).toBeNull()
    trocarDeConta(conta('ana'))
    expect(pelada()).toBe('pelada da ana')
  })

  it('a mesma conta de novo (outra tela avisando) não mexe em nada', () => {
    trocarDeConta(conta('ana'))
    localStorage.setItem('pelada:v5', 'pelada da ana')
    trocarDeConta(conta('ana'))
    trocarDeConta(null) // entre o sair e o anônimo
    trocarDeConta(undefined)
    expect(pelada()).toBe('pelada da ana')
  })

  it('não mexe no modo nem na identidade do aparelho', () => {
    trocarDeConta(conta('ana'))
    localStorage.setItem('app:modo', 'pelada')
    localStorage.setItem('app:aparelho', 'abc')
    trocarDeConta(conta('beto'))
    expect(localStorage.getItem('app:modo')).toBe('pelada')
    expect(localStorage.getItem('app:aparelho')).toBe('abc')
  })
})
