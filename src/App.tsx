import { useState } from 'react'
import { Inicio } from './telas/Inicio'
import { PeladaApp } from './telas/PeladaApp'
import { TorneioApp } from './telas/torneio/TorneioApp'
import { PagarPelada } from './telas/PagarPelada'
import { Caixa } from './telas/Caixa'
import { Historico } from './telas/Historico'
import { Login } from './telas/Login'
import { nuvemDisponivel } from './nuvem'
import { useConta } from './store/conta'
import { useTelaLigada } from './utils/telaLigada'
import { useVoltar } from './utils/voltar'
import { VoltarAoInicio } from './components/navegacao'

type Modo = 'inicio' | 'pelada' | 'torneio' | 'caixa' | 'historico'
const CHAVE_MODO = 'app:modo'

function modoSalvo(): Modo {
  // link de convite para um torneio abre direto no torneio
  if (new URLSearchParams(location.search).get('entrar')) return 'torneio'
  try {
    const m = localStorage.getItem(CHAVE_MODO)
    return m === 'pelada' || m === 'torneio' || m === 'caixa' || m === 'historico' ? m : 'inicio'
  } catch {
    return 'inicio'
  }
}

/** Escolhe entre a pelada do dia e o torneio (e lembra o último usado). */
// link de pagamento do campo pago (?pagar=CÓDIGO): abre só a página de pagar
const codigoDePagamento = new URLSearchParams(location.search).get('pagar')

export default function App() {
  const conta = useConta()
  const [modo, setModoEstado] = useState<Modo>(modoSalvo)
  // na pelada e no torneio a tela não apaga (o celular não bloqueia no meio do jogo)
  useTelaLigada(!codigoDePagamento && (modo === 'pelada' || modo === 'torneio'))
  const setModo = (m: Modo) => {
    setModoEstado(m)
    try {
      localStorage.setItem(CHAVE_MODO, m)
    } catch {
      // sem armazenamento: só não lembra o modo
    }
  }

  // "voltar" do celular, fora do início: volta para o início (no início, fecha o app)
  const noApp = !codigoDePagamento && (!nuvemDisponivel() || conta.logado)
  useVoltar(noApp && modo !== 'inicio', () => setModo('inicio'))

  if (codigoDePagamento) return <PagarPelada codigo={codigoDePagamento} />
  // Primeiro o login (quem já entrou vai direto); sem nuvem configurada, o app abre sem login
  if (nuvemDisponivel()) {
    if (conta.perfil === undefined) return <Login />
    if (!conta.logado) return <Login conta={conta} />
  }
  const inicio = () => setModo('inicio')
  const tela = modo === 'pelada' ? <PeladaApp />
    : modo === 'torneio' ? <TorneioApp onInicio={inicio} />
    : modo === 'caixa' ? <Caixa onVoltar={inicio} />
    : modo === 'historico' ? <Historico />
    : null
  // o menu da foto (no topo) tem "Voltar ao início"
  if (tela) return <VoltarAoInicio.Provider value={inicio}>{tela}</VoltarAoInicio.Provider>
  return <Inicio onPelada={() => setModo('pelada')} onTorneio={() => setModo('torneio')} onCaixa={() => setModo('caixa')} onHistorico={() => setModo('historico')} />
}
