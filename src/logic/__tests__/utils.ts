// Utilitários compartilhados pelos testes da lógica.

import { adicionarJogador, blocosDaFila, configPadrao, novaSessao, novoJogador } from '..'
import type { Estado } from '../../types/pelada'

export const nomes = (js: { nome: string }[]) => js.map((j) => j.nome)
export const blocos = (s: Estado) => blocosDaFila(s).map(nomes)

export function sessao(lista: string[], config = configPadrao): Estado {
  return lista.reduce((s, n) => adicionarJogador(s, novoJogador(n)), novaSessao(config))
}

export const LISTA = ['João', 'Carlos', 'Bruno', 'Marcos', 'Rafael', 'Daniel', 'Junior', 'Landim', 'Mano', 'Lucas']
