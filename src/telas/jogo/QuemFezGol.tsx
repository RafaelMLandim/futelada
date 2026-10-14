import { useState } from 'react'
import { Camisa } from '../../components/Camisa'
import { buscarGoleiro, jogadorGoleiro, outro } from '../../logic'
import { useJogadoresDaTurma } from '../../store/turmas'
import type { Pelada } from '../../store/usePelada'
import type { Colete, Jogador, Lado, Time } from '../../types/pelada'
import { maiusculas, normalizarNome } from '../../utils/formatar'

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
  const [busca, setBusca] = useState<string | null>(null) // null = lista do time; texto = buscando o goleiro
  const turma = useJogadoresDaTurma(pelada.app.estado.config.turma)
  const escolher = (autor: Jogador | null) => {
    onFechar()
    onEscolher(autor, contra)
  }
  const goleiroFixo = contra ? goleiros.adversario : goleiros.time
  const doGol = contra ? adversario : time
  const achados = busca !== null ? buscarGoleiro(pelada.app.estado, turma, busca) : []

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
        {busca !== null ? (
          // O goleiro não é fixo: busca quem estava no gol do Time N
          <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              {contra ? `Gol contra · quem estava no gol do Time ${doGol.numero}?` : `Quem estava no gol do Time ${doGol.numero}?`}
            </div>
            <form style={{ display: 'flex' }} onSubmit={(ev) => {
              ev.preventDefault()
              if (busca.trim() && achados.length > 0) escolher(achados.find((j) => normalizarNome(j.nome) === normalizarNome(busca)) ?? achados[0])
            }}>
              <label style={{ display: 'flex', flex: 1 }}>
                <span className="vh">Nome do goleiro</span>
                <input className="inp" autoFocus placeholder="Nome do goleiro" value={busca} autoCapitalize="characters" enterKeyHint="done"
                  onChange={(ev) => setBusca(maiusculas(ev.target.value))} />
              </label>
            </form>
            {achados.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {achados.map((j) => (
                  <button key={j.id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => escolher(j)}>{j.nome}</button>
                ))}
              </div>
            )}
            {busca.trim() && achados.length === 0 && <div className="mut">Ninguém na lista com esse nome.</div>}
            <button className="btn w sm" onClick={() => setBusca(null)}>Voltar</button>
          </div>
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
                onClick={() => goleiroFixo ? escolher(jogadorGoleiro(goleiroFixo)) : setBusca('')}>
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
