// O que muda quando o app roda como app de loja (Capacitor) e não no navegador:
// os links vão para o site, e o compartilhar usa o do celular (o navegador interno não tem).

import { Capacitor } from '@capacitor/core'

/** Rodando como app de loja (Android/iPhone)? */
export const nativo = () => Capacitor.isNativePlatform()

/** Endereço do site: no app, o endereço interno ("localhost") não serve para mandar no grupo. */
export const enderecoDoSite = () => (nativo() ? 'https://dois-ou-dez.web.app' : location.origin)

/** Compartilhar texto/link. false = não tem como compartilhar aqui (ou cancelou). */
export async function compartilharTexto(dados: { title?: string; text: string; url?: string }): Promise<boolean> {
  try {
    if (nativo()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ ...dados, dialogTitle: dados.title })
      return true
    }
    if (!navigator.share) return false
    await navigator.share(dados)
    return true
  } catch {
    return false
  }
}

/** No app: salva a imagem e abre o compartilhar do celular. false = cancelou. */
export async function compartilharArquivoNativo(imagem: Blob, nomeDoArquivo: string): Promise<boolean> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const base64 = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result).split(',')[1])
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(imagem)
  })
  const { uri } = await Filesystem.writeFile({ path: nomeDoArquivo, data: base64, directory: Directory.Cache })
  try {
    await Share.share({ title: 'Dois ou Dez', files: [uri] })
    return true
  } catch {
    return false // cancelou
  }
}

/**
 * Deita a tela (chave do mata-mata) ou solta de novo. No app de loja usa o plugin; no navegador,
 * o celular só deixa no app instalado (Android). Onde não dá, a própria tela gira o desenho.
 */
export async function deitarTela(deitar: boolean): Promise<void> {
  try {
    if (nativo()) {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation')
      await (deitar ? ScreenOrientation.lock({ orientation: 'landscape' }) : ScreenOrientation.unlock())
      return
    }
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    if (deitar) await o.lock?.('landscape')
    else o.unlock?.()
  } catch {
    // não deixou travar: a chave gira o desenho sozinha
  }
}

/**
 * Código deste celular (para as 10 peladas grátis valerem por celular, não só por conta). No app de
 * loja, é o código que o celular dá para o app (no Android não muda ao reinstalar); no navegador, um código guardado
 * no próprio navegador. Não é dado pessoal.
 */
export async function codigoDoAparelho(): Promise<string> {
  if (nativo()) {
    const { Device } = await import('@capacitor/device')
    return `${Capacitor.getPlatform()}-${(await Device.getId()).identifier}`
  }
  try {
    let id = localStorage.getItem('app:aparelho')
    if (!id) {
      id = `web-${crypto.randomUUID()}`
      localStorage.setItem('app:aparelho', id)
    }
    return id
  } catch {
    return 'web-sem-armazenamento'
  }
}

/** Abre um link fora do app (no app de loja, no navegador do celular). */
export async function abrirLink(url: string) {
  window.open(url, '_blank', 'noopener')
}

/** Páginas do site com os termos de uso, a política de privacidade e como excluir a conta. */
export const paginaDoSite = (pagina: 'termos' | 'privacidade' | 'excluir-conta') => `${enderecoDoSite()}/${pagina}.html`
