import { useCallback, useState, type ReactNode } from 'react'
import { ContextoDeConfirmacao, type PedidoDeConfirmacao } from '../utils/confirmacao'
import { normalizarNome } from '../utils/formatar'

// Mostra o modal de confirmação pedido por qualquer tela (via useConfirmar). No que apaga (`perigo`), o
// "Cancelar" vem selecionado: um Enter ou toque sem querer não apaga nada. Com `digitar`, o botão só libera
// depois de digitar o texto pedido (ex.: o nome da turma).
export function ProvedorDeConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoDeConfirmacao | null>(null)
  const [digitado, setDigitado] = useState('')
  const confirmar = useCallback((novo: PedidoDeConfirmacao) => { setDigitado(''); setPedido(novo) }, [])
  const fechar = () => setPedido(null)
  const liberado = !pedido?.digitar || normalizarNome(digitado) === normalizarNome(pedido.digitar)

  return (
    <ContextoDeConfirmacao.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-label={pedido.titulo} onClick={fechar}>
          <section className="panel" onClick={(evento) => evento.stopPropagation()}>
            <div className="ph">{pedido.titulo}</div>
            <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{pedido.mensagem}</div>
            {pedido.digitar && (
              <div className="pb" style={{ paddingTop: 0, display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14 }}>Para confirmar, digite <b>{pedido.digitar}</b>:</span>
                <label style={{ display: 'flex' }}>
                  <span className="vh">Digite {pedido.digitar} para confirmar</span>
                  <input className="inp" autoFocus autoComplete="off" autoCapitalize="characters" value={digitado}
                    onChange={(evento) => setDigitado(evento.target.value.toUpperCase())} />
                </label>
              </div>
            )}
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn w sm" autoFocus={!!pedido.perigo && !pedido.digitar} onClick={fechar}>{pedido.voltar ?? 'Cancelar'}</button>
              <button className={'btn sm' + (pedido.perigo ? ' r' : '')} autoFocus={!pedido.perigo} disabled={!liberado}
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
