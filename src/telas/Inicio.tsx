import type { ReactNode } from 'react'
import { Icone, type NomeIcone } from '../components/Icone'
import { Avatar } from '../components/Avatar'
import { BotaoDaMusica } from '../components/Barra'
import { Logo } from '../components/Logo'
import { carregar as peladaSalva } from '../store/armazenamento'
import { useCaixa, useConta, useHistorico } from '../store/conta'
import { useImportarTurmaAntiga, useTurmas } from '../store/turmas'
import { listaDeTorneios } from '../store/torneio'
import { useParticipacoes } from '../store/participacoes'
import { usePlano } from '../store/plano'
import { useTorneiosEncerrados } from '../store/historicoDeTorneios'
import { numerosDoHistorico } from '../logic/torneio'
import { textoDasPeladasGratis } from '../logic/plano'
import { dataHoje, reais } from '../utils/formatar'

// Tela inicial: pelada do dia, torneio, caixa da pelada e histórico (a conta fica na foto, no topo).
/** `onPerfil`: abre o Meu perfil na carta da pelada ou na do torneio (cada grupo abre a sua). */
export function Inicio({ onPelada, onTorneio, onCaixa, onHistorico, onPerfil, onBolao, onHistoricoDeTorneios }: { onPelada: () => void; onTorneio: (comLista: boolean) => void; onCaixa: () => void; onHistorico: () => void; onPerfil: (carta: 'pelada' | 'torneio') => void; onBolao: () => void; onHistoricoDeTorneios: () => void }) {
  const conta = useConta()
  const caixa = useCaixa()
  const { peladas } = useHistorico()
  // primeira vez: as peladas antigas viram a turma "Minha pelada"
  const { turmas } = useTurmas()
  useImportarTurmaAntiga(conta.logado ? turmas : null, conta.logado ? peladas : null)
  // "Pelada 3 de 10 grátis" (só com a cobrança ligada e sem Pro)
  const gratis = textoDasPeladasGratis(usePlano())
  const pelada = peladaSalva()
  // os que organiza neste celular (os abertos só para acompanhar ficam no "Jogando" da pré-tela)
  const torneios = listaDeTorneios().filter((item) => !item.jogador)
  const torneio = torneios[0] ?? null
  // torneios em que joga (entrou num time pelo link com a conta): o torneio abre a pré-tela, com o Jogando
  const jogando = (useParticipacoes() ?? []).length
  const partidas = pelada?.estado.historico.length ?? 0
  const encerrados = useTorneiosEncerrados() ?? []
  const titulos = conta.perfil ? numerosDoHistorico(encerrados, conta.perfil.uid).titulos : 0

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <header className="bar">
        {/* só a data: a logo já diz o nome do app ("2 OU 10") */}
        <Logo fundo={false} />
        <h1 className="h1" style={{ flex: 1 }}>{dataHoje()}</h1>
        <BotaoDaMusica />
        <Avatar />
      </header>
      <div className="conteudo" style={{ justifyContent: 'safe center', gap: 16 }}>
        <section className="panel">
          <div className="ph" style={{ fontSize: 22, padding: '10px 14px' }}><span className="row" style={{ gap: 10 }}><Icone nome="bola" tamanho={26} />Pelada</span></div>
          <Opcao icone="times" titulo="Meu perfil" onClick={conta.logado ? () => onPerfil('pelada') : conta.entrar}
            detalhe={conta.logado ? 'Sua carta e suas conquistas' : 'Sua carta de jogador · entre com o Google'}
            acao={conta.logado ? 'Ver' : 'Entrar'} />
          <Opcao icone="bola" titulo="Pelada do dia" onClick={onPelada}
            detalhe={pelada?.iniciada ? `Em andamento · ${partidas} ${partidas === 1 ? 'partida jogada' : 'partidas jogadas'}` : (gratis ?? 'Lista de chegada e rodízio de times')}
            acao={pelada?.iniciada ? 'Continuar' : 'Começar'} />
          <Opcao icone="carteira" titulo="Caixa" onClick={conta.logado ? onCaixa : conta.entrar}
            detalhe={conta.logado ? `Saldo ${reais(caixa.saldo)}` : 'Entradas, saídas e saldo · entre com o Google'}
            acao={conta.logado ? 'Abrir' : 'Entrar'} />
          <Opcao icone="tabela" titulo="Histórico" onClick={conta.logado ? onHistorico : conta.entrar}
            detalhe={conta.logado ? (peladas?.length ? `${peladas.length} ${peladas.length === 1 ? 'pelada' : 'peladas'} · ranking da temporada` : 'Peladas encerradas e ranking da temporada') : 'Peladas e ranking · entre com o Google'}
            acao={conta.logado ? 'Abrir' : 'Entrar'} />
        </section>

        <section className="panel">
          <div className="ph" style={{ fontSize: 22, padding: '10px 14px' }}><span className="row" style={{ gap: 10 }}><Icone nome="trofeu" tamanho={26} />Torneio</span></div>
          {/* com torneio no celular, abre a pré-tela "Torneios" (escolher um ou criar outro) */}
          <Opcao icone="trofeu" titulo={torneio ? torneio.nome : jogando ? 'Torneios' : 'Novo torneio'} onClick={() => onTorneio(jogando > 0 || torneios.length > 0)}
            detalhe={!torneio && jogando ? `Jogando ${jogando} · ou crie o seu` : !torneio ? 'Times fixos, tabela, chave e campeão'
              : torneios.length > 1 ? `${torneios.length} torneios · escolher ou criar outro`
                : torneio.campeao ? `🏆 ${torneio.campeao} · ou crie outro` : 'Em andamento · ou crie outro'}
            acao={!torneio && jogando ? 'Ver' : !torneio ? 'Criar' : torneios.length > 1 ? 'Escolher' : torneio.campeao ? 'Ver' : 'Continuar'} />
          <Opcao icone="times" titulo="Meu perfil" onClick={conta.logado ? () => onPerfil('torneio') : conta.entrar}
            detalhe={conta.logado ? 'Sua carta do torneio e suas conquistas' : 'Sua carta do torneio · entre com o Google'}
            acao={conta.logado ? 'Ver' : 'Entrar'} />
          <Opcao icone="certo" titulo="Bolão" onClick={conta.logado ? onBolao : conta.entrar}
            detalhe={conta.logado ? 'Palpites dos jogos e ranking · só pontos' : 'Palpites e ranking · entre com o Google'}
            acao={conta.logado ? 'Abrir' : 'Entrar'} />
          <Opcao icone="tabela" titulo="Histórico" onClick={conta.logado ? onHistoricoDeTorneios : conta.entrar}
            detalhe={!conta.logado ? 'Torneios encerrados · entre com o Google'
              : encerrados.length ? `${encerrados.length} ${encerrados.length === 1 ? 'torneio' : 'torneios'}${titulos ? ` · ${titulos} ${titulos === 1 ? 'título' : 'títulos'}` : ''}` : 'Torneios encerrados'}
            acao={conta.logado ? 'Abrir' : 'Entrar'} />
        </section>
      </div>
    </div>
  )
}

function Opcao({ icone, titulo, detalhe, acao, onClick }: {
  icone: NomeIcone; titulo: string; detalhe: ReactNode; acao: string; onClick: () => void
}) {
  return (
    <button className="tr" onClick={onClick} style={{ width: '100%', border: 0, minHeight: 60, padding: '8px 12px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--navy)' }}>
      <Icone nome={icone} tamanho={24} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="num" style={{ display: 'block', fontSize: 20, lineHeight: 1.1, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</span>
        <span className="mut" style={{ display: 'block', fontSize: 13 }}>{detalhe}</span>
      </span>
      <span className="tag t-y" style={{ height: 30, fontSize: 16, flex: 'none' }}>{acao} →</span>
    </button>
  )
}
