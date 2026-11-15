import { luminancia, textoSobre } from '../utils/cores'

// Número da camisa ao lado do nome do jogador (torneio). Sem número, fica o quadradinho vazio tracejado
// (o número é opcional; goleiro também: a luva ao lado já diz que é o goleiro). `cor`: a cor da camisa do time (o
// número fica no fundo dela); sem `cor`, verde (`goleiro`: amarelo). `reserva`: cinza.

export function NumeroDaCamisa({ numero, goleiro = false, reserva = false, cor }: { numero?: number; goleiro?: boolean; reserva?: boolean; cor?: string }) {
  const semNumero = numero === undefined
  const naCor = cor && !semNumero && !reserva
  return (
    <span className={'no numero-camisa' + (goleiro && !cor ? ' g' : '') + (semNumero ? ' sem-numero' : '') + (reserva ? ' reserva' : '')}
      style={naCor ? { background: cor, color: textoSobre(cor), ...(luminancia(cor) > 0.7 && { boxShadow: 'inset 0 0 0 1.5px rgba(16, 34, 58, .35)' }) } : undefined}
      aria-label={numero !== undefined ? `${goleiro ? 'goleiro, ' : ''}camisa ${numero}` : goleiro ? 'goleiro' : undefined}>
      {numero ?? ''}
    </span>
  )
}
