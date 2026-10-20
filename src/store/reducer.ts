// Ações do app: aplicar uma regra, controlar o cronômetro e encerrar.

import { atualizarSubiram, configPadrao, novaSessao } from '../logic'
import type { AppState } from '../types/app'
import type { Estado } from '../types/pelada'
import { alternarCrono, cronoZerado, darAcrescimos } from './cronometro'
import { LIMITE_DESFAZER, descreverMudanca, mudouOJogo, restaurar } from './desfazer'

export type Acao =
  | { tipo: 'aplicar'; fn: (e: Estado) => Estado; novaPartida?: boolean }
  | { tipo: 'iniciar' }
  | { tipo: 'crono'; rodando: boolean }
  | { tipo: 'acrescimos'; min: number }
  | { tipo: 'encerrar' }
  | { tipo: 'desfazer' }
  | { tipo: 'cancelar' } // descarta a pelada (sem histórico nem caixa) e volta os ajustes de antes dela
  | { tipo: 'compartilhar'; codigo: string; chave: string } // a pelada passa a ficar na nuvem (links de acompanhar e de controle)
  | { tipo: 'substituir'; app: Pick<AppState, 'estado' | 'crono'> } // pega a pelada como está na nuvem (retomar o controle)


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
      const foto = mudouOJogo(app.estado, estado)
        ? [{ estado: app.estado, descricao: descreverMudanca(app.estado, estado), ...(acao.novaPartida && { crono: app.crono }) }]
        : []
      return {
        ...app,
        estado,
        crono: acao.novaPartida ? cronoZerado : app.crono,
        desfazer: [...(app.desfazer ?? []), ...foto].slice(-LIMITE_DESFAZER),
      }
    }
    case 'desfazer': {
      const pilha = app.desfazer ?? []
      const ultima = pilha[pilha.length - 1]
      if (!ultima) return app
      return { ...app, estado: restaurar(app.estado, ultima.estado), crono: ultima.crono ?? app.crono, desfazer: pilha.slice(0, -1) }
    }
    case 'iniciar':
      return { ...app, iniciada: true }
    case 'compartilhar':
      return { ...app, compartilhada: acao.codigo, chaveDeControle: acao.chave }
    case 'substituir':
      // o que foi feito em outro celular não dá para desfazer aqui
      return { ...app, estado: acao.app.estado, crono: acao.app.crono, desfazer: [] }
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
