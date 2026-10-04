// Moeda de cara ou coroa: dourada, só com o texto. Tem as duas faces de verdade
// para o giro em 3D parar mostrando a face sorteada.

type Face = 'cara' | 'coroa'

/**
 * `resultado` = face que fica para cima ao parar; `girando` liga a animação,
 * que termina exatamente nessa face. Antes de jogar (`parada`), mostra "?".
 */
export function Moeda({ resultado, girando, parada, onClick }: {
  resultado: Face; girando: boolean; parada: boolean; onClick: () => void
}) {
  const classe = 'moeda3d ' + (girando ? `girando-${resultado}` : resultado)
  return (
    <button className={classe} onClick={onClick} aria-label="Jogar a moeda">
      <span className="face frente num">{parada ? '?' : 'Cara'}</span>
      <span className="face verso num">Coroa</span>
    </button>
  )
}
