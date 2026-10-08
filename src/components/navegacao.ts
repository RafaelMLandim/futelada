import { createContext } from 'react'

/** Volta para a tela inicial (pelada, torneio, caixa, histórico). Fora das telas do app, null. */
export const VoltarAoInicio = createContext<(() => void) | null>(null)
