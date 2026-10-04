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

/** Cor do texto que fica legível sobre a cor (escuro em cores claras, branco nas escuras). */
export function textoSobre(cor: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16) / 255)
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminancia = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
  return luminancia > 0.3 ? '#10223A' : '#FFFFFF'
}

// Cor da camisa na Tabela, por número do time (repete depois do último).
export const CORES = ['#D62828', '#1E5FBF', '#F4F4F4', '#F77F00', '#7B2CBF', '#2E9E44', '#FFD23F', '#14A3A3']

export const corDoTime = (numero: number) => CORES[(numero - 1) % CORES.length]

// Cores para os times do torneio (cada time escolhe uma, sem repetir): 30 cores.
export const CORES_TORNEIO: Colete[] = [
  ...COLETES,
  { nome: 'Vinho', cor: '#7A1F3D' },
  { nome: 'Ciano', cor: '#14A3A3' },
  { nome: 'Marrom', cor: '#8B5A2B' },
  { nome: 'Cinza', cor: '#7A8691' },
  { nome: 'Azul-marinho', cor: '#16245C' },
  { nome: 'Azul-claro', cor: '#6EC1F0' },
  { nome: 'Verde-limão', cor: '#A6D930' },
  { nome: 'Verde-escuro', cor: '#1E5631' },
  { nome: 'Turquesa', cor: '#3FE0C5' },
  { nome: 'Mostarda', cor: '#C99A12' },
  { nome: 'Dourado', cor: '#E8C15A' },
  { nome: 'Salmão', cor: '#F49A85' },
  { nome: 'Coral', cor: '#FF5E4D' },
  { nome: 'Grená', cor: '#9E1B1B' },
  { nome: 'Lilás', cor: '#B79CED' },
  { nome: 'Magenta', cor: '#C2185B' },
  { nome: 'Rosa-claro', cor: '#F7B8D2' },
  { nome: 'Bege', cor: '#E3D2A8' },
  { nome: 'Grafite', cor: '#4A4F55' },
  { nome: 'Prata', cor: '#C4CCD4' },
  { nome: 'Azul-royal', cor: '#3A3FD8' },
]

/**
 * Cor própria de cada time da pelada (Time 1, Time 2…), sempre diferente das cores
 * dos coletes — assim não se confunde o time com o lado do campo.
 */
export function corDoTimeDaPelada(numero: number, coletes: Colete[]): string {
  const usadas = new Set(coletes.map((c) => c.cor))
  const livres = CORES_TORNEIO.filter((c) => !usadas.has(c.cor))
  return livres[(numero - 1) % livres.length].cor
}
