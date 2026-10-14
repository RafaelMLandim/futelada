import { useState } from 'react'
import { PELADAS_GRATIS, TIMES_DO_TORNEIO_GRATIS } from '../logic/plano'
import { Icone } from './Icone'

// Planos e preços (PLANO.md, seção 14.1). A compra passa pela loja (Play Store); até ela estar ligada,
// o botão avisa que a assinatura chega com o app da loja.

/** Por que a tela abriu: acabaram as peladas grátis, o torneio grátis já foi, passou de 8 times, ou só para ver. */
export type MotivoPremium = 'peladas' | 'torneio' | 'times' | 'ver'

const VANTAGENS = [
  'Peladas ilimitadas, com tudo',
  'Estatísticas, Seleção da pelada e as imagens para o grupo',
  'Campo pago no Pix e caixa da pelada',
  'Histórico, turmas e o relatório da temporada',
]

export function TelaPremium({ motivo, onFechar }: { motivo: MotivoPremium; onFechar: () => void }) {
  const torneio = motivo === 'torneio' || motivo === 'times'
  // anual (assinatura, renova), 12 meses no Pix (avulso, não renova) ou mensal
  const [opcao, setOpcao] = useState<'anual' | 'pix' | 'mensal'>('anual')
  const [aviso, setAviso] = useState(false)
  const chamada = {
    peladas: `Suas ${PELADAS_GRATIS} peladas grátis acabaram. Nada se perde: o histórico continua aqui.`,
    torneio: 'O torneio grátis você já usou. Cada torneio novo é um Torneio avulso.',
    times: `O torneio grátis vai até ${TIMES_DO_TORNEIO_GRATIS} times. Para mais times, é um Torneio avulso.`,
    ver: 'Só quem organiza paga. Mesários e jogadores usam de graça.',
  }[motivo]

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={torneio ? 'Torneio avulso' : 'Pelada Premium'} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto', color: 'var(--navy)' }}>
        <div className="ph">{torneio ? 'Torneio avulso' : 'Pelada Premium'}<Icone nome="trofeu" tamanho={20} /></div>
        <div className="pb" style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 600, lineHeight: 1.45 }}>{chamada}</div>
          {torneio ? (
            <div className="led" style={{ padding: '14px 12px', display: 'grid', gap: 4, textAlign: 'center' }}>
              <span className="num" style={{ fontSize: 34 }}>R$ 34,90</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>1 torneio · times ilimitados · mesários e vários campos</span>
              <span style={{ color: '#fff', fontSize: 13 }}>Pague no Pix ou no cartão</span>
            </div>
          ) : (
            <>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontWeight: 600 }}>
                {VANTAGENS.map((v) => <li key={v}>{v}</li>)}
              </ul>
              <div role="radiogroup" aria-label="Plano" style={{ display: 'grid', gap: 8 }}>
                <Opcao marcada={opcao === 'anual'} onClick={() => setOpcao('anual')} titulo="Anual" preco="R$ 119/ano" detalhe="Cartão · renova sozinho · economize 33%" />
                <Opcao marcada={opcao === 'pix'} onClick={() => setOpcao('pix')} titulo="12 meses no Pix" preco="R$ 119" detalhe="Paga uma vez · não renova sozinho" />
                <Opcao marcada={opcao === 'mensal'} onClick={() => setOpcao('mensal')} titulo="Mensal" preco="R$ 14,90/mês" detalhe="Cartão · cancele quando quiser" />
              </div>
            </>
          )}
          {aviso && (
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              A compra chega junto com o app na Play Store. Por enquanto, está tudo liberado.
            </div>
          )}
          <button className="btn" onClick={() => setAviso(true)}>{torneio ? 'Comprar o torneio' : { anual: 'Assinar o anual', pix: 'Pagar 12 meses no Pix', mensal: 'Assinar o mensal' }[opcao]}</button>
          <button className="btn w sm" onClick={onFechar}>Agora não</button>
        </div>
      </section>
    </div>
  )
}

function Opcao({ marcada, onClick, titulo, preco, detalhe }: { marcada: boolean; onClick: () => void; titulo: string; preco: string; detalhe: string }) {
  return (
    <button role="radio" aria-checked={marcada} className={'chip' + (marcada ? ' on' : '')} onClick={onClick}
      style={{ height: 'auto', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', gap: 8 }}>
      <span style={{ display: 'grid', gap: 2 }}>
        <span className="num" style={{ fontSize: 20 }}>{titulo}</span>
        <span style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>{detalhe}</span>
      </span>
      <span className="num" style={{ fontSize: 20, whiteSpace: 'nowrap' }}>{preco}</span>
    </button>
  )
}
