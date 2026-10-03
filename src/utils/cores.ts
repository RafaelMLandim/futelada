import type { Colete } from '../types/pelada'

// Cores de colete para escolher no início da pelada.
export const COLETES: Colete[] = [
  { nome: 'Vermelho', cor: '#D62828' },
  { nome: 'Azul', cor: '#1E5FBF' },
  { nome: 'Amarelo', cor: '#FFD23F' },
  { nome: 'Verde', cor: '#2E9E44' },
  { nome: 'Laranja', cor: '#F77F00' },
  { nome: 'Preto', cor: '#1B1B1B' },
  { nome: 'Branco', cor: '#F4F4F4' },
  { nome: 'Roxo', cor: '#7B2CBF' },
  { nome: 'Rosa', cor: '#E85D9E' },
]

/** Cor da camisa de quem está na fila (ainda sem colete). */
export const SEM_COLETE = '#C9D1BC'

/** Cor do texto que fica legível sobre o colete. */
export const textoSobre = (cor: string) =>
  ['#FFD23F', '#F4F4F4', '#F77F00'].includes(cor) ? '#10223A' : '#FFFFFF'

// Cor da camisa na Tabela, por número do time (repete depois do último).
export const CORES = ['#D62828', '#1E5FBF', '#F4F4F4', '#F77F00', '#7B2CBF', '#2E9E44', '#FFD23F', '#14A3A3']

export const corDoTime = (numero: number) => CORES[(numero - 1) % CORES.length]
