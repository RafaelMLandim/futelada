// A pelada e o torneio salvos no celular são de quem estava logado. Ao sair da conta, ficam guardados à
// parte; se outra pessoa entrar no mesmo celular, ela começa com os dela (ou do zero) e não cai na pelada
// de quem saiu. Quando a primeira pessoa volta, o que era dela reaparece como estava.

import type { Perfil } from '../nuvem/tipos'

const CHAVE_DONO = 'celular:dono'
const guardado = (uid: string) => `celular:guardado:${uid}`
/** O que fica salvo no celular e é de uma pessoa (o modo e a identidade do aparelho não são). */
export const CHAVES_DA_CONTA = ['pelada:v5', 'torneio:v1', 'torneio:ativo']

/** Guarda à parte o que está no celular, em nome de `uid`, e limpa. */
function guardar(uid: string) {
  const dados: Record<string, string> = {}
  for (const chave of CHAVES_DA_CONTA) {
    const valor = localStorage.getItem(chave)
    if (valor !== null) dados[chave] = valor
    localStorage.removeItem(chave)
  }
  if (Object.keys(dados).length) localStorage.setItem(guardado(uid), JSON.stringify(dados))
  else localStorage.removeItem(guardado(uid))
}

/** Traz de volta o que estava guardado em nome de `uid`. */
function trazerDeVolta(uid: string) {
  const salvo = localStorage.getItem(guardado(uid))
  if (!salvo) return
  const dados = JSON.parse(salvo) as Record<string, string>
  for (const [chave, valor] of Object.entries(dados)) {
    // o que já está no celular (feito sem dono, por uma versão antiga do app) tem preferência
    if (localStorage.getItem(chave) === null) localStorage.setItem(chave, valor)
  }
  localStorage.removeItem(guardado(uid))
}

/**
 * Chamar a cada mudança de login, antes de as telas lerem a pelada e o torneio do celular.
 * Entrar: o que está no celular sem dono passa a ser de quem entrou; o de outra pessoa é guardado à parte.
 * Sair (fica anônimo): o de quem saiu é guardado à parte.
 */
export function trocarDeConta(perfil: Perfil | null | undefined) {
  if (!perfil) return // ainda carregando ou entre o sair e o anônimo
  try {
    const dono = localStorage.getItem(CHAVE_DONO)
    const agora = perfil.anonimo ? null : perfil.uid
    if (dono === agora) return
    if (dono) guardar(dono)
    if (agora) {
      trazerDeVolta(agora)
      localStorage.setItem(CHAVE_DONO, agora)
    } else {
      localStorage.removeItem(CHAVE_DONO)
    }
  } catch {
    // sem armazenamento: não há nada salvo no celular para separar
  }
}
