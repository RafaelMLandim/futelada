import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { AppState } from '../types/app'
import type { Estado } from '../types/pelada'
import { carregar, salvar } from './armazenamento'
import { estadoInicial, reducer } from './reducer'

/**
 * A pelada do dia, salva no celular. Com `naMemoria`, é a pelada de outra pessoa que este celular assumiu
 * (PLANO.md, seção 16): começa como está na nuvem e não toca na pelada salva deste celular.
 */
export function usePelada(naMemoria?: AppState) {
  const [app, dispatch] = useReducer(reducer, undefined, () => naMemoria ?? carregar() ?? estadoInicial())
  const salvarNoCelular = naMemoria ? () => {} : salvar

  useEffect(() => salvarNoCelular(app), [app]) // eslint-disable-line react-hooks/exhaustive-deps
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
    compartilhar: (codigo: string, chave: string) => dispatch({ tipo: 'compartilhar', codigo, chave }),
    substituir: (nuvem: Pick<AppState, 'estado' | 'crono'>) => dispatch({ tipo: 'substituir', app: nuvem }),
    encerrar: () => {
      salvarNoCelular(reducer(atual.current, { tipo: 'encerrar' })) // salva já: em seguida o app volta para o início
      dispatch({ tipo: 'encerrar' })
    },
    cancelar: () => {
      salvarNoCelular(reducer(atual.current, { tipo: 'cancelar' })) // salva já: a tela da pelada fecha em seguida
      dispatch({ tipo: 'cancelar' })
    },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  return { app, ...acoes }
}

export type Pelada = ReturnType<typeof usePelada>
