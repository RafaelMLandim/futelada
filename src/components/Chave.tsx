// Interruptor liga/desliga.
export function Chave({ ligada, alternar, rotulo }: { ligada: boolean; alternar: () => void; rotulo: string }) {
  return (
    <button className={'tg' + (ligada ? ' on' : '')} role="switch" aria-checked={ligada} aria-label={rotulo} onClick={alternar}>
      <span />
    </button>
  )
}
