// Braçadeira de capitão: faixa suave (amarelo-claro) ao lado do nome, da altura toda da linha.
// `diagonal`: a faixa inclinada, como a braçadeira no braço.

export type EstiloDaBracadeira = 'vertical' | 'diagonal'
export const ESTILO_DA_BRACADEIRA: EstiloDaBracadeira = 'diagonal'

/** O nome do jogador na linha da lista; o capitão leva a braçadeira logo depois do nome. */
export function NomeDoJogador({ nome, capitao = false, estilo = ESTILO_DA_BRACADEIRA }: { nome: string; capitao?: boolean; estilo?: EstiloDaBracadeira }) {
  if (!capitao) return <span className="nome">{nome}</span>
  return (
    <span className="nome nome-capitao">
      <span className="texto">{nome}</span>
      <span className={'bracadeira ' + estilo} role="img" aria-label="capitão" title="Capitão"><span>C</span></span>
    </span>
  )
}
