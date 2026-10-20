import { useContext, useState } from 'react'
import { Compartilhamento, type LinksDaPelada } from '../store/compartilhamento'
import { compartilharTexto } from '../utils/nativo'
import { Icone } from './Icone'
import { QrCode } from './QrCode'

type Tipo = 'acompanhar' | 'controle'

const EXPLICACAO: Record<Tipo, string> = {
  acompanhar: 'Quem abrir vê a fila, o jogo e a tabela ao vivo, sem login e sem poder mexer em nada.',
  controle: 'Para alguém marcar a pelada no seu lugar (por exemplo, se o seu celular vai descarregar). Quem abrir assume o controle e o seu celular passa a só acompanhar. Você retoma quando quiser.',
}
const MENSAGEM: Record<Tipo, string> = {
  acompanhar: 'Acompanhe a pelada ao vivo (fila, jogo e tabela)',
  controle: 'Assuma o controle da pelada (marcar gols, fila e jogos)',
}

/**
 * Botão da barra do topo (PLANO.md, seção 16): o link para acompanhar a pelada ao vivo e o link para
 * passar o controle para outra pessoa, cada um com o QR code (para passar de um celular para o outro).
 */
export function BotaoCompartilhar() {
  const compartilhamento = useContext(Compartilhamento)
  const [links, setLinks] = useState<LinksDaPelada | null>(null)
  const [tipo, setTipo] = useState<Tipo>('acompanhar')
  const [aviso, setAviso] = useState<string | null>(null)
  if (!compartilhamento) return null

  const abrir = async () => {
    setAviso(null)
    setTipo('acompanhar')
    const criados = await compartilhamento.criarLinks()
    if (criados) setLinks(criados)
    else setAviso('Sem conexão com a nuvem agora. Tente de novo.')
  }
  const link = links?.[tipo] ?? ''
  const copiar = async () => {
    await navigator.clipboard.writeText(link).catch(() => null)
    setAviso('Link copiado! É só colar na conversa.')
  }
  const enviar = async () => {
    if (!(await compartilharTexto({ text: `${MENSAGEM[tipo]}: ${link}` }))) await copiar()
  }

  return (
    <>
      <button className="ib s" aria-label="Compartilhar a pelada" onClick={() => void abrir()}>
        <Icone nome="compartilhar" />
      </button>
      {links && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Compartilhar a pelada" onClick={() => setLinks(null)}>
          <section className="panel" onClick={(evento) => evento.stopPropagation()}>
            <div className="ph">Compartilhar a pelada</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['acompanhar', 'controle'] as const).map((opcao) => (
                  <button key={opcao} role="tab" aria-selected={tipo === opcao} className={'btn sm' + (tipo === opcao ? '' : ' w')}
                    onClick={() => { setTipo(opcao); setAviso(null) }}>
                    {opcao === 'acompanhar' ? 'Acompanhar' : 'Passar o controle'}
                  </button>
                ))}
              </div>
              <div style={{ fontWeight: 600, lineHeight: 1.45 }}>{EXPLICACAO[tipo]}</div>
              {tipo === 'controle' && (
                <div className="tag t-warn" style={{ justifySelf: 'center', whiteSpace: 'normal', height: 'auto', padding: '4px 8px' }}>
                  Mande só para quem vai marcar a pelada
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center' }}><QrCode texto={link} /></div>
              <div className="mut" aria-label={`Link para ${tipo === 'acompanhar' ? 'acompanhar' : 'passar o controle'}`}
                style={{ wordBreak: 'break-all', textAlign: 'center', fontSize: 13 }}>{link}</div>
              {aviso && <div className="tag t-ok" style={{ justifySelf: 'center' }}>{aviso}</div>}
              <button className="btn" onClick={() => void enviar()}><Icone nome="compartilhar" /> Enviar o link</button>
              <button className="btn w sm" onClick={() => void copiar()}>Copiar o link</button>
              <button className="btn w sm" onClick={() => setLinks(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {!links && aviso && <span className="tag t-warn">{aviso}</span>}
    </>
  )
}
