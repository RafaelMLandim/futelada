// Torneios em que quem está logado joga (PLANO.md, seção 22.3): aparecem na pré-tela "Torneios" (Jogando).

import { useEffect } from 'react'
import { obterNuvem } from '../nuvem'
import type { ParticipacaoNoTorneio } from '../nuvem/tipos'
import { useLembrado } from './lembrado'

/** null = carregando. */
export function useParticipacoes() {
  const [participacoes, setParticipacoes] = useLembrado<ParticipacaoNoTorneio[] | null>('participacoes', null, true)
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem) { setParticipacoes([]); return }
      if (vivo) parar = nuvem.ouvirParticipacoes(setParticipacoes)
    })
    return () => { vivo = false; parar() }
  }, [])
  return participacoes
}
