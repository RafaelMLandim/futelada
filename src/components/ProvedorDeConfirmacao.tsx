import { useCallback, useState, type ReactNode } from 'react'
import { ContextoDeConfirmacao, type PedidoDeConfirmacao } from '../utils/confirmacao'

// Mostra o modal de confirmação pedido por qualquer tela (via useConfirmar).
export function ProvedorDeConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoDeConfirmacao | null>(null)
  const confirmar = useCallback((p: PedidoDeConfirmacao) => setPedido(p), [])
  const fechar = () => setPedido(null)

  return (
    <ContextoDeConfirmacao.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-label={pedido.titulo} onClick={fechar}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">{pedido.titulo}</div>
            <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{pedido.mensagem}</div>
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn w sm" onClick={fechar}>Cancelar</button>
              <button className={'btn sm' + (pedido.perigo ? ' r' : '')} autoFocus
                onClick={() => { fechar(); pedido.aoConfirmar() }}>
                {pedido.botao}
              </button>
            </div>
          </section>
        </div>
      )}
    </ContextoDeConfirmacao.Provider>
  )
}
