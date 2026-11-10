import { useEffect, useState, type ReactNode } from 'react'
import { JOGADORES_DE_UMA_PELADA, PELADAS_GRATIS, porJogadorPorMes, PRO_ANUAL_POR_MES, PRO_MENSAL, TIMES_DO_TORNEIO_GRATIS, ULTIMATE_MENSAL } from '../logic/plano'
import { assinaturaAtiva, comprar, ENDERECO_NA_LOJA, ofertas, podeComprarAqui, type Oferta, type Produto } from '../store/compras'
import { usePlano } from '../store/plano'
import { reais } from '../utils/formatar'
import { abrirLink } from '../utils/nativo'
import { Icone } from './Icone'

// Planos e preços (PLANO.md, seção 14.1): Dois ou Dez Pro, Dois ou Dez Ultimate e Torneio avulso, em cards como nas
// páginas de venda. A compra passa pela loja (Play Store); com a cobrança desligada (lançamento), está tudo liberado.

/** Por que a tela abriu: acabaram as peladas grátis, o torneio grátis já foi, passou de 8 times, ou só para ver. */
export type MotivoPremium = 'peladas' | 'torneio' | 'times' | 'ver'

const VANTAGENS_DO_PRO = [
  'Peladas ilimitadas, com tudo',
  'Estatísticas, Seleção da pelada e as imagens para o grupo',
  'Cobrança do campo: o QR Code do Pix vai para o grupo e o dinheiro cai direto para você',
  'Caixa da pelada',
  'Histórico, turmas e o Time do ano',
]
const VANTAGENS_DO_ULTIMATE = ['Tudo do Pro', 'Torneios ilimitados, com times ilimitados', 'Mesários, vários campos e placar ao vivo']
const VANTAGENS_DO_TORNEIO = ['1 torneio compartilhado, com times ilimitados', 'Mesários, vários campos e placar ao vivo', 'O crédito não vence']

/** Cada compra da tela e o produto dela na loja; o preço fixo aparece enquanto a loja não responde. */
type Opcao = 'anual' | 'pix' | 'mensal' | 'ultimate' | 'torneio'
const PRODUTO_DA_OPCAO: Record<Opcao, Produto> = { anual: 'proAnual', pix: 'pro12MesesPix', mensal: 'proMensal', ultimate: 'ultimate', torneio: 'torneio' }
const PRECO_FIXO: Record<Opcao, string> = { anual: 'R$ 119', pix: 'R$ 119', mensal: 'R$ 14,90', ultimate: 'R$ 49,90', torneio: 'R$ 34,90' }
const BOTAO: Record<Opcao, string> = { anual: 'Assinar o Pro anual', pix: 'Pagar o Pro anual no Pix', mensal: 'Assinar o Pro mensal', ultimate: 'Assinar o Ultimate', torneio: 'Comprar o torneio' }

type Situacao = { tipo: 'parada' } | { tipo: 'comprando'; opcao: Opcao } | { tipo: 'comprou' } | { tipo: 'aviso'; texto: string }

/** `jogadores`: quantos estão na lista de hoje, para a conta "por jogador" (sem lista, uma pelada de 15). */
export function TelaPremium({ motivo, onFechar, jogadores }: { motivo: MotivoPremium; onFechar: () => void; jogadores?: number }) {
  const torneio = motivo === 'torneio' || motivo === 'times'
  const plano = usePlano()
  // Pro: anual ou mensal; no anual, cartão (assinatura, renova) ou Pix (12 meses avulso: a Google não aceita Pix em assinatura)
  const [periodo, setPeriodo] = useState<'anual' | 'mensal'>('anual')
  const [formaDoAnual, setFormaDoAnual] = useState<'anual' | 'pix'>('anual')
  const opcaoDoPro: Opcao = periodo === 'mensal' ? 'mensal' : formaDoAnual
  const [precos, setPrecos] = useState<Partial<Record<Produto, Oferta>>>({})
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'parada' })
  const vendeAqui = plano.cobrancaAtiva && podeComprarAqui()

  useEffect(() => {
    if (!vendeAqui) return
    let vivo = true
    ofertas().then((encontradas) => vivo && setPrecos(encontradas)).catch(() => {})
    return () => { vivo = false }
  }, [vendeAqui])

  const preco = (opcao: Opcao) => precos[PRODUTO_DA_OPCAO[opcao]]?.preco ?? PRECO_FIXO[opcao]
  const chamada = {
    peladas: `Suas ${PELADAS_GRATIS} peladas grátis acabaram. Nada se perde: o histórico continua aqui.`,
    torneio: 'O torneio grátis você já usou. Compre um Torneio avulso ou assine o Ultimate, com torneios ilimitados.',
    times: `O torneio grátis vai até ${TIMES_DO_TORNEIO_GRATIS} times. Para mais times, compre um Torneio avulso ou assine o Ultimate.`,
    ver: 'Só quem organiza paga. Mesários e jogadores usam de graça.',
  }[motivo]

  // a conta "por jogador" com os jogadores da lista de hoje (ou uma pelada de 15)
  const daLista = jogadores !== undefined && jogadores >= 4
  const quantos = daLista ? jogadores : JOGADORES_DE_UMA_PELADA
  const jogadoresDaConta = daLista ? `${quantos} jogadores de hoje` : `${quantos} jogadores`

  async function continuar(opcao: Opcao) {
    if (!plano.cobrancaAtiva) return setSituacao({ tipo: 'aviso', texto: 'Durante o lançamento, está tudo liberado. Aproveite!' })
    if (!podeComprarAqui()) return setSituacao({ tipo: 'aviso', texto: 'A compra é feita pelo app do Dois ou Dez, na Google Play.' })
    const oferta = precos[PRODUTO_DA_OPCAO[opcao]]
    if (!oferta) return setSituacao({ tipo: 'aviso', texto: 'Não deu para falar com a loja agora. Confira a internet e tente de novo.' })
    setSituacao({ tipo: 'comprando', opcao })
    try {
      // trocar entre Pro e Ultimate (assinaturas) substitui a antiga na própria loja
      const trocaDe = opcao === 'ultimate' || opcao === 'anual' || opcao === 'mensal' ? await assinaturaAtiva().catch(() => null) : null
      const resultado = await comprar(oferta, trocaDe)
      setSituacao(resultado === 'comprou' ? { tipo: 'comprou' } : { tipo: 'parada' })
    } catch {
      setSituacao({ tipo: 'aviso', texto: 'A loja não concluiu o pagamento. Nada foi cobrado; tente de novo.' })
    }
  }
  const botao = (opcao: Opcao, destaque: boolean) => (
    <button className={'btn' + (destaque ? '' : ' w')} disabled={situacao.tipo === 'comprando'} onClick={() => void continuar(opcao)}>
      {situacao.tipo === 'comprando' && situacao.opcao === opcao ? 'Abrindo a loja…' : BOTAO[opcao]}
    </button>
  )

  const cardDoPro = (
    <CardDePlano key="pro" selo="Para a pelada" nome="Pro" destaque={!torneio}>
      <div className="opcoes-lado-a-lado" role="radiogroup" aria-label="Período do Pro">
        <Escolha marcada={periodo === 'anual'} onClick={() => setPeriodo('anual')} titulo={`${preco('anual')}/ano`} detalhe="≈ R$ 9,92/mês · -33%" />
        <Escolha marcada={periodo === 'mensal'} onClick={() => setPeriodo('mensal')} titulo={`${preco('mensal')}/mês`} detalhe="Cancele quando quiser" />
      </div>
      {periodo === 'anual' && (
        <>
          <div className="plano-rotulo">Como pagar o anual</div>
          <div className="opcoes-lado-a-lado" role="radiogroup" aria-label="Forma de pagamento do Pro anual">
            <Escolha marcada={formaDoAnual === 'anual'} onClick={() => setFormaDoAnual('anual')} titulo="Cartão" detalhe="Renova sozinho" />
            <Escolha marcada={formaDoAnual === 'pix'} onClick={() => setFormaDoAnual('pix')} titulo="Pix" detalhe="Paga uma vez · não renova" />
          </div>
        </>
      )}
      <PorJogador
        valor={periodo === 'anual' ? PRO_ANUAL_POR_MES : PRO_MENSAL}
        conta={periodo === 'anual' ? `${preco('anual')} ÷ 12 meses ÷ ${jogadoresDaConta}` : `${preco('mensal')} ÷ ${jogadoresDaConta}`}
        jogadores={quantos} />
      <Vantagens itens={VANTAGENS_DO_PRO} sem={['Torneios ilimitados']} />
      {botao(opcaoDoPro, !torneio)}
    </CardDePlano>
  )
  const cardDoUltimate = (
    <CardDePlano key="ultimate" selo="Para ligas" nome="Ultimate">
      <div className="plano-preco"><b>{preco('ultimate')}</b><small>/mês</small></div>
      <div className="plano-sub">Só mensal · cartão · cancele quando quiser</div>
      <PorJogador valor={ULTIMATE_MENSAL} conta={`${preco('ultimate')} ÷ ${jogadoresDaConta}`} jogadores={quantos} />
      <Vantagens itens={VANTAGENS_DO_ULTIMATE} />
      {botao('ultimate', false)}
    </CardDePlano>
  )
  const cardDoTorneio = (
    <CardDePlano key="torneio" selo="Só um torneio" nome="Torneio avulso" destaque={torneio}>
      <div className="plano-preco"><b>{preco('torneio')}</b><small>/torneio</small></div>
      <div className="plano-sub">Paga uma vez · Pix ou cartão</div>
      <Vantagens itens={VANTAGENS_DO_TORNEIO} />
      {botao('torneio', torneio)}
    </CardDePlano>
  )

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Planos" onClick={onFechar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: 'calc(var(--altura-tela) * .92)', overflowY: 'auto', color: 'var(--navy)' }}>
        <div className="ph">Planos<Icone nome="trofeu" tamanho={20} /></div>
        <div className="pb planos-fundo">
          <div className="planos-chamada">{chamada}</div>
          {torneio ? [cardDoTorneio, cardDoUltimate] : [cardDoPro, cardDoUltimate, cardDoTorneio]}
          {situacao.tipo === 'comprou' && (
            <div className="planos-aviso">Pronto! A loja confirmou. Seu plano é atualizado aqui em instantes.</div>
          )}
          {situacao.tipo === 'aviso' && (
            <div className="planos-aviso">
              {situacao.texto}
              {plano.cobrancaAtiva && !podeComprarAqui() && <> <button className="lnk" onClick={() => void abrirLink(ENDERECO_NA_LOJA)}>Baixar o app</button></>}
            </div>
          )}
          <div className="planos-rodape">O pagamento é feito na Google Play: o app não vê o seu cartão.</div>
          <button className="btn w sm" onClick={onFechar}>{situacao.tipo === 'comprou' ? 'Fechar' : 'Agora não'}</button>
        </div>
      </section>
    </div>
  )
}

function CardDePlano({ selo, nome, destaque = false, children }: { selo: string; nome: string; destaque?: boolean; children: ReactNode }) {
  return (
    <div className={'plano-card' + (destaque ? ' destaque' : '')}>
      <span className="plano-selo">{destaque && '★ '}{selo}</span>
      <div className="plano-nome">{nome}</div>
      {children}
    </div>
  )
}

function Escolha({ marcada, onClick, titulo, detalhe }: { marcada: boolean; onClick: () => void; titulo: string; detalhe: string }) {
  return (
    <button role="radio" aria-checked={marcada} className={'chip' + (marcada ? ' on' : '')} onClick={onClick}
      style={{ height: 'auto', padding: '8px 6px', display: 'grid', gap: 2, textAlign: 'center' }}>
      <span className="num" style={{ fontSize: 19 }}>{titulo}</span>
      <span style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>{detalhe}</span>
    </button>
  )
}

/** A conta que o organizador faz para decidir: o plano dividido pela turma sai por centavos, com a conta à mostra. */
function PorJogador({ valor, conta, jogadores }: { valor: number; conta: string; jogadores: number }) {
  return (
    <div className="plano-conta">
      <b>≈ {reais(porJogadorPorMes(valor, jogadores))} por jogador por mês</b>
      <small>{conta}</small>
    </div>
  )
}

function Vantagens({ itens, sem = [] }: { itens: string[]; sem?: string[] }) {
  return (
    <ul className="plano-vantagens">
      {itens.map((item) => <li key={item}>{item}</li>)}
      {sem.map((item) => <li key={item} className="nao">{item}</li>)}
    </ul>
  )
}
