import { useState } from 'react'
import { Inicio } from './telas/Inicio'
import { PeladaApp } from './telas/PeladaApp'
import { TorneioApp } from './telas/torneio/TorneioApp'

type Modo = 'inicio' | 'pelada' | 'torneio'
const CHAVE_MODO = 'app:modo'

function modoSalvo(): Modo {
  // link de convite para um torneio abre direto no torneio
  if (new URLSearchParams(location.search).get('entrar')) return 'torneio'
  try {
    const m = localStorage.getItem(CHAVE_MODO)
    return m === 'pelada' || m === 'torneio' ? m : 'inicio'
  } catch {
    return 'inicio'
  }
}

/** Escolhe entre a pelada do dia e o torneio (e lembra o último usado). */
export default function App() {
  const [modo, setModoEstado] = useState<Modo>(modoSalvo)
  const setModo = (m: Modo) => {
    setModoEstado(m)
    try {
      localStorage.setItem(CHAVE_MODO, m)
    } catch {
      // sem armazenamento: só não lembra o modo
    }
  }

  if (modo === 'pelada') return <PeladaApp onInicio={() => setModo('inicio')} />
  if (modo === 'torneio') return <TorneioApp onInicio={() => setModo('inicio')} />
  return <Inicio onPelada={() => setModo('pelada')} onTorneio={() => setModo('torneio')} />
}
