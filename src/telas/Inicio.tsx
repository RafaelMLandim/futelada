import type { ReactNode } from 'react'
import { Icone, type NomeIcone } from '../components/Icone'
import { Logo } from '../components/Logo'
import { carregar as peladaSalva } from '../store/armazenamento'
import { torneioSalvo } from '../store/torneio'
import { dataHoje } from '../utils/formatar'

// Tela inicial: escolher entre a pelada do dia e o torneio.
export function Inicio({ onPelada, onTorneio }: { onPelada: () => void; onTorneio: () => void }) {
  const pelada = peladaSalva()
  const torneio = torneioSalvo()
  const partidas = pelada?.estado.historico.length ?? 0

  return (
    <div className="scr" style={{ height: '100dvh' }}>
      <header className="bar">
        {/* só a data: a logo já diz o nome do app ("2 OU 10") */}
        <h1 className="h1">{dataHoje()}</h1>
        <Logo fundo={false} />
      </header>
      <div className="conteudo" style={{ justifyContent: 'center', gap: 16 }}>
        <Opcao icone="bola" titulo="Pelada do dia" onClick={onPelada}
          detalhe={pelada?.iniciada ? `Em andamento · ${partidas} ${partidas === 1 ? 'partida jogada' : 'partidas jogadas'}` : 'Lista de chegada e rodízio de times'}
          acao={pelada?.iniciada ? 'Continuar' : 'Começar'} />
        <Opcao icone="trofeu" titulo="Torneio" onClick={onTorneio}
          detalhe={torneio ? torneio.nome : 'Times fixos, tabela, chave e campeão'}
          acao={torneio ? 'Continuar' : 'Criar torneio'} />
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
