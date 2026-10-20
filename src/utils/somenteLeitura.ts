// Pelada compartilhada (PLANO.md, seção 16): quem só acompanha (link ?ver=) vê as telas sem nenhuma ação;
// quem assumiu o controle da pelada de outra pessoa marca tudo, mas o encerramento vai para o dono.

import { createContext, useContext } from 'react'

export const SomenteLeitura = createContext(false)

/** true = quem está vendo só acompanha (sem marcar gol, sem mexer na lista, sem ajustes). */
export const useSomenteLeitura = () => useContext(SomenteLeitura)

/** Assumiu o controle da pelada de outra pessoa (null = é a própria pelada). */
export const Ajudando = createContext<{ nomeDoDono: string | null } | null>(null)

export const useAjudando = () => useContext(Ajudando)
