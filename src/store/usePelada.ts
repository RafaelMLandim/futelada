import { useEffect, useReducer } from 'react'
import type { Estado } from '../types/pelada'
import { carregar, salvar } from './armazenamento'
import { estadoInicial, reducer } from './reducer'

export function usePelada() {
  const [app, dispatch] = useReducer(reducer, undefined, () => carregar() ?? estadoInicial())

  useEffect(() => salvar(app), [app])

  return {
    app,
    aplicar: (fn: (e: Estado) => Estado, novaPartida = false) => dispatch({ tipo: 'aplicar', fn, novaPartida }),
    iniciar: () => dispatch({ tipo: 'iniciar' }),
    desfazer: () => dispatch({ tipo: 'desfazer' }),
    crono: (rodando: boolean) => dispatch({ tipo: 'crono', rodando }),
    encerrar: () => dispatch({ tipo: 'encerrar' }),
  }
}

export type Pelada = ReturnType<typeof usePelada>
