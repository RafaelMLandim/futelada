import { useMemo, useState, type ReactNode } from 'react'
import { Barra } from '../components/Barra'
import { Icone, type NomeIcone } from '../components/Icone'
import type { PeladaCompartilhada } from '../nuvem/tipos'
import { usePeladaNaNuvem } from '../store/compartilhamento'
import { peladaSoParaVer, SEM_COBRANCA } from '../store/peladaAoVivo'
import type { Pelada } from '../store/usePelada'
import { SomenteLeitura } from '../utils/somenteLeitura'
import { Jogo } from './jogo/Jogo'
import { Lista } from './Lista'
import { PeladaEncerrada } from './PeladaEncerrada'
import { Tabela } from './Tabela'

type Aba = 'lista' | 'jogo' | 'tabela'
/** Faixa do topo da pelada compartilhada (AO VIVO, quem está no controle, a pelada acabou…). */
export function Faixa({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <div role="status" className="row" style={{ gap: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, justifyContent: 'center', textAlign: 'center', background: cor, color: '#fff' }}>
      {children}
    </div>
  )
}

/** Abas Fila/Jogo/Tabela de uma pelada (sem Ajustes), com a faixa e um painel extra no topo. */
export function AbasDaPelada({ pelada, faixa, extra }: { pelada: Pelada; faixa: ReactNode; extra?: ReactNode }) {
  const [aba, setAba] = useState<Aba>('jogo')
  const emJogo = pelada.app.estado.emCampo !== null
  const abas: [Aba, NomeIcone, string][] = [
    ['lista', 'lista', emJogo ? 'Fila' : 'Lista'],
    ['jogo', 'bola', 'Jogo'],
    ['tabela', 'tabela', 'Tabela'],
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
      {faixa}
      {extra}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {aba === 'lista' && <Lista pelada={pelada} cobranca={SEM_COBRANCA} onApitar={() => setAba('jogo')} />}
        {aba === 'jogo' && <Jogo pelada={pelada} onLista={() => setAba('lista')} />}
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

/** A pelada da nuvem só para ver (sem nenhuma ação), com a faixa e um painel extra no topo. */
export function PeladaAoVivo({ dados, faixa, extra }: { dados: PeladaCompartilhada; faixa: ReactNode; extra?: ReactNode }) {
  const pelada = useMemo(() => peladaSoParaVer(dados), [dados])
  return (
    <SomenteLeitura.Provider value={true}>
      <AbasDaPelada pelada={pelada} faixa={faixa} extra={extra} />
    </SomenteLeitura.Provider>
  )
}

/** Carregando ou não achou a pelada. */
export function SemPelada({ carregando }: { carregando: boolean }) {
  return (
    <div className="scr">
      <Barra titulo="Pelada" sub="Ao vivo" />
      <div className="conteudo">
        <div className="vazio">{carregando ? 'Carregando a pelada…' : 'Não achamos essa pelada. Confira o link com quem compartilhou.'}</div>
      </div>
    </div>
  )
}

/** Link para acompanhar a pelada (?ver=CÓDIGO, PLANO.md, seção 16): abre sem login, só para ver. */
export function AcompanharPelada({ codigo }: { codigo: string }) {
  const { naNuvem: dados } = usePeladaNaNuvem(codigo)
  if (!dados) return <SemPelada carregando={dados === undefined} />
  if (dados.encerrada) return <PeladaEncerrada dados={dados} />
  return (
    <PeladaAoVivo dados={dados} faixa={(
      <Faixa cor="var(--vermelho)"><span aria-hidden="true">●</span> AO VIVO · só acompanhando{dados.nomeDoDono ? ` · pelada de ${dados.nomeDoDono}` : ''}</Faixa>
    )} />
  )
}
