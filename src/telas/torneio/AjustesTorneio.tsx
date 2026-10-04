import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import type { TorneioHook } from '../../store/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { enviarConvite } from '../../utils/convite'
import { maiusculas } from '../../utils/formatar'
import { RegrasForm } from './RegrasForm'

// Ajustes do torneio: compartilhar (código e convite), campo do mesário, nome, regras,
// sair / apagar. Só o organizador muda regras e nome.
export function AjustesTorneio({ hook, onInicio }: { hook: TorneioHook; onInicio: () => void }) {
  const torneio = hook.torneio!
  const confirmar = useConfirmar()
  const [aviso, setAviso] = useState<string | null>(null)
  const [compartilhando, setCompartilhando] = useState(false)
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
            {!org && (
              <div className="pb" style={{ borderTop: '2px solid #e3e8d6', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Meu campo <span className="mut">· você marca os jogos dele</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({ length: torneio.regras.campos }, (_, i) => i + 1).map((c) => (
                    <button key={c} className={'chip' + (hook.meuCampo === c ? ' on' : '')} aria-pressed={hook.meuCampo === c}
                      onClick={() => hook.definirCampo(c)}>Campo {c}</button>
                  ))}
                  <button className={'chip' + (hook.meuCampo === null ? ' on' : '')} aria-pressed={hook.meuCampo === null}
                    onClick={() => hook.definirCampo(null)}>Só acompanhar</button>
                </div>
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
      <div className="rodape">
        <button className="btn w sm" onClick={onInicio}><Icone nome="inicio" /> Início (pelada ou torneio)</button>
      </div>
    </div>
  )
}
