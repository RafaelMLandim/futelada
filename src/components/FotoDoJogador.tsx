// Foto de outro jogador nos painéis (Seleção da pelada, Time do ano). Tocar abre a foto maior e a denúncia
// (PLANO.md, seção 17.6): quem denuncia deixa de ver a foto na hora; com 3 pessoas, o servidor tira de todo mundo.

import { useState } from 'react'
import type { MotivoDaDenuncia } from '../nuvem/tipos'
import { denunciarFoto } from '../store/denuncias'
import { Icone } from './Icone'

const MOTIVOS: { motivo: MotivoDaDenuncia; texto: string }[] = [
  { motivo: 'impropria', texto: 'Imprópria ou ofensiva' },
  { motivo: 'nao-e-a-pessoa', texto: 'Não é a pessoa' },
  { motivo: 'outro', texto: 'Outro motivo' },
]

/** comEspaco: alguém do painel tem foto; quem não tem ganha um espaço vazio (nomes alinhados). */
export function FotoDoJogador({ foto, conta, nome, comEspaco }: { foto: string | undefined; conta: string | undefined; nome: string; comEspaco: boolean }) {
  const [aberta, setAberta] = useState(false)
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState<MotivoDaDenuncia | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)
  // sem foto: um espaço do mesmo tamanho, para os nomes ficarem alinhados
  const vazio = comEspaco ? <span className="foto-do-jogador vazia" aria-hidden="true" /> : null
  if (!conta || (!foto && !enviada)) return vazio

  const fechar = () => { setAberta(false); setDenunciando(false); setMotivo(null); setErro(null); setEnviada(false) }
  const enviar = async () => {
    if (!motivo) return
    setEnviando(true)
    setErro(null)
    try {
      await denunciarFoto(conta, motivo) // deu certo: a foto some daqui
      setEnviada(true)
    } catch {
      setErro('Não deu para enviar. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {foto ? (
        <button className="foto-do-jogador" aria-label={`Foto de ${nome}`} onClick={() => setAberta(true)}>
          <img src={foto} alt="" />
        </button>
      ) : vazio}
      {aberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Foto de ${nome}`} onClick={fechar}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">{nome}</div>
            {enviada ? (
              <div className="pb" style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontWeight: 600, lineHeight: 1.4 }}>Denúncia enviada. A foto não aparece mais para você.</div>
                <button className="btn sm" onClick={fechar}>Ok</button>
              </div>
            ) : !denunciando ? (
              <div className="pb" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
                <img className="foto-do-jogador-grande" src={foto} alt={`Foto de ${nome}`} />
                <div className="opcoes-lado-a-lado" style={{ width: '100%' }}>
                  <button className="btn w sm" onClick={fechar}>Fechar</button>
                  <button className="btn sm r" onClick={() => setDenunciando(true)}><Icone nome="denunciar" tamanho={20} /> Denunciar</button>
                </div>
              </div>
            ) : (
              <div className="pb" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 600, lineHeight: 1.4 }}>O que tem de errado na foto ou no apelido?</div>
                <div role="radiogroup" aria-label="Motivo da denúncia" style={{ display: 'grid', gap: 8 }}>
                  {MOTIVOS.map((item) => (
                    <button key={item.motivo} type="button" role="radio" aria-checked={motivo === item.motivo}
                      className={'btn sm' + (motivo === item.motivo ? '' : ' w')} onClick={() => setMotivo(item.motivo)}>
                      {item.texto}
                    </button>
                  ))}
                </div>
                <div className="mut" style={{ lineHeight: 1.35 }}>A foto deixa de aparecer para você. Se outras pessoas também denunciarem, ela sai do app.</div>
                {erro && <div style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
                <div className="opcoes-lado-a-lado">
                  <button className="btn w sm" onClick={fechar}>Cancelar</button>
                  <button className="btn sm r" disabled={!motivo || enviando} onClick={() => void enviar()}>{enviando ? 'Enviando…' : 'Enviar denúncia'}</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
