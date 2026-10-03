import { useState } from 'react'
import { Icone } from './components/Icone'
import { usePelada } from './store/usePelada'
import { Config } from './telas/Config'
import { Jogo } from './telas/jogo/Jogo'
import { Lista } from './telas/Lista'
import { Tabela } from './telas/Tabela'

type Aba = 'lista' | 'jogo' | 'tabela'

export default function App() {
  const pelada = usePelada()
  const { app } = pelada
  const emJogo = app.estado.emCampo !== null
  const [aba, setAba] = useState<Aba>(emJogo ? 'jogo' : 'lista')
  const [ajustes, setAjustes] = useState(false)

  if (!app.iniciada || ajustes) {
    return (
      <Config
        pelada={pelada}
        onPronto={() => {
          pelada.iniciar()
          setAjustes(false)
        }}
      />
    )
  }

  const abas: [Aba, 'lista' | 'bola' | 'tabela', string][] = [
    ['lista', 'lista', emJogo ? 'Fila' : 'Lista'],
    ['jogo', 'bola', 'Jogo'],
    ['tabela', 'tabela', 'Tabela'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {aba === 'lista' && <Lista pelada={pelada} onApitar={() => setAba('jogo')} />}
        {aba === 'jogo' && <Jogo pelada={pelada} onAjustes={() => setAjustes(true)} onLista={() => setAba('lista')} />}
        {aba === 'tabela' && <Tabela pelada={pelada} />}
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
