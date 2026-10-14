import { useState } from 'react'
import { AVISO_DE_VENCIMENTO, PELADAS_GRATIS, TIMES_DO_TORNEIO_GRATIS } from '../logic/plano'
import { usePlano } from '../store/plano'
import { abrirLink } from '../utils/nativo'
import { TelaPremium } from './TelaPremium'

// "Meu plano" (menu da foto; PLANO.md, seção 14.3): plano atual, peladas grátis, torneios e a assinatura.
export function MeuPlano({ onFechar }: { onFechar: () => void }) {
  const s = usePlano()
  const [premium, setPremium] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const data = (t: number) => new Date(t).toLocaleDateString('pt-BR')
  const usadas = Math.min(s.peladasUsadas, PELADAS_GRATIS)

  if (premium) return <TelaPremium motivo="ver" onFechar={() => setPremium(false)} />
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Meu plano" onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 440, color: 'var(--navy)' }}>
        <div className="ph">Meu plano</div>
        <div className="pb" style={{ display: 'grid', gap: 12 }}>
          <div className="led" style={{ padding: '12px', textAlign: 'center', display: 'grid', gap: 4 }}>
            <span className="num" style={{ fontSize: 30 }}>{s.premium ? 'Pelada Premium' : 'Grátis'}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {!s.premium ? `${usadas} de ${PELADAS_GRATIS} peladas grátis usadas` : s.renovaSozinho ? `Renova sozinho em ${data(s.premiumAte!)}` : `Vale até ${data(s.premiumAte!)} · não renova sozinho`}
            </span>
          </div>
          {!s.premium && (
            <div aria-hidden style={{ height: 10, borderRadius: 5, background: '#e3e8d6', overflow: 'hidden' }}>
              <div style={{ width: `${(usadas / PELADAS_GRATIS) * 100}%`, height: '100%', background: usadas >= PELADAS_GRATIS ? 'var(--vermelho)' : 'var(--verde)' }} />
            </div>
          )}
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            Torneios: {s.torneioGratis ? `o 1º é grátis (até ${TIMES_DO_TORNEIO_GRATIS} times)` : s.creditosTorneio > 0 ? `${s.creditosTorneio} ${s.creditosTorneio === 1 ? 'crédito' : 'créditos'} de torneio` : 'Torneio avulso, R$ 34,90 cada'}
          </div>
          {s.diasParaVencer !== null && s.diasParaVencer <= AVISO_DE_VENCIMENTO && (
            <div className="mut" style={{ background: '#fff6cf', border: '1px solid var(--amarelo)', borderRadius: 5, padding: '8px 10px', color: 'var(--navy)', fontWeight: 600 }}>
              {s.diasParaVencer === 1 ? 'Falta 1 dia' : `Faltam ${s.diasParaVencer} dias`} para o seu Premium vencer. Renove por mais 12 meses (Pix ou cartão).
            </div>
          )}
          {!s.cobrancaAtiva && (
            <div className="mut" style={{ background: '#fff6cf', border: '1px solid var(--amarelo)', borderRadius: 5, padding: '8px 10px', color: 'var(--navy)' }}>
              Durante o lançamento, o app está todo liberado.
            </div>
          )}
          {aviso && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>{aviso}</div>}
          {(!s.premium || (s.diasParaVencer !== null && s.diasParaVencer <= AVISO_DE_VENCIMENTO)) && (
            <button className="btn" onClick={() => setPremium(true)}>{s.premium ? 'Renovar o Premium' : 'Conhecer o Premium'}</button>
          )}
          {s.renovaSozinho && (
            <button className="btn w sm" onClick={() => void abrirLink('https://play.google.com/store/account/subscriptions')}>Gerenciar assinatura</button>
          )}
          <button className="btn w sm" onClick={() => setAviso('Restaurar compras chega junto com o app na Play Store.')}>Restaurar compras</button>
          <button className="btn w sm" onClick={onFechar}>Fechar</button>
        </div>
      </section>
    </div>
  )
}
