import { createContext, type ReactNode } from 'react'

/** Volta para a tela inicial (pelada, torneio, caixa, histórico). Fora das telas do app, null. */
export const VoltarAoInicio = createContext<(() => void) | null>(null)

/** Linha extra no cabeçalho de todas as telas (torneio compartilhado: código e se está ao vivo). */
export const StatusDaBarra = createContext<ReactNode>(null)
/** Bateria fraca na pelada: a Barra mostra a faixa vermelha (o organizador usa o botão de compartilhar do topo). */
export const FaixaDaBateria = createContext(false)
