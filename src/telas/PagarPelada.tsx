import { useEffect, useState } from 'react'
import { Barra } from '../components/Barra'
import { QrCode } from '../components/QrCode'
import { obterNuvem } from '../nuvem'
import type { AvisoPagamento, CobrancaNuvem } from '../nuvem/tipos'
import { reais } from '../utils/formatar'

/**
 * Página do link de pagamento (quem joga abre pelo grupo, sem instalar nada): QR Pix com o valor,
 * "copia e cola" e a lista de nomes. Depois de pagar, a pessoa toca no próprio nome ("Já paguei").
 */
export function PagarPelada({ codigo }: { codigo: string }) {
  const [cobranca, setCobranca] = useState<CobrancaNuvem | null | undefined>(undefined)
  const [avisos, setAvisos] = useState<Record<string, AvisoPagamento>>({})
  const [quem, setQuem] = useState<{ id: string; nome: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const chaveEu = `pagar:${codigo}`
  const [eu, setEu] = useState<string | null>(() => {
    try { return localStorage.getItem(chaveEu) } catch { return null }
  })

  // erro ao ler (não é "link não encontrado"): mostra o código para dar para saber o motivo
  const [erroAoAbrir, setErroAoAbrir] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    let tentouDeNovo = false
    const falhou = (erro: unknown) => {
      if (!ativo) return
      parar()
      if (!tentouDeNovo) { tentouDeNovo = true; window.setTimeout(abrir, 1500); return }
      setErroAoAbrir((erro as { code?: string })?.code ?? String((erro as Error)?.message ?? erro))
    }
    const abrir = () => void obterNuvem().then((n) => {
      if (!n) return setCobranca(null)
      if (ativo) parar = n.ouvirCobranca(codigo, (c, a) => { setErroAoAbrir(null); setCobranca(c); setAvisos(a) }, falhou)
    }).catch(falhou)
    abrir()
    return () => { ativo = false; parar() }
  }, [codigo, tentativa])

  const copiar = async () => {
    if (!cobranca) return
    await navigator.clipboard.writeText(cobranca.pix).catch(() => null)
    setAviso('Pix copia e cola copiado! Cole no app do seu banco.')
  }
  const confirmar = async () => {
    if (!quem || !cobranca) return
    const status = cobranca.confirmarAuto ? 'pago' : 'avisou'
    setQuem(null)
    try {
      const nuvem = await obterNuvem()
      await nuvem?.avisarPagamento(codigo, quem.id, { status, nome: quem.nome, em: Date.now() })
      try { localStorage.setItem(chaveEu, quem.id) } catch { /* sem armazenamento: só não lembra */ }
      setEu(quem.id)
      setAviso(status === 'pago' ? 'Valeu! Seu pagamento foi marcado.' : 'Valeu! O organizador vai conferir e confirmar.')
    } catch {
      setAviso('Não deu para avisar agora. Confira a internet e tente de novo.')
    }
  }

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      {/* caixinha ("Bola nova"): o nome dela no topo e o motivo embaixo do valor */}
      <Barra titulo={cobranca?.titulo ?? 'Pagar a pelada'} sub={cobranca?.titulo ? 'Caixinha da pelada' : (cobranca?.data ?? '')} />
      <div className="conteudo">
        {erroAoAbrir && (
          <div className="panel pb" style={{ display: 'grid', gap: 10, textAlign: 'center', color: 'var(--navy)' }}>
            <b>Não deu para abrir agora.</b>
            <span className="mut">Confira a internet. Se abriu pelo WhatsApp ou Instagram, tente abrir no Safari ou no Chrome.</span>
            <button className="btn" onClick={() => { setErroAoAbrir(null); setCobranca(undefined); setTentativa((numero) => numero + 1) }}>Tentar de novo</button>
            <span className="mut" style={{ fontSize: 12 }}>Código do erro: {erroAoAbrir}</span>
          </div>
        )}
        {!erroAoAbrir && cobranca === undefined && <div className="vazio">Carregando…</div>}
        {!erroAoAbrir && cobranca === null && <div className="vazio">Link não encontrado. Peça o link de novo para o organizador.</div>}
        {cobranca && !erroAoAbrir && (
          <>
            <section className="panel">
              <div className="pb" style={{ display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 44 }}>{reais(cobranca.valor)}</div>
                <div className="mut" style={{ marginTop: -8 }}>por pessoa · Pix para {cobranca.recebedor}</div>
                {cobranca.descricao && <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{cobranca.descricao}</div>}
                <QrCode texto={cobranca.pix} tamanho={230} />
                <button className="btn" onClick={copiar}>Copiar Pix copia e cola</button>
                <div className="mut" style={{ fontSize: 12 }}>Abra o app do seu banco, escolha Pix e leia o QR ou cole o código.</div>
              </div>
            </section>
            {aviso && <div className="panel pb" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--navy)' }}>{aviso}</div>}
            <section className="panel">
              <div className="ph">Já pagou? Toque no seu nome</div>
              {cobranca.jogadores.map((j) => {
                const status = avisos[j.id]?.status
                const cor = status === 'pago' ? 'var(--verde)' : status === 'avisou' ? 'var(--amarelo)' : '#e3e8d6'
                return (
                  <button key={j.id} className="tr" disabled={status === 'pago'} aria-label={`Já paguei: ${j.nome}`}
                    style={{ width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer', borderLeft: `8px solid ${cor}` }}
                    onClick={() => setQuem(j)}>
                    <span className="nome">{j.nome}{eu === j.id ? ' (você)' : ''}</span>
                    <span className="tag" style={{ background: cor, color: status === 'pago' ? '#fff' : 'var(--navy)' }}>
                      {status === 'pago' ? 'Pago' : status === 'avisou' ? 'Avisou' : 'Pendente'}
                    </span>
                  </button>
                )
              })}
            </section>
          </>
        )}
      </div>

      {quem && cobranca && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar pagamento" onClick={() => setQuem(null)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Já paguei</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Você é <b>{quem.nome}</b> e já pagou {reais(cobranca.valor)} pelo Pix?</div>
              <button className="btn" onClick={confirmar}>Sim, já paguei</button>
              <button className="btn w sm" onClick={() => setQuem(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
