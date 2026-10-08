import { useEffect, useRef, useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone, type NomeIcone } from '../../components/Icone'
import { campeao, timesDoJogo } from '../../logic/torneio'
import { useTorneio } from '../../store/torneio'
import { codigoDoLink, limparLink } from '../../utils/convite'
import { AjustesTorneio } from './AjustesTorneio'
import { CriarTorneio } from './CriarTorneio'
import { JogoTorneio } from './JogoTorneio'
import { Jogos } from './Jogos'
import { TabelaTorneio } from './TabelaTorneio'
import { Times } from './Times'
import { useVoltar } from '../../utils/voltar'

type Aba = 'times' | 'jogos' | 'jogo' | 'tabela' | 'ajustes'

/** O torneio: criação e depois as abas Times, Jogos e Ajustes. */
export function TorneioApp({ onInicio }: { onInicio: () => void }) {
  const hook = useTorneio()
  const { torneio } = hook
  const [abaEscolhida, setAba] = useState<Aba | null>(null)
  const [jogoAberto, setJogoAberto] = useState<string | null>(null)
  const { compartilhado } = hook

  // Entrou pelo link de convite (?entrar=CÓDIGO)
  const { entrar } = hook
  useEffect(() => {
    const cod = codigoDoLink()
    if (cod) { limparLink(); void entrar(cod) }
  }, [entrar])
  // "voltar" do celular numa aba escolhida: volta para a aba principal
  useVoltar(abaEscolhida !== null, () => setAba(null))

  // Acabou o torneio (saiu o campeão agora): volta para o início, que mostra o campeão.
  // Quem abre um torneio que já tinha acabado continua nele (para ver a tabela e a chave).
  const vencedor = torneio ? campeao(torneio) : null
  const vencedorAntes = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!torneio) return
    if (vencedorAntes.current === null && vencedor) onInicio()
    vencedorAntes.current = vencedor
  }, [torneio, vencedor, onInicio])

  if (compartilhado && compartilhado.status !== 'ok') {
    const textos = {
      carregando: `Conectando ao torneio ${compartilhado.codigo}…`,
      'nao-encontrado': `O torneio ${compartilhado.codigo} não existe mais (o organizador apagou).`,
      erro: 'Não deu para abrir o torneio compartilhado. Confira a internet.',
    } as const
    return (
      <div className="scr" style={{ height: '100dvh' }}>
        <Barra titulo="Torneio" sub={`Código ${compartilhado.codigo}`} />
        <div className="conteudo" style={{ justifyContent: 'center' }}>
          <div className="panel pb" style={{ fontWeight: 600, fontSize: 16 }}>{textos[compartilhado.status]}</div>
          <button className="btn w sm" onClick={() => { hook.sair(); onInicio() }}>Voltar ao início</button>
        </div>
      </div>
    )
  }

  if (!torneio) {
    return (
      <CriarTorneio
        onEntrar={hook.podeCompartilhar ? (cod) => hook.entrar(cod) : undefined}
        onCriar={(t) => {
          hook.criar(t)
          setAba('times')
          // com nuvem configurada, o torneio já nasce compartilhado (se não der, fica no celular)
          if (hook.podeCompartilhar) void hook.compartilhar().catch(() => null)
        }} />
    )
  }
  const aba: Aba = abaEscolhida ?? (torneio.emAndamento.length ? 'jogo' : torneio.sorteado ? 'jogos' : 'times')

  // Jogos em andamento (por campo) e qual está aberto na aba Jogo
  const emAndamento = [...torneio.emAndamento].sort((a, b) => a.campo - b.campo)
  // mesário abre direto o jogo do campo dele
  const atual = emAndamento.find((p) => p.jogoId === jogoAberto)
    ?? emAndamento.find((p) => p.campo === hook.meuCampo) ?? emAndamento[0]
  const podeMarcar = (campo: number) => hook.souOrganizador || hook.meuCampo === campo
  const abrirJogo = (jogoId: string) => { setJogoAberto(jogoId); setAba('jogo') }
  // Quando um jogo acaba: se ainda tem outro rolando, fica nele; senão volta para a lista
  const aoTerminar = () => {
    setJogoAberto(null)
    setAba(emAndamento.length > 1 ? 'jogo' : 'jogos')
  }

  const abas: [Aba, NomeIcone, string][] = [
    ['times', 'times', 'Times'],
    ['jogos', torneio.sorteado ? 'lista' : 'sorteio', torneio.sorteado ? 'Jogos' : 'Sorteio'],
    ...(torneio.emAndamento.length ? [['jogo', 'bola', torneio.emAndamento.length > 1 ? `Ao vivo (${torneio.emAndamento.length})` : 'Ao vivo'] as [Aba, NomeIcone, string]] : []),
    ...(torneio.sorteado ? [['tabela', 'tabela', 'Tabela'] as [Aba, NomeIcone, string]] : []),
    ['ajustes', 'ajustes', 'Ajustes'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
      {compartilhado && (
        <div className="faixa-nuvem" role="status">
          <span>Código <b>{compartilhado.codigo}</b> · {hook.souOrganizador ? 'organizador' : hook.meuCampo ? `mesário do Campo ${hook.meuCampo}` : 'acompanhando'}</span>
          <span className={compartilhado.online ? 'on' : 'off'}>{compartilhado.online ? '● ao vivo' : '● sem internet · vai sincronizar'}</span>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {aba === 'times' && <Times hook={hook} onSorteio={() => setAba('jogos')} />}
        {aba === 'jogos' && <Jogos hook={hook} onJogar={abrirJogo} />}
        {aba === 'jogo' && atual && (
          <>
            {emAndamento.length > 1 && (
              <div className="seletor-jogos" role="tablist" aria-label="Jogos em andamento">
                {emAndamento.map((p) => {
                  const jogo = torneio.jogos.find((j) => j.id === p.jogoId)!
                  const ids = timesDoJogo(torneio, jogo)
                  const nome = (id: string | null) => torneio.times.find((x) => x.id === id)?.nome ?? '?'
                  return (
                    <button key={p.jogoId} role="tab" aria-selected={p.jogoId === atual.jogoId}
                      className={'chip' + (p.jogoId === atual.jogoId ? ' on' : '')} onClick={() => setJogoAberto(p.jogoId)}>
                      C{p.campo} · {nome(ids.A)} {p.placar[0]}-{p.placar[1]} {nome(ids.B)}
                    </button>
                  )
                })}
              </div>
            )}
            <JogoTorneio key={atual.jogoId} hook={hook} jogoId={atual.jogoId} editavel={podeMarcar(atual.campo)} onTerminou={aoTerminar} />
          </>
        )}
        {aba === 'jogo' && !atual && <Jogos hook={hook} onJogar={abrirJogo} />}
        {aba === 'tabela' && <TabelaTorneio torneio={torneio} />}
        {aba === 'ajustes' && <AjustesTorneio hook={hook} onInicio={onInicio} />}
      </div>
      <nav className="nav" aria-label="Navegação do torneio">
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
