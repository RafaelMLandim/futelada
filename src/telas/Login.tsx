import { useState, type FormEvent } from 'react'
import { Icone } from '../components/Icone'
import { Logo } from '../components/Logo'
import type { useConta } from '../store/conta'
import { abrirLink, paginaDoSite } from '../utils/nativo'

const google = (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
)

/** Desenho de public/ (silhueta ou arte) pintado com uma cor (máscara CSS). */
function Silhueta({ arquivo, cor, style }: { arquivo: string; cor: string; style: React.CSSProperties }) {
  const url = `url(${import.meta.env.BASE_URL}${arquivo})`
  return <div aria-hidden="true" style={{ position: 'absolute', background: cor, maskImage: url, WebkitMaskImage: url, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', ...style }} />
}

/**
 * Primeira tela: entrar com o Google ou com e-mail e senha (o formulário abre por cima, para não cobrir o
 * desenho). Quem já entrou vai direto para o início. `conta` undefined = ainda vendo se já tem login (só a logo).
 * No fundo, o goleiro voa e o jogador chuta, os dois em pinceladas (public/arte: goleiro.png, feito a partir da
 * silhueta do troféu com rastros e respingos, e chute.png).
 */
export function Login({ conta }: { conta?: ReturnType<typeof useConta> }) {
  const [comEmail, setComEmail] = useState(false)
  return (
    <div className="scr" style={{ height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <Silhueta arquivo="arte/goleiro.png" cor="rgba(255,255,255,.15)" style={{ width: '120%', aspectRatio: '1659 / 699', right: '-22%', top: '7%', transform: 'scaleX(-1) rotate(-10deg)' }} />
      <Silhueta arquivo="arte/chute.png" cor="rgba(255,255,255,.15)" style={{ width: '92%', aspectRatio: '736 / 723', left: '-3%', bottom: '-1%' }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '24px 24px 14dvh', textAlign: 'center' }}>
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
              <button className="btn" style={{ textTransform: 'none', gap: 10 }} onClick={() => setComEmail(true)}><Icone nome="email" /> Entrar com e-mail</button>
              {conta.erro && <span style={{ color: '#ffb39e', fontSize: 14, fontWeight: 700 }}>{conta.erro}</span>}
              <span style={{ color: '#fff', fontSize: 13, lineHeight: 1.4, textShadow: '0 1px 0 rgba(0,0,0,.35)' }}>
                Ao entrar, você concorda com os{' '}
                <button className="lnk" style={{ color: 'var(--amarelo)', padding: 0 }} onClick={() => void abrirLink(paginaDoSite('termos'))}>Termos de uso</button>
                {' '}e a{' '}
                <button className="lnk" style={{ color: 'var(--amarelo)', padding: 0 }} onClick={() => void abrirLink(paginaDoSite('privacidade'))}>Política de privacidade</button>.
              </span>
            </div>
          </>
        )}
      </div>
      {conta && comEmail && <EntrarComEmail conta={conta} onFechar={() => setComEmail(false)} />}
    </div>
  )
}

/** Janela do e-mail e senha: entrar ou criar a conta (com o nome, que aparece no app e para os mesários). */
function EntrarComEmail({ conta, onFechar }: { conta: ReturnType<typeof useConta>; onFechar: () => void }) {
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const pronto = !!email.trim() && !!senha && (!criando || !!nome.trim())
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!pronto) return
    setEnviando(true)
    setErro(await conta.comEmail(email, senha, criando ? nome : undefined))
    setEnviando(false)
  }
  const trocar = () => { setCriando(!criando); setErro(null) }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={criando ? 'Criar conta' : 'Entrar com e-mail'} onClick={onFechar}>
      <form className="panel" onSubmit={enviar} onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 380, textAlign: 'left' }}>
        <div className="ph">{criando ? 'Criar conta' : 'Entrar com e-mail'}</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          {criando && (
            <label style={{ display: 'flex' }}>
              <span className="vh">Seu nome</span>
              <input className="inp" autoComplete="name" autoCapitalize="words" placeholder="Seu nome" maxLength={40} value={nome}
                onChange={(ev) => { setNome(ev.target.value); setErro(null) }} />
            </label>
          )}
          <label style={{ display: 'flex' }}>
            <span className="vh">E-mail</span>
            <input className="inp" type="email" autoComplete="email" inputMode="email" placeholder="E-mail" value={email}
              onChange={(ev) => { setEmail(ev.target.value); setErro(null) }} />
          </label>
          <label style={{ display: 'flex' }}>
            <span className="vh">Senha</span>
            <input className="inp" type="password" autoComplete={criando ? 'new-password' : 'current-password'}
              placeholder={criando ? 'Senha (pelo menos 6)' : 'Senha'} value={senha}
              onChange={(ev) => { setSenha(ev.target.value); setErro(null) }} />
          </label>
          {erro && <div role="alert" style={{ color: 'var(--vermelho)', fontSize: 14, fontWeight: 700 }}>{erro}</div>}
          <button className="btn" type="submit" disabled={enviando || !pronto}>
            {enviando ? '…' : criando ? 'Criar conta' : 'Entrar'}
          </button>
          <button className="lnk" type="button" onClick={trocar} style={{ justifySelf: 'center' }}>
            {criando ? 'Já tenho conta · Entrar' : 'Não tem conta? Criar conta'}
          </button>
          <button className="btn w sm" type="button" onClick={onFechar}>Voltar</button>
        </div>
      </form>
    </div>
  )
}
