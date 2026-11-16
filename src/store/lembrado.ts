// O último valor de cada dado que vem da nuvem (a conta, o caixa, as turmas…). Cada tela que abre começa já com
// ele, em vez de mostrar primeiro "carregando" (ou "entre com o Google") e trocar meio segundo depois: era essa
// troca que mexia a tela ao abrir. Fica na memória enquanto o app está aberto; os da tela inicial (`noCelular`)
// ficam também guardados no celular, para o app já abrir certo. Trocou de conta: esquece tudo.

import { useCallback, useState } from 'react'

const memoria = new Map<string, unknown>()
const PREFIXO = 'lembrado:'
const CHAVE_DA_CONTA = 'conta'

function lerDoCelular<T>(chave: string): T | undefined {
  try {
    const texto = localStorage.getItem(PREFIXO + chave)
    return texto === null ? undefined : (JSON.parse(texto) as T)
  } catch {
    return undefined
  }
}

function guardarNoCelular(chave: string, valor: unknown) {
  try {
    if (valor === undefined || valor === null) localStorage.removeItem(PREFIXO + chave)
    else localStorage.setItem(PREFIXO + chave, JSON.stringify(valor))
  } catch { /* sem espaço ou sem armazenamento: só não lembra ao reabrir */ }
}

/** O último valor guardado (na memória ou, com `noCelular`, no celular); undefined = nunca carregou. */
export function lembrado<T>(chave: string, noCelular = false): T | undefined {
  if (memoria.has(chave)) return memoria.get(chave) as T
  if (!noCelular) return undefined
  const lido = lerDoCelular<T>(chave)
  if (lido !== undefined) memoria.set(chave, lido)
  return lido
}

export function lembrar(chave: string, valor: unknown, noCelular = false) {
  memoria.set(chave, valor)
  if (noCelular) guardarNoCelular(chave, valor)
}

/** Outra conta entrou (ou saiu): nada do que estava lembrado vale mais. */
export function esquecerTudo() {
  memoria.clear()
  try {
    for (let indice = localStorage.length - 1; indice >= 0; indice--) {
      const chave = localStorage.key(indice)
      if (chave?.startsWith(PREFIXO)) localStorage.removeItem(chave)
    }
  } catch { /* segue */ }
}

/** Conta lembrada (para saber se quem chegou agora é outra pessoa). */
export const contaLembrada = <T>() => lembrado<T>(CHAVE_DA_CONTA, true)
export const lembrarConta = (valor: unknown) => lembrar(CHAVE_DA_CONTA, valor, true)

/** Como o useState, mas começa com o último valor lembrado e lembra cada valor novo. */
export function useLembrado<T>(chave: string, inicial: T, noCelular = false): [T, (valor: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    const anterior = lembrado<T>(chave, noCelular)
    return anterior === undefined ? inicial : anterior
  })
  const mudar = useCallback((novo: T) => { lembrar(chave, novo, noCelular); setValor(novo) }, [chave, noCelular])
  return [valor, mudar]
}
