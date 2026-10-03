// Salva a pelada no celular (localStorage). Não há banco de dados.

import type { AppState } from '../types/app'
import { completarApp } from './migracao'

const CHAVE = 'pelada:v5'

export function carregar(): AppState | null {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo ? completarApp(JSON.parse(salvo) as Partial<AppState>) : null
  } catch {
    return null // sem armazenamento: começa do zero
  }
}

export function salvar(app: AppState): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(app))
  } catch {
    // armazenamento cheio ou bloqueado: segue só em memória
  }
}

export function apagarPelada(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada a apagar
  }
}
