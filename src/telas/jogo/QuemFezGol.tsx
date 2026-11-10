import { useState } from 'react'
import { Camisa } from '../../components/Camisa'
import { buscarGoleiro, jogadorGoleiro, outro } from '../../logic'
import { useJogadoresDaTurma } from '../../store/turmas'
import type { Pelada } from '../../store/usePelada'
import type { Colete, Jogador, Lado, Time } from '../../types/pelada'
import { maiusculas, normalizarNome } from '../../utils/formatar'

/**
 * Goleiro não fixo: quem estava no gol é sempre alguém da lista (do dia, da turma ou um goleiro fixo). Busca pelo nome,
 * sem criar nome novo. Usado no "Quem fez?" e no "Quem deu o passe?". `excluir`: quem não pode ser escolhido (o autor do gol).
 */
function BuscaDoGoleiro({ pelada, pergunta, excluir, onEscolher, onVoltar }: {
  pelada: Pelada; pergunta: string; excluir?: string; onEscolher: (jogador: Jogador) => void; onVoltar: () => void
}) {
  const [busca, setBusca] = useState('')
  const turma = useJogadoresDaTurma(pelada.app.estado.config.turma)
  const achados = buscarGoleiro(pelada.app.estado, turma, busca).filter((jogador) => jogador.id !== excluir)
  return (
    <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>{pergunta}</div>
      <form style={{ display: 'flex' }} onSubmit={(evento) => {
        evento.preventDefault()
        if (busca.trim() && achados.length > 0) onEscolher(achados.find((jogador) => normalizarNome(jogador.nome) === normalizarNome(busca)) ?? achados[0])
      }}>
        <label style={{ display: 'flex', flex: 1 }}>
          <span className="vh">Nome do goleiro</span>
          <input className="inp" autoFocus placeholder="Nome do goleiro" value={busca} autoCapitalize="characters" enterKeyHint="done"
            onChange={(evento) => setBusca(maiusculas(evento.target.value))} />
        </label>
      </form>
      {achados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {achados.map((jogador) => (
            <button key={jogador.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => onEscolher(jogador)}>{jogador.nome}</button>
          ))}
        </div>
      )}
      {busca.trim() && achados.length === 0 && <div className="mut">Ninguém na lista com esse nome.</div>}
      <button className="btn w sm" onClick={onVoltar}>Voltar</button>
    </div>
  )
}

/**
 * Modal "Quem fez?": os jogadores do time do gol (ou do outro, no gol contra), o goleiro e "Não sei".
 * `goleiros` = goleiro fixo de cada time (null = não fixo: tocar em "Goleiro" abre a busca de quem estava no gol).
 */
export function EscolherAutor({ pelada, titulo, colete, time, adversario, goleiros, contraInicial = false, naoSei, onEscolher, onFechar }: {
  pelada: Pelada; titulo: string; colete: Colete; time: Time; adversario: Time; goleiros: { time: string | null; adversario: string | null }
  contraInicial?: boolean; naoSei: string; onEscolher: (autor: Jogador | null, contra: boolean) => void; onFechar: () => void
}) {
  // Gol contra: a lista mostra os jogadores do outro time
  const [contra, setContra] = useState(contraInicial)
  const [busca, setBusca] = useState(false) // true = buscando quem estava no gol (goleiro não fixo)
  const escolher = (autor: Jogador | null) => {
    onFechar()
    onEscolher(autor, contra)
  }
  const goleiroFixo = contra ? goleiros.adversario : goleiros.time
  const doGol = contra ? adversario : time

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">
          <span className="row" style={{ gap: 8 }}>
            <Camisa cor={colete.cor} contorno="#fff" />{titulo}
          </span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Cancelar" onClick={onFechar}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </button>
        </div>
        {busca ? (
          // O goleiro não é fixo: busca quem estava no gol do Time N
          <BuscaDoGoleiro pelada={pelada} pergunta={contra ? `Gol contra · quem estava no gol do Time ${doGol.numero}?` : `Quem estava no gol do Time ${doGol.numero}?`}
            onEscolher={escolher} onVoltar={() => setBusca(false)} />
        ) : (
          <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              {contra ? `Gol contra · quem do Time ${adversario.numero} fez?` : 'Quem fez?'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {doGol.jogadores.map((j) => (
                <button key={j.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => escolher(j)}>
                  {j.nome}
                </button>
              ))}
              <button className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }}
                onClick={() => goleiroFixo ? escolher(jogadorGoleiro(goleiroFixo)) : setBusca(true)}>
                🧤 {goleiroFixo ?? 'Goleiro'}
              </button>
            </div>
            <button className="btn sm" onClick={() => escolher(null)}>{naoSei}</button>
            {contra
              ? <button className="btn w sm" onClick={() => setContra(false)}>Não foi gol contra</button>
              : <button className="btn w sm" onClick={() => setContra(true)}>Foi gol contra</button>}
          </div>
        )}
      </section>
    </div>
  )
}

// Pergunta quem fez o gol para a artilharia.
export function QuemFezGol({ pelada, lado, onGol, onFechar }: {
  pelada: Pelada; lado: Lado; onGol: (lado: Lado, autor: Jogador | null, contra?: boolean) => void; onFechar: () => void
}) {
  const { estado } = pelada.app
  if (!estado.emCampo) return null
  const time = estado.emCampo[lado]
  return (
    <EscolherAutor pelada={pelada} titulo={`Gol do Time ${time.numero}`} colete={estado.config.coletes[lado]} time={time} adversario={estado.emCampo[outro(lado)]}
      goleiros={{ time: estado.goleiros[lado], adversario: estado.goleiros[outro(lado)] }}
      naoSei="Não sei · só marcar o gol" onEscolher={(autor, contra) => onGol(lado, autor, contra)} onFechar={onFechar} />
  )
}

// Assistências ligadas: depois de quem fez o gol, pergunta quem deu o passe (Troféu Garçom).
export function QuemDeuOPasse({ pelada, lado, autorId, onPasse, onFechar }: {
  pelada: Pelada; lado: Lado; autorId: string; onPasse: (jogador: Jogador | null) => void; onFechar: () => void
}) {
  const { estado } = pelada.app
  const [busca, setBusca] = useState(false)
  if (!estado.emCampo) return null
  const time = estado.emCampo[lado]
  const goleiroFixo = estado.goleiros[lado]
  const companheiros = [...time.jogadores, ...(goleiroFixo ? [jogadorGoleiro(goleiroFixo)] : [])].filter((j) => j.id !== autorId)
  const escolher = (jogador: Jogador | null) => {
    onFechar()
    onPasse(jogador)
  }
  // goleiro não fixo: o passe também pode ter sido de quem estava no gol (mesma busca do gol do goleiro)
  const goleiroNaoFixo = !goleiroFixo
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Quem deu o passe?" onClick={() => escolher(null)}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">
          <span className="row" style={{ gap: 8 }}>
            <Camisa cor={estado.config.coletes[lado].cor} contorno="#fff" />Gol do Time {time.numero}
          </span>
        </div>
        {busca ? (
          <BuscaDoGoleiro pelada={pelada} pergunta={`Quem estava no gol do Time ${time.numero}?`} excluir={autorId} onEscolher={escolher} onVoltar={() => setBusca(false)} />
        ) : (
        <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Quem deu o passe?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {companheiros.map((j) => (
              <button key={j.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => escolher(j)}>
                {j.id.startsWith('goleiro:') ? `🧤 ${j.nome}` : j.nome}
              </button>
            ))}
            {goleiroNaoFixo && (
              <button className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => setBusca(true)}>🧤 Goleiro</button>
            )}
          </div>
          <button className="btn sm" onClick={() => escolher(null)}>Ninguém · não sei</button>
        </div>
        )}
      </section>
    </div>
  )
}
