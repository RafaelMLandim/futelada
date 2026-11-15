import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { goleiroDoTime, jogadoresDeLinha } from '../../logic/torneio'
import type { TimeTorneio } from '../../types/torneio'
import { textoSobre } from '../../utils/cores'

/**
 * Só os números das camisas do time (serve com o time em campo: não tira ninguém nem muda a ordem).
 * Um campo na frente de cada nome; Enter passa para o próximo.
 */
export function NumerosDasCamisas({ time, onSalvar, onCancelar }: {
  time: TimeTorneio
  onSalvar: (numeros: Record<string, number | undefined>) => void
  onCancelar: () => void
}) {
  const goleiro = goleiroDoTime(time)
  const jogadores = [...(goleiro ? [goleiro] : []), ...jogadoresDeLinha(time)]
  const [numeros, setNumeros] = useState<Record<string, number | undefined>>(
    () => Object.fromEntries(jogadores.map((jogador) => [jogador.id, jogador.camisa])),
  )
  const lista = useRef<HTMLDivElement>(null)
  // já abre o teclado no primeiro sem número (ou no primeiro da lista)
  useEffect(() => {
    const campos = [...(lista.current?.querySelectorAll<HTMLInputElement>('input') ?? [])]
    ;(campos.find((campo) => campo.value === '') ?? campos[0])?.focus()
  }, [])

  const mudar = (id: string, texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 2)
    setNumeros((anteriores) => ({ ...anteriores, [id]: digitos === '' ? undefined : Number(digitos) }))
  }
  const usados = Object.values(numeros).filter((numero) => numero !== undefined)
  const repetido = (numero: number | undefined) => numero !== undefined && usados.filter((outro) => outro === numero).length > 1
  const passarParaOProximo = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    const campos = [...(lista.current?.querySelectorAll<HTMLInputElement>('input') ?? [])]
    const proximo = campos[campos.indexOf(evento.currentTarget) + 1]
    if (proximo) proximo.focus()
    else evento.currentTarget.blur()
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Números das camisas do ${time.nome}`} onClick={onCancelar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
          <span className="row num" style={{ gap: 8, minWidth: 0 }}>
            <Camisa cor={time.cor} uniforme={time.uniforme} contorno={textoSobre(time.cor)} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Números · {time.nome}</span>
          </span>
        </div>
        <div className="pb mut" style={{ fontSize: 13, paddingBottom: 8 }}>O número é opcional. Enter passa para o próximo.</div>
        <div ref={lista} style={{ overflowY: 'auto', minHeight: 0, borderTop: '2px solid var(--divisoria)' }}>
          {jogadores.map((jogador) => (
            <div key={jogador.id} className="tr" style={{ minHeight: 48 }}>
              <label style={{ display: 'flex', flex: 'none' }}>
                <span className="vh">Número da camisa de {jogador.nome}</span>
                <input className={'inp camisa' + (repetido(numeros[jogador.id]) ? ' repetida' : '')} inputMode="numeric" placeholder="Nº" maxLength={2}
                  enterKeyHint="next" value={numeros[jogador.id] ?? ''} onChange={(evento) => mudar(jogador.id, evento.target.value)}
                  onKeyDown={passarParaOProximo} onFocus={(evento) => evento.currentTarget.select()} />
              </label>
              <span className="nome">{jogador.nome}</span>
              {jogador.goleiro && <span className="tag t-y">Goleiro</span>}
            </div>
          ))}
        </div>
        <div className="pb" style={{ display: 'grid', gap: 8, borderTop: '2px solid var(--divisoria)' }}>
          <button className="btn" onClick={() => onSalvar(numeros)}><Icone nome="certo" tamanho={20} /> Salvar números</button>
          <button className="btn w sm" onClick={onCancelar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}
