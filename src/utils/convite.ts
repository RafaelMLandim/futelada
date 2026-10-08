// Convite para entrar no torneio compartilhado: link com o código.

import { compartilharTexto, enderecoDoSite, nativo } from './nativo'

export const linkDoConvite = (codigo: string) => `${enderecoDoSite()}${nativo() ? '/' : location.pathname}?entrar=${codigo}`

/** Abre o compartilhar do celular (WhatsApp etc.) ou copia o link. Devolve o que fez. */
export async function enviarConvite(codigo: string, nome: string): Promise<'enviado' | 'copiado' | 'falhou'> {
  const url = linkDoConvite(codigo)
  const texto = `Entre no torneio ${nome} para marcar os jogos. Código: ${codigo}`
  try {
    if (await compartilharTexto({ title: nome, text: texto, url })) return 'enviado'
    await navigator.clipboard.writeText(`${texto}\n${url}`)
    return 'copiado'
  } catch {
    return 'falhou'
  }
}

/** Código que veio no link (?entrar=ABC123), se houver. */
export function codigoDoLink(): string | null {
  return new URLSearchParams(location.search).get('entrar')
}

export function limparLink() {
  history.replaceState(null, '', location.pathname)
}
