import { createContext, useContext } from 'react'

// Confirmação em modal (no lugar do confirm() do navegador).

export type PedidoDeConfirmacao = {
  titulo: string
  mensagem: string
  botao: string // texto do botão que confirma
  perigo?: boolean // botão vermelho (apaga ou tira algo)
  voltar?: string // texto do botão que desiste (padrão: "Cancelar")
  /** Para o que não tem volta: a pessoa digita este texto (ex.: o nome da turma) para liberar o botão. */
  digitar?: string
  aoConfirmar: () => void
}

export const ContextoDeConfirmacao = createContext<(pedido: PedidoDeConfirmacao) => void>(() => {})

/** Abre o modal de confirmação: `confirmar({ titulo, mensagem, botao, aoConfirmar })`. */
export const useConfirmar = () => useContext(ContextoDeConfirmacao)
