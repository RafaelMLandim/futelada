import { useState } from 'react'
import { Icone } from '../components/Icone'
import { QrCode } from '../components/QrCode'
import { lancamentosDaPelada, pagantes, resumoPagamentos } from '../logic'
import type { useCobranca } from '../store/cobranca'
import { montarCobranca } from '../store/cobranca'
import { useCaixa, useConta } from '../store/conta'
import type { Pelada } from '../store/usePelada'
import { reais } from '../utils/formatar'
import { compartilharTexto } from '../utils/nativo'

/** Agora (ms) e o dia ("06/10") para os lançamentos do caixa. */
const agoraEDia = (): [number, string] => [Date.now(), new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]

/**
 * Campo pago, tela do organizador: QR Pix com o valor, link para o grupo e quem já pagou.
 * Amarelo = avisou que pagou (falta conferir no banco); verde = pago.
 */
export function Pagamentos({ pelada, cobranca, onFechar }: { pelada: Pelada; cobranca: ReturnType<typeof useCobranca>; onFechar: () => void }) {
  const { estado } = pelada.app
  const { pagamento } = estado.config
  const resumo = resumoPagamentos(estado)
  const pix = montarCobranca(estado).pix
  const [aviso, setAviso] = useState<string | null>(null)
  const semPix = !pagamento.chavePix.trim() || !pagamento.recebedor.trim()
  const conta = useConta()
  const caixa = useCaixa()
  // fecha a conta do dia no caixa: entra o que pagaram, sai o campo (uma vez por pelada)
  const lancarNoCaixa = async () => {
    await caixa.lancar(lancamentosDaPelada(resumo, ...agoraEDia()))
    pelada.aplicar((e) => ({ ...e, caixaLancado: true }))
    setAviso(`Lançado no caixa: ${resumo.sobra >= 0 ? '+' : ''}${reais(resumo.sobra)}`)
  }

  const copiar = async () => {
    await navigator.clipboard.writeText(pix).catch(() => null)
    setAviso('Pix copia e cola copiado!')
  }
  const compartilharLink = async () => {
    const link = await cobranca.criarLink()
    if (!link) return setAviso('Sem internet/nuvem: não deu para criar o link.')
    const texto = `⚽ Pelada ${resumo.valor ? `· ${reais(resumo.valor)} cada` : ''}\nPague pelo Pix e marque seu nome: ${link}`
    if (!(await compartilharTexto({ text: texto }))) { await navigator.clipboard.writeText(texto).catch(() => null); setAviso('Link copiado! É só colar no grupo.') }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Pagamentos" onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="ph">
          <span>Campo pago</span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}><span style={{ fontSize: 20, lineHeight: 1 }}>×</span></button>
        </div>
        <div className="pb" style={{ display: 'grid', gap: 10, overflowY: 'auto' }}>
          <div className="row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div className="num" style={{ fontSize: 30 }}>{reais(resumo.valor)}</div><div className="mut">por pessoa</div></div>
            <div><div className="num" style={{ fontSize: 30 }}>{resumo.pagos}/{resumo.pessoas}</div><div className="mut">pagaram</div></div>
            <div><div className="num" style={{ fontSize: 30, color: resumo.sobra >= 0 ? 'var(--verde)' : 'var(--navy)' }}>{reais(resumo.arrecadado)}</div><div className="mut">de {reais(resumo.campo)}</div></div>
          </div>
          {semPix
            ? <div className="mut" style={{ color: 'var(--vermelho)', fontWeight: 700, textAlign: 'center' }}>Cadastre a chave Pix e o nome de quem recebe nos Ajustes.</div>
            : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}><QrCode texto={pix} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn w sm" onClick={copiar}>Copiar Pix</button>
                  <button className="btn sm" onClick={compartilharLink}><Icone nome="compartilhar" /> Link p/ grupo</button>
                </div>
              </>
            )}
          {conta.logado && (
            estado.caixaLancado
              ? <div className="mut" style={{ textAlign: 'center' }}>✓ Já lançado no caixa</div>
              : <button className="btn w sm" disabled={resumo.arrecadado <= 0} onClick={lancarNoCaixa}>
                  Lançar no caixa · entrou {reais(resumo.arrecadado)}, campo {reais(resumo.campo)}
                </button>
          )}
          {aviso && <div className="mut" style={{ textAlign: 'center', color: 'var(--navy)', fontWeight: 700 }}>{aviso}</div>}
          <div className="mut" style={{ fontSize: 12 }}>Toque no nome para marcar como pago (ou desfazer). Amarelo: avisou que pagou, confira no banco.</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {pagantes(estado).map((j) => {
              const status = estado.pagamentos[j.id]?.status
              const cor = status === 'pago' ? 'var(--verde)' : status === 'avisou' ? 'var(--amarelo)' : '#e3e8d6'
              return (
                <button key={j.id} className="tr" style={{ width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer', borderLeft: `8px solid ${cor}` }}
                  aria-label={`Pagamento de ${j.nome}`} onClick={() => cobranca.marcar(j, status === 'pago' ? null : 'pago')}>
                  <span className="nome">{j.nome}</span>
                  <span className="tag" style={{ background: cor, color: status === 'pago' ? '#fff' : 'var(--navy)' }}>
                    {status === 'pago' ? 'Pago' : status === 'avisou' ? 'Avisou · confirmar' : 'Pendente'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
