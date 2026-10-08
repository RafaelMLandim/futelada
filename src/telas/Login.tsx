import { Logo } from '../components/Logo'
import type { useConta } from '../store/conta'

const google = (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
)

/** Silhueta de public/silhuetas pintada com uma cor (máscara CSS). */
function Silhueta({ nome, cor, style }: { nome: 'artilheiro' | 'goleiro'; cor: string; style: React.CSSProperties }) {
  const url = `url(${import.meta.env.BASE_URL}silhuetas/${nome}.svg)`
  return <div aria-hidden="true" style={{ position: 'absolute', background: cor, maskImage: url, WebkitMaskImage: url, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', ...style }} />
}

/**
 * Primeira tela: entrar com o Google (quem já entrou vai direto para o início).
 * `conta` undefined = ainda vendo se já tem login (mostra só a logo).
 * No fundo, o artilheiro chuta e o goleiro voa (as mesmas silhuetas dos troféus).
 */
export function Login({ conta }: { conta?: ReturnType<typeof useConta> }) {
  return (
    <div className="scr" style={{ height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <Silhueta nome="goleiro" cor="rgba(255,255,255,.13)" style={{ width: '108%', aspectRatio: '582 / 360', right: '-30%', top: '1%', transform: 'scaleX(-1) rotate(-10deg)' }} />
      <Silhueta nome="artilheiro" cor="rgba(255,210,63,.2)" style={{ width: '62%', aspectRatio: '739 / 980', left: '-10%', bottom: '-2%' }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 24, textAlign: 'center' }}>
        <Logo tamanho={150} fundo={false} />
        {conta && (
          <>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="num" style={{ color: 'var(--amarelo)', fontSize: 46, lineHeight: .95, textShadow: '0 3px 0 var(--navy)' }}>
                2 GOLS<br />OU 10 MINUTOS
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: 1.35, textShadow: '0 2px 0 rgba(0,0,0,.35)' }}>
                Quem ganha fica. O resto o app resolve:<br />lista, times, placar e a resenha da turma.
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 320 }}>
              <button className="btn w" style={{ textTransform: 'none', gap: 10 }} onClick={conta.entrar}>{google} Entrar com Google</button>
              {conta.erro && <span style={{ color: '#ffb39e', fontSize: 14, fontWeight: 700 }}>{conta.erro}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
