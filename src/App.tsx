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
import { EntrarNaLista } from './telas/EntrarNaLista'
import { InscricaoNoTorneio } from './telas/torneio/InscricaoNoTorneio'
import { Perfil } from './telas/Perfil'
import { nuvemDisponivel } from './nuvem'
import { useConta } from './store/conta'
import { useTelaLigada } from './utils/telaLigada'
import { useVoltar } from './utils/voltar'
import { useFecharJanelaComEsc } from './utils/teclaEsc'
import { useMusicaDeFundo } from './utils/musica'
import { VoltarAoInicio } from './components/navegacao'
import { TelaoLocal, TelaoNaTv } from './telas/torneio/Telao'
import { EscolherTorneio } from './telas/torneio/EscolherTorneio'

type Modo = 'inicio' | 'pelada' | 'torneio' | 'torneios' | 'caixa' | 'historico' | 'perfil'
const CHAVE_MODO = 'app:modo'
// qual perfil estava aberto (o da pelada ou o do torneio): ao reabrir o app, volta nele
const CHAVE_PERFIL = 'app:perfil'

function modoSalvo(): Modo {
  // link de convite para um torneio abre direto no torneio
  if (new URLSearchParams(location.search).get('entrar')) return 'torneio'
  try {
    const m = localStorage.getItem(CHAVE_MODO)
    return m === 'pelada' || m === 'torneio' || m === 'torneios' || m === 'caixa' || m === 'historico' || m === 'perfil' ? m : 'inicio'
  } catch {
    return 'inicio'
  }
}

/** Escolhe entre a pelada do dia e o torneio (e lembra o último usado). */
// link de pagamento do campo pago (?pagar=CÓDIGO): abre só a página de pagar
const codigoDePagamento = new URLSearchParams(location.search).get('pagar')
// link da pelada (?lista=CÓDIGO): quem joga se coloca na lista, sem precisar do app (PLANO.md, seção 17.2)
const codigoDaLista = new URLSearchParams(location.search).get('lista')
// link de inscrição do torneio (?inscricao=CÓDIGO, com &time=ID no link do time): o capitão inscreve o time e os
// jogadores entram nele, sem precisar do app (PLANO.md, seção 22)
const codigoDaInscricao = new URLSearchParams(location.search).get('inscricao')
const timeDaInscricao = new URLSearchParams(location.search).get('time')
// link para acompanhar a pelada ao vivo (?ver=CÓDIGO): abre sem login, só para ver (PLANO.md, seção 16)
const codigoParaAcompanhar = new URLSearchParams(location.search).get('ver')
// link para assumir o controle da pelada de outra pessoa (?controle=CÓDIGO&chave=…): pede login
const codigoDeControle = new URLSearchParams(location.search).get('controle')
const chaveDeControle = new URLSearchParams(location.search).get('chave') ?? ''
// telão do torneio na TV (dois-ou-dez.web.app/telao): sem login, pareado pelo celular do organizador (PLANO.md, seção 20)
const ehTelao = location.pathname.replace(/\/+$/, '') === '/telao'
// protótipo do telão do torneio (?telao=local&campo=1), só no desenvolvimento
const campoDoTelaoLocal = import.meta.env.DEV && new URLSearchParams(location.search).get('telao') === 'local'
  ? Number(new URLSearchParams(location.search).get('campo') ?? 1) || 1 : null

export default function App() {
  const conta = useConta()
  useFecharJanelaComEsc()
  const [modo, setModoEstado] = useState<Modo>(modoSalvo)
  // Meu perfil: abre na carta da pelada ou na do torneio (conforme o grupo de onde veio, na tela inicial)
  const [cartaDoPerfil, setCartaDoPerfilEstado] = useState<'pelada' | 'torneio'>(() => {
    try { return localStorage.getItem(CHAVE_PERFIL) === 'torneio' ? 'torneio' : 'pelada' } catch { return 'pelada' }
  })
  const setCartaDoPerfil = (carta: 'pelada' | 'torneio') => {
    setCartaDoPerfilEstado(carta)
    try { localStorage.setItem(CHAVE_PERFIL, carta) } catch { /* sem armazenamento: só não lembra */ }
  }
  // música de fundo nos menus (a pelada e o torneio decidem a deles); nos links de fora, silêncio
  useMusicaDeFundo(!ehTelao && !campoDoTelaoLocal && !codigoDePagamento && !codigoDaLista && !codigoDaInscricao && !codigoParaAcompanhar && !codigoDeControle && (!nuvemDisponivel() || conta.logado) && modo !== 'pelada' && modo !== 'torneio')
  // na pelada e no torneio a tela não apaga (o celular não bloqueia no meio do jogo)
  useTelaLigada(ehTelao || !!campoDoTelaoLocal || !!codigoParaAcompanhar || !!codigoDeControle || (!codigoDePagamento && (modo === 'pelada' || modo === 'torneio')))
  const setModo = (m: Modo) => {
    setModoEstado(m)
    try {
      localStorage.setItem(CHAVE_MODO, m)
    } catch {
      // sem armazenamento: só não lembra o modo
    }
  }

  // "voltar" do celular, fora do início: volta para o início (no início, fecha o app)
  const noApp = !codigoDePagamento && !codigoDaLista && !codigoDaInscricao && !codigoParaAcompanhar && !codigoDeControle && (!nuvemDisponivel() || conta.logado)
  useVoltar(noApp && modo !== 'inicio', () => setModo('inicio'))

  if (ehTelao) return <TelaoNaTv />
  if (campoDoTelaoLocal) return <TelaoLocal campo={campoDoTelaoLocal} />
  if (codigoDePagamento) return <PagarPelada codigo={codigoDePagamento} />
  if (codigoDaLista) return <EntrarNaLista codigo={codigoDaLista} />
  if (codigoDaInscricao) return <InscricaoNoTorneio codigo={codigoDaInscricao} time={timeDaInscricao} />
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
    : modo === 'torneios' ? <EscolherTorneio onAbrir={() => setModo('torneio')} onVoltar={inicio} />
    : modo === 'caixa' ? <Caixa onVoltar={inicio} />
    : modo === 'historico' ? <Historico />
    : modo === 'perfil' ? <Perfil key={cartaDoPerfil} carta={cartaDoPerfil} />
    : null
  // o menu da foto (no topo) tem "Voltar ao início"
  if (tela) return <VoltarAoInicio.Provider value={inicio}>{tela}</VoltarAoInicio.Provider>
  return <Inicio onPelada={() => setModo('pelada')} onTorneio={(comLista) => setModo(comLista ? 'torneios' : 'torneio')} onCaixa={() => setModo('caixa')} onHistorico={() => setModo('historico')} onPerfil={(carta) => { setCartaDoPerfil(carta); setModo('perfil') }} />
}
