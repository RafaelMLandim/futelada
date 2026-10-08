// Mantém a tela do celular ligada (Wake Lock) enquanto a pelada ou o torneio estão abertos:
// o celular não bloqueia no meio do jogo e o cronômetro e os apitos continuam funcionando.

import { useEffect } from 'react'

export function useTelaLigada(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let trava: WakeLockSentinel | null = null
    let parado = false
    const pedir = async () => {
      if (parado || document.visibilityState !== 'visible') return
      try {
        trava = await navigator.wakeLock.request('screen')
      } catch {
        // sem permissão (bateria fraca, modo economia...): o celular bloqueia normalmente
      }
    }
    // o navegador solta a trava quando o app sai da tela; ao voltar, pede de novo
    const aoVoltar = () => void pedir()
    void pedir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      parado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      void trava?.release().catch(() => null)
    }
  }, [ativo])
}
