// Número da camisa ao lado do nome do jogador (torneio). Sem número, fica o quadradinho vazio tracejado
// (o número é opcional); `goleiro`: amarelo, com "G" quando não tem número; `reserva`: cinza.

export function NumeroDaCamisa({ numero, goleiro = false, reserva = false }: { numero?: number; goleiro?: boolean; reserva?: boolean }) {
  const semNumero = numero === undefined && !goleiro
  return (
    <span className={'no numero-camisa' + (goleiro ? ' g' : '') + (semNumero ? ' sem-numero' : '') + (reserva && !goleiro ? ' reserva' : '')}
      aria-label={numero !== undefined ? `camisa ${numero}` : undefined}>
      {numero ?? (goleiro ? 'G' : '')}
    </span>
  )
}
