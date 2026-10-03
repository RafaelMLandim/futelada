// Ações do app: aplicar uma regra, desfazer, controlar o cronômetro e encerrar.

import { configPadrao, novaSessao } from '../logic'
import type { AppState } from '../types/app'
import type { Estado } from '../types/pelada'
import { alternarCrono, cronoZerado } from './cronometro'

export type Acao =
  | { tipo: 'aplicar'; fn: (e: Estado) => Estado; novaPartida?: boolean }
  | { tipo: 'iniciar' }
  | { tipo: 'desfazer' }
  | { tipo: 'crono'; rodando: boolean }
  | { tipo: 'encerrar' }

const MAX_DESFAZER = 50

export const estadoInicial = (config = configPadrao): AppState => ({
  estado: novaSessao(config),
  iniciada: false,
  desfazer: [],
  crono: cronoZerado,
})

export function reducer(app: AppState, acao: Acao): AppState {
  switch (acao.tipo) {
    case 'aplicar': {
      const estado = acao.fn(app.estado)
      if (estado === app.estado) return app
      return {
        ...app,
        estado,
        desfazer: [...app.desfazer, app.estado].slice(-MAX_DESFAZER),
        crono: acao.novaPartida ? cronoZerado : app.crono,
      }
    }
    case 'iniciar':
      return { ...app, iniciada: true }
    case 'desfazer': {
      const anterior = app.desfazer.at(-1)
      if (!anterior) return app
      const mudouPartida = anterior.historico.length !== app.estado.historico.length
      return {
        ...app,
        estado: anterior,
        desfazer: app.desfazer.slice(0, -1),
        crono: mudouPartida ? cronoZerado : app.crono,
      }
    }
    case 'crono':
      return { ...app, crono: alternarCrono(app.crono, acao.rodando) }
    case 'encerrar':
      return estadoInicial(app.estado.config)
  }
}
