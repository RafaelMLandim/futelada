// Sigla do time do torneio (3 letras, como no Brasileirão: "FLA", "PAL"). Aparece onde o nome inteiro não cabe,
// como nos botões de gol e nas escalações do jogo. O organizador pode escrever a sua; sem ela, sai do nome.

import type { TimeTorneio } from '../../types/torneio'

/** Palavras que não ajudam a reconhecer o time ("Esporte Clube", "Futebol Clube", "de", "do"…). */
const PALAVRAS_SEM_PESO = new Set(['FC', 'EC', 'SC', 'AC', 'CF', 'FUTEBOL', 'CLUBE', 'ESPORTE', 'ESPORTIVA', 'ASSOCIACAO', 'ATLETICO', 'DE', 'DO', 'DA', 'DOS', 'DAS', 'E', 'O', 'A', 'OS', 'AS', 'TIME'])

/**
 * Sigla a partir do nome: as 3 primeiras letras da palavra principal ("Vermelho FC" → "VER"; "Rubro Negro" → "RUB").
 * Nome com número ("Time 3") fica com a inicial e o número ("T3"). Sem acento e em maiúsculas.
 */
export function siglaAutomatica(nome: string): string {
  const palavras = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
  if (palavras.length === 0) return '?'
  const numero = palavras.find((palavra) => /^\d+$/.test(palavra))
  if (numero) return `${palavras[0][0]}${numero}`.slice(0, 3)
  const principal = palavras.find((palavra) => !PALAVRAS_SEM_PESO.has(palavra) && /[A-Z]/.test(palavra)) ?? palavras[0]
  return principal.slice(0, 3)
}

/** A sigla do time: a que o organizador escreveu ou a que sai do nome. */
export const siglaDoTime = (time: Pick<TimeTorneio, 'nome' | 'sigla'>) => time.sigla?.trim().toUpperCase() || siglaAutomatica(time.nome)
