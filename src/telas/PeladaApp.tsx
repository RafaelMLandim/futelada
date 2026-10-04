import { useState } from 'react'
import { Icone, type NomeIcone } from '../components/Icone'
import { usePelada } from '../store/usePelada'
import { Config } from './Config'
import { Jogo } from './jogo/Jogo'
import { Lista } from './Lista'
import { Tabela } from './Tabela'

type Aba = 'lista' | 'jogo' | 'tabela' | 'ajustes'

/** A pelada do dia: abas Lista/Fila, Jogo, Tabela e Ajustes. */
export function PeladaApp({ onInicio }: { onInicio: () => void }) {
  const pelada = usePelada()
  const { app } = pelada
  const emJogo = app.estado.emCampo !== null
  const [aba, setAba] = useState<Aba>(emJogo ? 'jogo' : 'lista')

  // Criando a pelada: primeiro os ajustes, depois a lista
  if (!app.iniciada) {
    return <Config pelada={pelada} onInicio={onInicio} onPronto={() => { pelada.iniciar(); setAba('lista') }} />
  }

  const abas: [Aba, NomeIcone, string][] = [
    ['lista', 'lista', emJogo ? 'Fila' : 'Lista'],
    ['jogo', 'bola', 'Jogo'],
    ['tabela', 'tabela', 'Tabela'],
    ['ajustes', 'ajustes', 'Ajustes'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {aba === 'lista' && <Lista pelada={pelada} onApitar={() => setAba('jogo')} />}
        {aba === 'jogo' && <Jogo pelada={pelada} onLista={() => setAba('lista')} />}
        {aba === 'tabela' && <Tabela pelada={pelada} />}
        {aba === 'ajustes' && <Config pelada={pelada} onInicio={onInicio} />}
      </div>
      <nav className="nav" aria-label="Navegação">
        {abas.map(([id, icone, rotulo]) => (
          <button key={id} className={aba === id ? 'on' : ''} aria-current={aba === id ? 'page' : undefined} onClick={() => setAba(id)}>
            <Icone nome={icone} tamanho={24} />
            <span>{rotulo}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
