import { useState } from 'react'
import { Icone } from './Icone'
import { Passo } from './Passo'

/** Modal para definir na hora quantos minutos de acréscimo e soltar o relógio. */
export function EscolherAcrescimos({ onComecar, onCancelar }: { onComecar: (min: number) => void; onCancelar: () => void }) {
  const [min, setMin] = useState(2)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Acréscimos" onClick={onCancelar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">Acréscimos</div>
        <div className="pb" style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Quantos minutos de acréscimo?</div>
          <Passo rotulo="minutos de acréscimo" valor={min} sufixo="min"
            menos={() => setMin((m) => Math.max(1, m - 1))} mais={() => setMin((m) => Math.min(10, m + 1))} />
          <button className="btn" onClick={() => onComecar(min)}><Icone nome="play" /> Começar acréscimos</button>
          <button className="btn w sm" onClick={onCancelar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}
