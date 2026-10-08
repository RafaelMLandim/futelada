// Login de um toque do Google: uma folha do próprio Google aparece por cima do app
// ("Continuar como …"), sem abrir outra janela. Devolve o token para o Firebase.

type Momento = { isSkippedMoment(): boolean; isDismissedMoment(): boolean; getDismissedReason?(): string }
type GoogleId = {
  initialize(opcoes: Record<string, unknown>): void
  prompt(aoMudar?: (m: Momento) => void): void
  cancel(): void
}
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const CLIENTE = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

let carregando: Promise<GoogleId | null> | null = null
function carregar(): Promise<GoogleId | null> {
  if (!CLIENTE) return Promise.resolve(null)
  carregando ??= new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve(window.google?.accounts?.id ?? null)
    s.onerror = () => { carregando = null; resolve(null) }
    document.head.appendChild(s)
  })
  return carregando
}

/** Já deixa o script pronto (a folha abre mais rápido no toque). */
export const prepararUmToque = () => void carregar()

/**
 * Mostra a folha do Google. Resultado:
 * - `{ token }`: escolheu a conta;
 * - `'fechou'`: a folha apareceu e a pessoa fechou (não faz nada);
 * - `'indisponivel'`: o celular não mostrou a folha (sem conta no navegador, bloqueio...) → usar a página do Google.
 */
export async function entrarComUmToque(): Promise<{ token: string } | 'fechou' | 'indisponivel'> {
  const gis = await carregar()
  if (!gis) return 'indisponivel'
  const inicio = performance.now()
  return new Promise((resolve) => {
    let feito = false
    const fim = (r: { token: string } | 'fechou' | 'indisponivel') => { if (!feito) { feito = true; resolve(r) } }
    gis.initialize({
      client_id: CLIENTE,
      callback: (r: { credential?: string }) => fim(r.credential ? { token: r.credential } : 'fechou'),
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      itp_support: true,
      context: 'signin',
    })
    gis.prompt((m) => {
      if (m.isDismissedMoment() && m.getDismissedReason?.() === 'credential_returned') return
      // pulou logo de cara = a folha nem apareceu; depois de um tempo = a pessoa fechou
      if (m.isSkippedMoment() || m.isDismissedMoment()) fim(performance.now() - inicio < 1500 ? 'indisponivel' : 'fechou')
    })
  })
}
