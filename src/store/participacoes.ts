// Torneios em que quem está logado joga (PLANO.md, seção 22.3): aparecem na pré-tela "Torneios" (Jogando).

import { useEffect, useState } from 'react'
import { obterNuvem } from '../nuvem'
import type { ParticipacaoNoTorneio } from '../nuvem/tipos'

/** null = carregando. */
export function useParticipacoes() {
  const [participacoes, setParticipacoes] = useState<ParticipacaoNoTorneio[] | null>(null)
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
