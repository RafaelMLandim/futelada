import { useState } from 'react'
import type { Gol, Lado } from '../types/pelada'
import { useConfirmar } from '../utils/confirmacao'
import { minutoDoGol } from '../utils/formatar'
import { Bola } from './Bola'

type GolNaLista = { indice: number; minuto: string | null }
type Autor = { nome: string; gols: GolNaLista[]; passes: string[] } // passes: quem deu o passe (assistências ligadas)

/** Minuto do gol; com vários tempos (torneio), com o tempo em que saiu: "2ºT 7'", "Pror. 5+1'". */
function minutoNoTempo(g: Gol, tempoMin: number): string | null {
  const minuto = minutoDoGol(g.tempoMs, g.duracaoMin ?? tempoMin)
  return minuto && g.periodo ? `${g.periodo} ${minuto}` : minuto
}

/** Agrupa os gols de um lado por jogador, na ordem do primeiro gol de cada um. */
function autoresDoLado(gols: Gol[], lado: Lado, tempoMin: number): Autor[] {
  const autores: Autor[] = []
  gols.forEach((g, indice) => {
    if (g.lado !== lado) return
    // gol contra fica no lado de quem ganhou o gol, separado dos gols normais do jogador
    const nome = `${g.autor ?? 'Sem autor'}${g.contra ? ' (contra)' : ''}`
    const autor = autores.find((a) => a.nome === nome)
    const gol = { indice, minuto: minutoNoTempo(g, tempoMin) }
    const atual = autor ?? autores[autores.push({ nome, gols: [], passes: [] }) - 1]
    atual.gols.push(gol)
    if (g.assistencia && !atual.passes.includes(g.assistencia)) atual.passes.push(g.assistencia)
  })
  return autores
}

/**
 * Resumo dos gols da partida, como nos placares de futebol: a bola no meio, quem fez gol
 * de cada lado e o minuto ("RONALDO 3', 8'"). Tocar no jogador abre um modal para remover um gol dele
 * ou, com `onAutor`, para marcar quem fez (gol que ficou "Sem autor" ou com o autor errado).
 */
export function ResumoDeGols({ gols, tempoMin, nomeDoLado, onRemover, onAutor }: {
  gols: Gol[]; tempoMin: number; nomeDoLado: Record<Lado, string>
  onRemover?: (indice: number) => void; onAutor?: (indice: number) => void
}) {
  const confirmar = useConfirmar()
  const [escolhendo, setEscolhendo] = useState<Autor | null>(null)
  if (gols.length === 0) return null

  const remover = (indice: number) => {
    const g = gols[indice]
    const minuto = minutoNoTempo(g, tempoMin)
    confirmar({
      titulo: 'Remover gol',
      mensagem: `Remover o gol${g.contra ? ' contra' : ''} ${g.autor ? `de ${g.autor}` : 'sem autor'}${minuto ? ` aos ${minuto}` : ''} (${nomeDoLado[g.lado]})?`,
      botao: 'Remover', perigo: true, aoConfirmar: () => onRemover?.(indice),
    })
  }

  // Tocar no jogador: só remover e um gol só → modal de confirmação; senão → modal para escolher o gol e o que fazer
  const tocar = (a: Autor) => (!onAutor && a.gols.length === 1 ? remover(a.gols[0].indice) : setEscolhendo(a))
  const tocavel = onRemover || onAutor
  const dica = onAutor && onRemover ? 'Toque no jogador para marcar quem fez ou remover um gol'
    : onAutor ? 'Toque no jogador para marcar quem fez' : 'Toque no jogador para remover um gol'

  const coluna = (lado: Lado) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: lado === 'A' ? 'flex-start' : 'flex-end', minWidth: 0 }}>
      {autoresDoLado(gols, lado, tempoMin).map((a) => {
        const texto = (
          <>
            <span className="nome-autor">{a.nome}</span>{' '}
            <span className="minuto-gol">{a.gols.map((g) => g.minuto ?? '•').join(', ')}</span>
            {a.passes.length > 0 && <span className="mut" style={{ display: 'block', fontSize: 11 }}>passe: {a.passes.join(', ')}</span>}
          </>
        )
        return tocavel
          ? <button key={a.nome} className="autor-gol tocavel" style={{ textAlign: lado === 'A' ? 'left' : 'right' }}
              aria-label={onAutor ? `Gols de ${a.nome}` : `Remover gol de ${a.nome}`} onClick={() => tocar(a)}>{texto}</button>
          : <div key={a.nome} className="autor-gol" style={{ textAlign: lado === 'A' ? 'left' : 'right' }}>{texto}</div>
      })}
    </div>
  )

  return (
    <section className="panel" aria-label="Gols da partida">
      <div className="pb" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
        {coluna('A')}
        {/* a bola fica sempre no meio, na vertical, por mais gols que tenha */}
        <div style={{ alignSelf: 'center', display: 'flex' }}><Bola tamanho={18} /></div>
        {coluna('B')}
      </div>
      {tocavel && <div className="mut" style={{ textAlign: 'center', padding: '0 12px 8px', fontSize: 11 }}>{dica}</div>}
      {escolhendo && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Gols de ${escolhendo.nome}`} onClick={() => setEscolhendo(null)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">{onAutor ? (escolhendo.nome.startsWith('Sem autor') ? `${escolhendo.gols.length > 1 ? 'Gols' : 'Gol'} sem autor` : `Gols de ${escolhendo.nome}`) : `Remover gol de ${escolhendo.nome}`}</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              {!onAutor && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Qual gol foi marcado errado?</div>}
              {escolhendo.gols.map((g, k) => {
                const qual = escolhendo.gols.length > 1 ? `o ${k + 1}º gol${g.minuto ? ` (aos ${g.minuto})` : ''}` : `o gol${g.minuto ? ` (aos ${g.minuto})` : ''}`
                if (!onAutor) {
                  return <button key={g.indice} className="btn r sm" onClick={() => { setEscolhendo(null); onRemover?.(g.indice) }}>Remover {qual}</button>
                }
                return (
                  <div key={g.indice} style={{ display: 'grid', gap: 6 }}>
                    {escolhendo.gols.length > 1 && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>{k + 1}º gol{g.minuto ? ` · ${g.minuto}` : ''}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: onRemover ? '1fr 1fr' : '1fr', gap: 6 }}>
                      <button className="btn sm" onClick={() => { setEscolhendo(null); onAutor(g.indice) }}>
                        {gols[g.indice].autor ? 'Trocar quem fez' : 'Marcar quem fez'}
                      </button>
                      {onRemover && <button className="btn r sm" onClick={() => { setEscolhendo(null); remover(g.indice) }}>Remover</button>}
                    </div>
                  </div>
                )
              })}
              <button className="btn w sm" onClick={() => setEscolhendo(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
