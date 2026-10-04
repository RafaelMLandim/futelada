// Escolhe a nuvem: Firebase (se configurado no .env) ou a de teste (para testes no
// navegador, ligada com localStorage "nuvem:teste" = endereço do servidor de teste).
// Sem nenhuma, o torneio fica só no celular, como antes.

import type { Nuvem } from './tipos'

let instancia: Promise<Nuvem | null> | null = null

const servidorDeTeste = (): string | null => {
  try {
    // Só no desenvolvimento: abrir o app com ?nuvem-teste liga a nuvem de teste neste navegador
    // (e ?nuvem-teste=0 desliga). O servidor de teste é o testes-e2e/servidor-nuvem.mjs.
    const pedido = import.meta.env.DEV ? new URLSearchParams(location.search).get('nuvem-teste') : null
    if (pedido === '0') localStorage.removeItem('nuvem:teste')
    else if (pedido !== null) localStorage.setItem('nuvem:teste', `http://${location.hostname}:5299`)
    return localStorage.getItem('nuvem:teste')
  } catch {
    return null
  }
}

export function nuvemDisponivel(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY || servidorDeTeste())
}

export function obterNuvem(): Promise<Nuvem | null> {
  instancia ??= (async () => {
    if (import.meta.env.VITE_FIREBASE_API_KEY) return (await import('./firebase')).criarNuvemFirebase()
    const servidor = servidorDeTeste()
    if (servidor) return (await import('./teste')).criarNuvemDeTeste(servidor)
    return null
  })()
  return instancia
}

export type { Nuvem } from './tipos'
