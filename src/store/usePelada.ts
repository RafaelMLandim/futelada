import { useEffect, useMemo, useReducer } from 'react'
import type { Estado } from '../types/pelada'
import { carregar, salvar } from './armazenamento'
import { estadoInicial, reducer } from './reducer'

export function usePelada() {
  const [app, dispatch] = useReducer(reducer, undefined, () => carregar() ?? estadoInicial())

  useEffect(() => salvar(app), [app])

  // As ações não mudam entre renderizações (dispatch é estável)
  const acoes = useMemo(() => ({
    aplicar: (fn: (e: Estado) => Estado, novaPartida = false) => dispatch({ tipo: 'aplicar', fn, novaPartida }),
    iniciar: () => dispatch({ tipo: 'iniciar' }),
    crono: (rodando: boolean) => dispatch({ tipo: 'crono', rodando }),
    acrescimos: (min: number) => dispatch({ tipo: 'acrescimos', min }),
    encerrar: () => dispatch({ tipo: 'encerrar' }),
  }), [])

  return { app, ...acoes }
}

export type Pelada = ReturnType<typeof usePelada>
