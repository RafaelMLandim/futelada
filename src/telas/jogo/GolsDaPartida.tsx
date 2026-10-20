import { useState } from 'react'
import { ResumoDeGols } from '../../components/ResumoDeGols'
import { definirAutorDoGol, outro, removerGol } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Colete, Gol, Lado, Time } from '../../types/pelada'
import { useSomenteLeitura } from '../../utils/somenteLeitura'
import { EscolherAutor } from './QuemFezGol'

/**
 * Gols de uma partida com a correção de quem fez (marcar depois o gol "Sem autor").
 * `partida` = número da partida no histórico; null = a partida em andamento (aí também dá para remover o gol).
 */
export function GolsCorrigiveis({ pelada, partida, gols, times, coletes, goleiros }: {
  pelada: Pelada; partida: number | null; gols: Gol[]; times: Record<Lado, Time>; coletes: Record<Lado, Colete>; goleiros: Record<Lado, string | null>
}) {
  const [autorDe, setAutorDe] = useState<number | null>(null)
  const somenteLeitura = useSomenteLeitura()
  const g = autorDe !== null ? gols[autorDe] : null
  return (
    <>
      <ResumoDeGols gols={gols} tempoMin={pelada.app.estado.config.tempoMin}
        nomeDoLado={{ A: `Time ${times.A.numero}`, B: `Time ${times.B.numero}` }}
        onAutor={somenteLeitura ? undefined : setAutorDe}
        onRemover={partida === null && !somenteLeitura ? (i) => pelada.aplicar((e) => removerGol(e, i)) : undefined} />
      {g && autorDe !== null && (
        <EscolherAutor pelada={pelada} titulo={`Gol do Time ${times[g.lado].numero}`} colete={coletes[g.lado]} time={times[g.lado]} adversario={times[outro(g.lado)]}
          goleiros={{ time: goleiros[g.lado], adversario: goleiros[outro(g.lado)] }}
          contraInicial={!!g.contra} naoSei="Não sei · deixar sem autor"
          onEscolher={(autor, contra) => pelada.aplicar((e) => definirAutorDoGol(e, partida, autorDe, autor, contra))}
          onFechar={() => setAutorDe(null)} />
      )}
    </>
  )
}

// Gols da partida da pelada: quem fez de cada lado e o minuto.
export function GolsDaPartida({ pelada }: { pelada: Pelada }) {
  const { estado } = pelada.app
  if (!estado.emCampo) return null
  return <GolsCorrigiveis pelada={pelada} partida={null} gols={estado.gols} times={estado.emCampo} coletes={estado.config.coletes} goleiros={estado.goleiros} />
}
