// Ações do app: aplicar uma regra, controlar o cronômetro e encerrar.

import { atualizarSubiram, configPadrao, novaSessao } from '../logic'
import type { AppState } from '../types/app'
import type { Estado } from '../types/pelada'
import { alternarCrono, cronoZerado, darAcrescimos } from './cronometro'

export type Acao =
  | { tipo: 'aplicar'; fn: (e: Estado) => Estado; novaPartida?: boolean }
  | { tipo: 'iniciar' }
  | { tipo: 'crono'; rodando: boolean }
  | { tipo: 'acrescimos'; min: number }
  | { tipo: 'encerrar' }
  | { tipo: 'cancelar' } // descarta a pelada (sem histórico nem caixa) e volta os ajustes de antes dela


export const estadoInicial = (config = configPadrao): AppState => ({
  estado: novaSessao(config),
  iniciada: false,
  crono: cronoZerado,
  configAntes: config,
})

export function reducer(app: AppState, acao: Acao): AppState {
  switch (acao.tipo) {
    case 'aplicar': {
      const novo = acao.fn(app.estado)
      if (novo === app.estado) return app
      const estado = atualizarSubiram(app.estado, novo)
      return {
        ...app,
        estado,
        crono: acao.novaPartida ? cronoZerado : app.crono,
      }
    }
    case 'iniciar':
      return { ...app, iniciada: true }
    case 'crono':
      return { ...app, crono: alternarCrono(app.crono, acao.rodando) }
    case 'acrescimos':
      return { ...app, crono: darAcrescimos(app.crono, acao.min) }
    case 'encerrar':
      // Mantém as configurações (tempo, coletes...), mas os goleiros são do dia, como a lista
      return estadoInicial({ ...app.estado.config, goleiros: [] })
    case 'cancelar':
      // Como se a pelada não tivesse existido: volta também os ajustes de antes dela (ex.: campo pago de teste)
      return estadoInicial({ ...(app.configAntes ?? app.estado.config), goleiros: [] })
  }
}
