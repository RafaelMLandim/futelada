// Denúncia de foto ou apelido (PLANO.md, seção 17.6). Quem denuncia deixa de ver a foto na hora (fica guardado
// no celular, por conta); o servidor só tira a foto de todo mundo quando 3 pessoas diferentes denunciam.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { obterNuvem } from '../nuvem'
import type { MotivoDaDenuncia } from '../nuvem/tipos'
import { donoDoCelular } from './donoDoCelular'

const CHAVE = 'fotos:denunciadas'
const ouvintes = new Set<() => void>()
let versao = 0

function lerDenunciadas(): string[] {
  const dono = donoDoCelular()
  if (!dono) return []
  try {
    const guardadas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, string[]>
    return Array.isArray(guardadas[dono]) ? guardadas[dono] : []
  } catch {
    return []
  }
}

/** Esta conta já foi denunciada por quem está logado (a foto dela não aparece mais aqui). */
export const fotoDenunciada = (conta: string) => lerDenunciadas().includes(conta)

function guardarDenunciada(conta: string) {
  const dono = donoDoCelular()
  if (!dono) return
  try {
    const guardadas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, string[]>
    guardadas[dono] = [...new Set([...(guardadas[dono] ?? []), conta])]
    localStorage.setItem(CHAVE, JSON.stringify(guardadas))
  } catch {
    // sem armazenamento: some até fechar o app
  }
  versao++
  ouvintes.forEach((ouvinte) => ouvinte())
}

/** Envia a denúncia; deu certo: a foto some para quem denunciou. Sem internet, dá erro e nada muda. */
export async function denunciarFoto(conta: string, motivo: MotivoDaDenuncia): Promise<void> {
  const nuvem = await obterNuvem()
  if (!nuvem) throw new Error('sem nuvem')
  await nuvem.denunciarFoto(conta, motivo)
  guardarDenunciada(conta)
}

/** Tira das fotos (conta → foto) as que quem está logado denunciou. */
export function semAsDenunciadas<Chave extends string>(fotos: Record<Chave, string>, contaDe: (chave: Chave) => string | undefined): Record<Chave, string> {
  const denunciadas = new Set(lerDenunciadas())
  return Object.fromEntries(Object.entries(fotos).filter(([chave]) => !denunciadas.has(contaDe(chave as Chave) ?? ''))) as Record<Chave, string>
}

/** Fotos das contas para mostrar na tela (conta → foto), sem as denunciadas. Vazio até carregar ou sem internet. */
export function useFotosDasContas(contas: string[]): Record<string, string> {
  const atualizacao = useSyncExternalStore((ouvinte) => { ouvintes.add(ouvinte); return () => ouvintes.delete(ouvinte) }, () => versao)
  const chave = [...new Set(contas)].sort().join(',')
  const [fotos, setFotos] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!chave) return
    let vivo = true
    void obterNuvem()
      .then((nuvem) => nuvem?.fotosDasContas(chave.split(',')))
      .then((lidas) => { if (vivo && lidas) setFotos(lidas) })
      .catch(() => null)
    return () => { vivo = false }
  }, [chave])
  void atualizacao
  return chave ? semAsDenunciadas(fotos, (conta) => conta) : {}
}
