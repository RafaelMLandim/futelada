import { Icone } from './Icone'

// Contador com botões de menos e mais.
export function Passo({ valor, menos, mais, rotulo, sufixo }: {
  valor: number; menos: () => void; mais: () => void; rotulo: string; sufixo?: string
}) {
  return (
    <div className="row">
      <button className="ib s" aria-label={`Menos ${rotulo}`} onClick={menos}><Icone nome="menos" /></button>
      <span className="num" style={{ fontSize: 26, minWidth: 64, textAlign: 'center' }}>
        {valor}{sufixo && <span style={{ fontSize: 18 }}> {sufixo}</span>}
      </span>
      <button className="ib s" aria-label={`Mais ${rotulo}`} onClick={mais}><Icone nome="mais" /></button>
    </div>
  )
}
