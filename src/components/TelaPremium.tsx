import { useEffect, useState } from 'react'
import { PELADAS_GRATIS, TIMES_DO_TORNEIO_GRATIS } from '../logic/plano'
import { assinaturaAtiva, comprar, ENDERECO_NA_LOJA, ofertas, podeComprarAqui, type Oferta, type Produto } from '../store/compras'
import { usePlano } from '../store/plano'
import { abrirLink } from '../utils/nativo'
import { Icone } from './Icone'

// Planos e preços (PLANO.md, seção 14.1): Dois ou Dez Pro, Dois ou Dez Ultimate e Torneio avulso.
// A compra passa pela loja (Play Store); com a cobrança desligada (lançamento), está tudo liberado.

/** Por que a tela abriu: acabaram as peladas grátis, o torneio grátis já foi, passou de 8 times, ou só para ver. */
export type MotivoPremium = 'peladas' | 'torneio' | 'times' | 'ver'

const VANTAGENS_DO_PRO = [
  'Peladas ilimitadas, com tudo',
  'Estatísticas, Seleção da pelada e as imagens para o grupo',
  'Campo pago no Pix e caixa da pelada',
  'Histórico, turmas e o relatório da temporada',
]
const VANTAGENS_DO_ULTIMATE = ['Tudo do Pro', 'Torneios ilimitados, com times ilimitados', 'Mesários, vários campos e placar ao vivo']

/** Cada opção da tela e o produto dela na loja; o preço fixo aparece enquanto a loja não responde. */
type Opcao = 'anual' | 'pix' | 'mensal' | 'ultimate' | 'torneio'
const PRODUTO_DA_OPCAO: Record<Opcao, Produto> = { anual: 'proAnual', pix: 'pro12MesesPix', mensal: 'proMensal', ultimate: 'ultimate', torneio: 'torneio' }
const PRECO_FIXO: Record<Opcao, string> = { anual: 'R$ 119', pix: 'R$ 119', mensal: 'R$ 14,90', ultimate: 'R$ 49,90', torneio: 'R$ 34,90' }
const BOTAO: Record<Opcao, string> = { anual: 'Assinar o Pro anual', pix: 'Pagar 12 meses no Pix', mensal: 'Assinar o Pro mensal', ultimate: 'Assinar o Ultimate', torneio: 'Comprar o torneio' }

type Situacao = { tipo: 'parada' } | { tipo: 'comprando' } | { tipo: 'comprou' } | { tipo: 'aviso'; texto: string }

export function TelaPremium({ motivo, onFechar }: { motivo: MotivoPremium; onFechar: () => void }) {
  const torneio = motivo === 'torneio' || motivo === 'times'
  const plano = usePlano()
  // anual (assinatura, renova), 12 meses no Pix (avulso, não renova), mensal, Ultimate ou o torneio avulso
  const [opcao, setOpcao] = useState<Opcao>(torneio ? 'torneio' : 'anual')
  const [precos, setPrecos] = useState<Partial<Record<Produto, Oferta>>>({})
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'parada' })
  const vendeAqui = plano.cobrancaAtiva && podeComprarAqui()

  useEffect(() => {
    if (!vendeAqui) return
    let vivo = true
    ofertas().then((encontradas) => vivo && setPrecos(encontradas)).catch(() => {})
    return () => { vivo = false }
  }, [vendeAqui])

  const preco = (o: Opcao) => precos[PRODUTO_DA_OPCAO[o]]?.preco ?? PRECO_FIXO[o]
  const chamada = {
    peladas: `Suas ${PELADAS_GRATIS} peladas grátis acabaram. Nada se perde: o histórico continua aqui.`,
    torneio: 'O torneio grátis você já usou. Compre um Torneio avulso ou assine o Ultimate, com torneios ilimitados.',
    times: `O torneio grátis vai até ${TIMES_DO_TORNEIO_GRATIS} times. Para mais times, compre um Torneio avulso ou assine o Ultimate.`,
    ver: 'Só quem organiza paga. Mesários e jogadores usam de graça.',
  }[motivo]

  async function continuar() {
    if (!plano.cobrancaAtiva) return setSituacao({ tipo: 'aviso', texto: 'Durante o lançamento, está tudo liberado. Aproveite!' })
    if (!podeComprarAqui()) return setSituacao({ tipo: 'aviso', texto: 'A compra é feita pelo app do Dois ou Dez, na Google Play.' })
    const oferta = precos[PRODUTO_DA_OPCAO[opcao]]
    if (!oferta) return setSituacao({ tipo: 'aviso', texto: 'Não deu para falar com a loja agora. Confira a internet e tente de novo.' })
    setSituacao({ tipo: 'comprando' })
    try {
      // trocar entre Pro e Ultimate (assinaturas) substitui a antiga na própria loja
      const trocaDe = opcao === 'ultimate' || opcao === 'anual' || opcao === 'mensal' ? await assinaturaAtiva().catch(() => null) : null
      const resultado = await comprar(oferta, trocaDe)
      setSituacao(resultado === 'comprou' ? { tipo: 'comprou' } : { tipo: 'parada' })
    } catch {
      setSituacao({ tipo: 'aviso', texto: 'A loja não concluiu o pagamento. Nada foi cobrado; tente de novo.' })
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={torneio ? 'Torneio avulso' : 'Dois ou Dez Pro'} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: 'calc(var(--altura-tela) * .90)', overflowY: 'auto', color: 'var(--navy)' }}>
        <div className="ph">{torneio ? 'Torneio' : 'Dois ou Dez Pro'}<Icone nome="trofeu" tamanho={20} /></div>
        <div className="pb" style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 600, lineHeight: 1.45 }}>{chamada}</div>
          {!torneio && (
            <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontWeight: 600 }}>
              {VANTAGENS_DO_PRO.map((v) => <li key={v}>{v}</li>)}
            </ul>
          )}
          <div role="radiogroup" aria-label="Plano" style={{ display: 'grid', gap: 8 }}>
            {torneio ? (
              <OpcaoDePlano marcada={opcao === 'torneio'} onClick={() => setOpcao('torneio')} titulo="Torneio avulso" preco={preco('torneio')} detalhe="1 torneio · times ilimitados · Pix ou cartão" />
            ) : (
              <>
                <OpcaoDePlano marcada={opcao === 'anual'} onClick={() => setOpcao('anual')} titulo="Pro anual" preco={`${preco('anual')}/ano`} detalhe="Cartão · renova sozinho · economize 33%" />
                <OpcaoDePlano marcada={opcao === 'pix'} onClick={() => setOpcao('pix')} titulo="Pro 12 meses no Pix" preco={preco('pix')} detalhe="Paga uma vez · não renova sozinho" />
                <OpcaoDePlano marcada={opcao === 'mensal'} onClick={() => setOpcao('mensal')} titulo="Pro mensal" preco={`${preco('mensal')}/mês`} detalhe="Cartão · cancele quando quiser" />
              </>
            )}
            <OpcaoDePlano marcada={opcao === 'ultimate'} onClick={() => setOpcao('ultimate')} titulo="Ultimate" preco={`${preco('ultimate')}/mês`} detalhe={VANTAGENS_DO_ULTIMATE.join(' · ')} />
          </div>
          {situacao.tipo === 'comprou' && (
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Pronto! A loja confirmou. Seu plano é atualizado aqui em instantes.</div>
          )}
          {situacao.tipo === 'aviso' && (
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              {situacao.texto}
              {plano.cobrancaAtiva && !podeComprarAqui() && <> <button className="lnk" onClick={() => void abrirLink(ENDERECO_NA_LOJA)}>Baixar o app</button></>}
            </div>
          )}
          {situacao.tipo !== 'comprou' && (
            <button className="btn" disabled={situacao.tipo === 'comprando'} onClick={() => void continuar()}>{situacao.tipo === 'comprando' ? 'Abrindo a loja…' : BOTAO[opcao]}</button>
          )}
          <button className="btn w sm" onClick={onFechar}>{situacao.tipo === 'comprou' ? 'Fechar' : 'Agora não'}</button>
        </div>
      </section>
    </div>
  )
}

function OpcaoDePlano({ marcada, onClick, titulo, preco, detalhe }: { marcada: boolean; onClick: () => void; titulo: string; preco: string; detalhe: string }) {
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
