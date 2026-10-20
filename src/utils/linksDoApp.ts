// App Links (PLANO.md, seção 16): no app instalado, os links do site (?ver=, ?controle=, ?pagar=, ?entrar=)
// abrem dentro do app. Os parâmetros do link viram o endereço da tela, e o App lê como no site.

import { App } from '@capacitor/app'
import { nativo } from './nativo'

const SITE = 'https://dois-ou-dez.web.app'
const CHAVE_LINK_USADO = 'link-de-abertura-usado'

/** Os parâmetros ("?ver=…") de um link do site; null = não é um link do site. */
function parametrosDoLink(endereco: string): string | null {
  try {
    const url = new URL(endereco)
    return url.origin === SITE ? url.search : null
  } catch {
    return null
  }
}

/**
 * Antes de a tela carregar: se o app foi aberto por um link, põe os parâmetros dele no endereço (uma vez só:
 * ao recarregar, o Android ainda devolve o mesmo link de abertura). Com o app já aberto, tocar num link
 * recarrega a tela com os parâmetros dele.
 */
export async function abrirPeloLink(): Promise<void> {
  if (!nativo()) return
  const abertura = await App.getLaunchUrl().catch(() => undefined)
  const parametros = abertura?.url ? parametrosDoLink(abertura.url) : null
  let jaUsado: string | null = null
  try { jaUsado = sessionStorage.getItem(CHAVE_LINK_USADO) } catch { /* sem armazenamento: usa o link */ }
  if (parametros && abertura?.url !== jaUsado) {
    try { sessionStorage.setItem(CHAVE_LINK_USADO, abertura!.url) } catch { /* segue sem lembrar */ }
    history.replaceState(null, '', '/' + parametros)
  }
  void App.addListener('appUrlOpen', ({ url }) => {
    const novos = parametrosDoLink(url)
    if (novos !== null) location.href = '/' + novos
  })
}
