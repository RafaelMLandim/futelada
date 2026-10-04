import { createContext, useContext } from 'react'

// Confirmação em modal (no lugar do confirm() do navegador).

export type PedidoDeConfirmacao = {
  titulo: string
  mensagem: string
  botao: string // texto do botão que confirma
  perigo?: boolean // botão vermelho (apaga ou tira algo)
  aoConfirmar: () => void
}

export const ContextoDeConfirmacao = createContext<(pedido: PedidoDeConfirmacao) => void>(() => {})

/** Abre o modal de confirmação: `confirmar({ titulo, mensagem, botao, aoConfirmar })`. */
export const useConfirmar = () => useContext(ContextoDeConfirmacao)
