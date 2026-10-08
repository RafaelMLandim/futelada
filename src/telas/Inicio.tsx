import type { ReactNode } from 'react'
import { Icone, type NomeIcone } from '../components/Icone'
import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { carregar as peladaSalva } from '../store/armazenamento'
import { useCaixa, useConta, useHistorico } from '../store/conta'
import { torneioSalvo } from '../store/torneio'
import { dataHoje, reais } from '../utils/formatar'

// Tela inicial: pelada do dia, torneio, caixa da pelada e histórico (a conta fica na foto, no topo).
export function Inicio({ onPelada, onTorneio, onCaixa, onHistorico }: { onPelada: () => void; onTorneio: () => void; onCaixa: () => void; onHistorico: () => void }) {
  const conta = useConta()
  const caixa = useCaixa()
  const { peladas } = useHistorico()
  const pelada = peladaSalva()
  const torneio = torneioSalvo()
  const partidas = pelada?.estado.historico.length ?? 0

  return (
    <div className="scr" style={{ height: '100dvh' }}>
      <header className="bar">
        {/* só a data: a logo já diz o nome do app ("2 OU 10") */}
        <Logo fundo={false} />
        <h1 className="h1" style={{ flex: 1 }}>{dataHoje()}</h1>
        <Avatar />
      </header>
      <div className="conteudo" style={{ justifyContent: 'center', gap: 16 }}>
        <Opcao icone="bola" titulo="Pelada do dia" onClick={onPelada}
          detalhe={pelada?.iniciada ? `Em andamento · ${partidas} ${partidas === 1 ? 'partida jogada' : 'partidas jogadas'}` : 'Lista de chegada e rodízio de times'}
          acao={pelada?.iniciada ? 'Continuar' : 'Começar'} />
        <Opcao icone="trofeu" titulo="Torneio" onClick={onTorneio}
          detalhe={torneio ? (torneio.campeao ? `${torneio.nome} · 🏆 ${torneio.campeao}` : torneio.nome) : 'Times fixos, tabela, chave e campeão'}
          acao={torneio ? (torneio.campeao ? 'Ver' : 'Continuar') : 'Criar torneio'} />
        <Opcao icone="carteira" titulo="Caixa da pelada" onClick={conta.logado ? onCaixa : conta.entrar}
          detalhe={conta.logado ? `Saldo ${reais(caixa.saldo)}` : 'Entradas, saídas e saldo · entre com o Google'}
          acao={conta.logado ? 'Abrir' : 'Entrar'} />
        <Opcao icone="tabela" titulo="Histórico" onClick={conta.logado ? onHistorico : conta.entrar}
          detalhe={conta.logado ? (peladas?.length ? `${peladas.length} ${peladas.length === 1 ? 'pelada' : 'peladas'} · ranking da temporada` : 'Peladas encerradas e ranking da temporada') : 'Peladas encerradas e ranking · entre com o Google'}
          acao={conta.logado ? 'Abrir' : 'Entrar'} />
      </div>
    </div>
  )
}

function Opcao({ icone, titulo, detalhe, acao, onClick }: {
  icone: NomeIcone; titulo: string; detalhe: ReactNode; acao: string; onClick: () => void
}) {
  return (
    <button className="panel" onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}>
      <div className="ph" style={{ fontSize: 22, padding: '10px 14px' }}>
        <span className="row" style={{ gap: 10 }}><Icone nome={icone} tamanho={26} />{titulo}</span>
      </div>
      <div className="pb row" style={{ justifyContent: 'space-between', gap: 12 }}>
        <span className="mut" style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15 }}>{detalhe}</span>
        <span className="tag t-y" style={{ height: 30, fontSize: 17, flex: 'none' }}>{acao} →</span>
      </div>
    </button>
  )
}
