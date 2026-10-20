// A pelada da nuvem nas mesmas telas do dono, para quem só acompanha (PLANO.md, seção 16).

import type { PeladaCompartilhada } from '../nuvem/tipos'
import type { useCobranca } from './cobranca'
import { completarEstado } from './migracao'
import type { Pelada } from './usePelada'

const nada = () => {}
/** Sem campo pago para quem não é o dono (a Lista pede a cobrança, mas ela não aparece). */
export const SEM_COBRANCA: ReturnType<typeof useCobranca> = { marcar: nada, criarLink: async () => null, codigo: null }

/** A pelada como está na nuvem, num objeto igual ao do dono, mas em que nenhuma ação faz nada. */
export function peladaSoParaVer(dados: PeladaCompartilhada): Pelada {
  return {
    app: { estado: completarEstado(dados.app.estado), iniciada: true, crono: dados.app.crono },
    aplicar: nada, iniciar: nada, crono: nada, acrescimos: nada, desfazer: nada, compartilhar: nada, substituir: nada, encerrar: nada, cancelar: nada,
  }
}
