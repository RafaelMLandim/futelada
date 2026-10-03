import type { Lado } from '../types/pelada'

export const LADOS: readonly Lado[] = ['A', 'B']

export const outro = (lado: Lado): Lado => (lado === 'A' ? 'B' : 'A')
