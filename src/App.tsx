import { useState } from 'react'
import { Inicio } from './telas/Inicio'
import { PeladaApp } from './telas/PeladaApp'
import { TorneioApp } from './telas/torneio/TorneioApp'
import { PagarPelada } from './telas/PagarPelada'
import { AcompanharPelada } from './telas/PeladaAoVivo'
import { AjudarPelada } from './telas/AjudarPelada'
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
// link para acompanhar a pelada ao vivo (?ver=CÓDIGO): abre sem login, só para ver (PLANO.md, seção 16)
const codigoParaAcompanhar = new URLSearchParams(location.search).get('ver')
// link para assumir o controle da pelada de outra pessoa (?controle=CÓDIGO&chave=…): pede login
const codigoDeControle = new URLSearchParams(location.search).get('controle')
const chaveDeControle = new URLSearchParams(location.search).get('chave') ?? ''

export default function App() {
  const conta = useConta()
  const [modo, setModoEstado] = useState<Modo>(modoSalvo)
  // na pelada e no torneio a tela não apaga (o celular não bloqueia no meio do jogo)
  useTelaLigada(!!codigoParaAcompanhar || !!codigoDeControle || (!codigoDePagamento && (modo === 'pelada' || modo === 'torneio')))
  const setModo = (m: Modo) => {
    setModoEstado(m)
    try {
      localStorage.setItem(CHAVE_MODO, m)
    } catch {
      // sem armazenamento: só não lembra o modo
    }
  }

  // "voltar" do celular, fora do início: volta para o início (no início, fecha o app)
  const noApp = !codigoDePagamento && !codigoParaAcompanhar && !codigoDeControle && (!nuvemDisponivel() || conta.logado)
  useVoltar(noApp && modo !== 'inicio', () => setModo('inicio'))

  if (codigoDePagamento) return <PagarPelada codigo={codigoDePagamento} />
  if (codigoParaAcompanhar) return <AcompanharPelada codigo={codigoParaAcompanhar} />
  // Primeiro o login (quem já entrou vai direto); sem nuvem configurada, o app abre sem login
  if (nuvemDisponivel()) {
    if (conta.perfil === undefined) return <Login />
    if (!conta.logado) return <Login conta={conta} />
  }
  if (codigoDeControle) return <AjudarPelada codigo={codigoDeControle} chave={chaveDeControle} />
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
