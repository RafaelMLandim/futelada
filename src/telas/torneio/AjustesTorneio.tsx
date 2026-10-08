import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import type { TorneioHook } from '../../store/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { enviarConvite } from '../../utils/convite'
import { maiusculas } from '../../utils/formatar'
import { RegrasForm } from './RegrasForm'

const primeiroNome = (nome: string) => nome.split(' ')[0]

// Ajustes do torneio: compartilhar (código e convite), campo do mesário, nome, regras,
// sair / apagar. Só o organizador muda regras e nome.
export function AjustesTorneio({ hook, onInicio }: { hook: TorneioHook; onInicio: () => void }) {
  const torneio = hook.torneio!
  const confirmar = useConfirmar()
  const [aviso, setAviso] = useState<string | null>(null)
  const [compartilhando, setCompartilhando] = useState(false)
  const [pegando, setPegando] = useState(false)
  const [avisoCampo, setAvisoCampo] = useState<string | null>(null)
  const numerosDosCampos = Array.from({ length: torneio.regras.campos }, (_, i) => i + 1)
  /** Pega o campo (ou solta, com null). Se outro mesário pegou antes, avisa. */
  const pegar = async (campo: number | null) => {
    setPegando(true)
    setAvisoCampo(null)
    const ok = await hook.definirCampo(campo).catch(() => false)
    setPegando(false)
    if (!ok) setAvisoCampo(campo ? `O Campo ${campo} já tem mesário. Escolha outro.` : 'Não deu para liberar agora. Tente de novo.')
  }
  const org = hook.souOrganizador
  const codigo = hook.compartilhado?.codigo

  const convidar = async () => {
    const r = await enviarConvite(codigo!, torneio.nome)
    setAviso(r === 'copiado' ? 'Convite copiado. Cole no WhatsApp do grupo.' : r === 'falhou' ? `Não deu para enviar. Passe o código: ${codigo}` : null)
  }
  const compartilhar = async () => {
    setCompartilhando(true)
    const cod = await hook.compartilhar().catch(() => null)
    setCompartilhando(false)
    setAviso(cod ? `Torneio compartilhado! Código: ${cod}` : 'Não deu para compartilhar agora. Confira a internet e tente de novo.')
  }

  return (
    <div className="scr">
      <Barra titulo="Ajustes" sub={torneio.nome} />
      <div className="conteudo">
        {codigo ? (
          <section className="panel">
            <div className="ph">Torneio compartilhado<span className="sub">{org ? 'você é o organizador' : 'você é mesário'}</span></div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <div className="led num" style={{ textAlign: 'center', padding: 10 }}>
                <div style={{ fontSize: 14, color: '#c9d4e3', letterSpacing: 1 }}>CÓDIGO PARA ENTRAR</div>
                <div style={{ fontSize: 40, letterSpacing: 6 }}>{codigo}</div>
              </div>
              <button className="btn sm" onClick={convidar}><Icone nome="times" /> Convidar mesários</button>
              {aviso && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>{aviso}</div>}
            </div>
            {/* cada campo tem um mesário: quem pega trava o campo para os outros (PLANO.md, seção 10) */}
            {!org && (
              <div className="pb" style={{ borderTop: '2px solid #e3e8d6', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Meu campo <span className="mut">· você marca os jogos dele</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {numerosDosCampos.map((c) => {
                    const outro = hook.campos[c] && hook.campos[c].uid !== hook.usuario ? hook.campos[c] : null
                    return (
                      <button key={c} className={'chip' + (hook.meuCampo === c ? ' on' : '')} aria-pressed={hook.meuCampo === c}
                        disabled={!!outro || pegando} style={outro ? { opacity: .55, textTransform: 'none' } : undefined}
                        onClick={() => void pegar(c)}>
                        Campo {c}{outro ? ` · ${primeiroNome(outro.nome)}` : ''}
                      </button>
                    )
                  })}
                  <button className={'chip' + (hook.meuCampo === null ? ' on' : '')} aria-pressed={hook.meuCampo === null}
                    disabled={pegando} onClick={() => void pegar(null)}>Só acompanhar</button>
                </div>
                <div className="mut">
                  {hook.meuCampo !== null
                    ? 'Vai sair? Toque em "Só acompanhar" para liberar o campo para outro mesário.'
                    : 'Campo em cinza já tem mesário: para trocar, ele libera (ou o organizador).'}
                </div>
                {avisoCampo && <div style={{ color: 'var(--vermelho)', fontWeight: 700 }}>{avisoCampo}</div>}
              </div>
            )}
            {/* organizador vê quem está em cada campo e libera se o mesário foi embora */}
            {org && (
              <div style={{ borderTop: '2px solid #e3e8d6' }}>
                <div className="pb" style={{ fontWeight: 700, paddingBottom: 4 }}>Mesários</div>
                {numerosDosCampos.map((c) => {
                  const m = hook.campos[c]
                  return (
                    <div key={c} className="tr" style={{ borderTop: '1px solid #e3e8d6' }}>
                      <span style={{ width: 70, fontWeight: 800 }}>Campo {c}</span>
                      <span className={m ? 'nome' : 'mut'} style={{ flex: 1 }}>{m ? m.nome : 'livre'}</span>
                      {m && (
                        <button className="btn w sm" style={{ width: 'auto', height: 34, padding: '0 12px' }}
                          onClick={() => confirmar({
                            titulo: `Liberar o Campo ${c}?`, mensagem: `${m.nome} deixa de marcar os jogos do Campo ${c} e outro mesário pode pegar.`,
                            botao: 'Liberar', aoConfirmar: () => hook.liberarCampo(c),
                          })}>Liberar</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : hook.podeCompartilhar && (
          <section className="panel">
            <div className="ph">Compartilhar</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <div className="mut" style={{ color: 'var(--navy)' }}>
                Para ter jogos em vários campos com uma pessoa marcando cada um: o torneio vai para a nuvem e
                você recebe um código para os mesários entrarem.
              </div>
              <button className="btn sm" disabled={compartilhando} onClick={compartilhar}>
                <Icone nome="times" /> {compartilhando ? 'Compartilhando…' : 'Compartilhar torneio'}
              </button>
              {aviso && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>{aviso}</div>}
            </div>
          </section>
        )}

        <fieldset disabled={!org} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {!org && <div className="panel pb mut" style={{ color: 'var(--navy)' }}>Só o organizador muda o nome e as regras.</div>}
          <section className="panel">
            <div className="ph">Nome do torneio</div>
            <div className="pb" style={{ display: 'flex' }}>
              <label style={{ display: 'flex', flex: 1 }}>
                <span className="vh">Nome do torneio</span>
                <input className="inp" value={torneio.nome} autoCapitalize="characters"
                  onChange={(ev) => hook.aplicar((t) => ({ ...t, nome: maiusculas(ev.target.value) }))} />
              </label>
            </div>
          </section>
          <RegrasForm regras={torneio.regras} travado={torneio.sorteado} minCampos={Math.max(1, torneio.emAndamento.length)}
            mudar={(p) => hook.aplicar((t) => ({ ...t, regras: { ...t.regras, ...p } }))} />
        </fieldset>

        {org ? (
          <button className="btn r sm" onClick={() => confirmar({
            titulo: 'Apagar torneio?',
            mensagem: `O torneio ${torneio.nome}, os times e todos os jogos serão apagados${codigo ? ' para todos os celulares' : ''}.`,
            botao: 'Apagar', perigo: true, aoConfirmar: () => { void hook.apagar(); onInicio() },
          })}><Icone nome="lixo" tamanho={20} /> Apagar torneio</button>
        ) : (
          <button className="btn w sm" onClick={() => confirmar({
            titulo: 'Sair do torneio?', mensagem: 'Este celular para de acompanhar. O torneio continua com o organizador e os outros mesários.',
            botao: 'Sair', aoConfirmar: () => { hook.sair(); onInicio() },
          })}>Sair do torneio</button>
        )}
      </div>
    </div>
  )
}
