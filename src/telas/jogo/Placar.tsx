import { PlacarLed } from '../../components/PlacarLed'
import type { Estado } from '../../types/pelada'

// Placar da pelada: "Time 3" com a camisa e a cor do colete de cada lado.
export function Placar({ estado, decorrido, rodando, fim, acrescimoMin }: {
  estado: Estado; decorrido: number; rodando: boolean; fim: boolean; acrescimoMin?: number
}) {
  const { config, placar, emCampo } = estado
  if (!emCampo) return null
  const lado = (l: 'A' | 'B') => ({ titulo: `Time ${emCampo[l].numero}`, sub: config.coletes[l].nome, cor: config.coletes[l].cor })
  return (
    <PlacarLed lados={{ A: lado('A'), B: lado('B') }} placar={placar} tempoMin={config.tempoMin} gols={config.gols}
      decorrido={decorrido} rodando={rodando} fim={fim} acrescimoMin={acrescimoMin} />
  )
}
