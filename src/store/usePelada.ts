import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { Estado } from '../types/pelada'
import { carregar, salvar } from './armazenamento'
import { estadoInicial, reducer } from './reducer'

export function usePelada() {
  const [app, dispatch] = useReducer(reducer, undefined, () => carregar() ?? estadoInicial())

  useEffect(() => salvar(app), [app])
  // valor mais recente, para salvar na hora quando a tela fecha logo em seguida (cancelar → início)
  const atual = useRef(app)
  useEffect(() => { atual.current = app }, [app])

  // As ações não mudam entre renderizações (dispatch é estável)
  const acoes = useMemo(() => ({
    aplicar: (fn: (e: Estado) => Estado, novaPartida = false) => dispatch({ tipo: 'aplicar', fn, novaPartida }),
    iniciar: () => dispatch({ tipo: 'iniciar' }),
    crono: (rodando: boolean) => dispatch({ tipo: 'crono', rodando }),
    acrescimos: (min: number) => dispatch({ tipo: 'acrescimos', min }),
    desfazer: () => dispatch({ tipo: 'desfazer' }),
    encerrar: () => {
      salvar(reducer(atual.current, { tipo: 'encerrar' })) // salva já: em seguida o app volta para o início
      dispatch({ tipo: 'encerrar' })
    },
    cancelar: () => {
      salvar(reducer(atual.current, { tipo: 'cancelar' })) // salva já: a tela da pelada fecha em seguida
      dispatch({ tipo: 'cancelar' })
    },
  }), [])

  return { app, ...acoes }
}

export type Pelada = ReturnType<typeof usePelada>
