import { useState } from 'react'
import { Camisa } from '../../components/Camisa'
import { outro } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Jogador, Lado } from '../../types/pelada'

// Pergunta quem fez o gol para a artilharia.
export function QuemFezGol({ pelada, lado, onGol, onFechar }: {
  pelada: Pelada; lado: Lado; onGol: (lado: Lado, autor: Jogador | null, contra?: boolean) => void; onFechar: () => void
}) {
  const { estado } = pelada.app
  // Gol contra: a lista mostra os jogadores do outro time
  const [contra, setContra] = useState(false)
  if (!estado.emCampo) return null
  const time = estado.emCampo[lado]
  const colete = estado.config.coletes[lado]

  const marcar = (autor: Jogador | null) => {
    onFechar()
    onGol(lado, autor, contra)
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Gol do Time ${time.numero}`} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">
          <span className="row" style={{ gap: 8 }}>
            <Camisa cor={colete.cor} contorno="#fff" />Gol do Time {time.numero}
          </span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Cancelar" onClick={onFechar}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </button>
        </div>
        <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            {contra ? `Gol contra · quem do Time ${estado.emCampo[outro(lado)].numero} fez?` : 'Quem fez?'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {estado.emCampo[contra ? outro(lado) : lado].jogadores.map((j) => (
              <button key={j.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => marcar(j)}>
                {j.nome}
              </button>
            ))}
          </div>
          <button className="btn sm" onClick={() => marcar(null)}>Não sei · só marcar o gol</button>
          {!contra && <button className="btn w sm" onClick={() => setContra(true)}>Foi gol contra</button>}
        </div>
      </section>
    </div>
  )
}
