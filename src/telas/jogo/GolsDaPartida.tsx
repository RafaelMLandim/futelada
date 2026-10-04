import { ResumoDeGols } from '../../components/ResumoDeGols'
import { removerGol } from '../../logic'
import type { Pelada } from '../../store/usePelada'

// Gols da partida da pelada: quem fez de cada lado e o minuto.
export function GolsDaPartida({ pelada }: { pelada: Pelada }) {
  const { estado } = pelada.app
  if (!estado.emCampo) return null
  return (
    <ResumoDeGols gols={estado.gols} tempoMin={estado.config.tempoMin}
      nomeDoLado={{ A: `Time ${estado.emCampo.A.numero}`, B: `Time ${estado.emCampo.B.numero}` }}
      onRemover={(i) => pelada.aplicar((e) => removerGol(e, i))} />
  )
}
