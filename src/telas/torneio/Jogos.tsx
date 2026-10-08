import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import {
  campoDoJogo, camposLivres, campeao, iniciarPartida, jogosParaComecar, nomeDoGrupo, podeComecarNoCampo, problemasParaSortear,
  proximosPorCampo, sortear,
} from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { SEM_COLETE } from '../../utils/cores'
import { ChaveCompleta } from './ChaveCompleta'
import { descreverOrigem, nomeDoJogo, timePorId } from './nomes'

const NOME_FORMATO = { pontos: 'Pontos corridos', 'mata-mata': 'Mata-mata', grupos: 'Grupos + mata-mata' }

// Sorteio (grupos / chave / ordem) e a tabela de jogos.
export function Jogos({ hook, onJogar }: { hook: TorneioHook; onJogar: (jogoId: string) => void }) {
  const torneio = hook.torneio!
  const confirmar = useConfirmar()
  const [chaveAberta, setChaveAberta] = useState(false) // mata-mata em tela cheia
  const comecou = torneio.jogos.some((j) => j.resultado)

  if (!torneio.sorteado) {
    const problemas = problemasParaSortear(torneio)
    return (
      <div className="scr">
        <Barra titulo="Sorteio" sub={`${torneio.nome} · ${NOME_FORMATO[torneio.regras.formato]}`} />
        <div className="conteudo">
          <section className="panel">
            <div className="ph">O que vai ser sorteado</div>
            <div className="pb mut" style={{ color: 'var(--navy)', fontSize: 15 }}>
              {torneio.regras.formato === 'pontos' && 'A ordem dos jogos. Todos jogam contra todos.'}
              {torneio.regras.formato === 'mata-mata' && 'A chave do mata-mata (quem pega quem).'}
              {torneio.regras.formato === 'grupos' && `Os ${torneio.regras.grupos} grupos e a ordem dos jogos. Passam ${torneio.regras.classificamPorGrupo} de cada grupo.`}
            </div>
          </section>
          {problemas.length > 0 && (
            <section className="panel">
              <div className="ph">Antes de sortear</div>
              {problemas.map((p) => <div key={p} className="tr"><span className="tag t-warn">!</span><span className="nome" style={{ whiteSpace: 'normal' }}>{p}</span></div>)}
            </section>
          )}
        </div>
        <div className="rodape">
          {hook.souOrganizador
            ? <button className="btn" disabled={problemas.length > 0} onClick={() => hook.aplicar((t) => sortear(t))}><Icone nome="sorteio" /> Sortear</button>
            : <div className="panel pb mut" style={{ color: 'var(--navy)' }}>Aguardando o organizador cadastrar os times e sortear.</div>}
        </div>
      </div>
    )
  }

  // Agrupa por fase: grupos (por rodada) e mata-mata (por rodada)
  const blocos = new Map<string, JogoTorneio[]>()
  for (const j of [...torneio.jogos].sort((a, b) => a.ordem - b.ordem)) {
    const campo = campoDoJogo(torneio, j)
    const titulo = j.fase === 'grupo' ? `${j.rodada} · ${nomeDoGrupo(j.grupo!)}${campo ? ` · Campo ${campo}` : ''}` : j.rodada
    blocos.set(titulo, [...(blocos.get(titulo) ?? []), j])
  }

  // Organizador começa em qualquer campo; mesário só no campo dele
  const meuCampo = hook.souOrganizador ? null : hook.meuCampo
  const mesarioSemCampo = !hook.souOrganizador && hook.meuCampo === null
  const podemComecar = mesarioSemCampo ? []
    : meuCampo === null ? jogosParaComecar(torneio) : torneio.jogos.filter((j) => podeComecarNoCampo(torneio, j, meuCampo))
  const proximos = mesarioSemCampo ? []
    : meuCampo === null ? proximosPorCampo(torneio)
      : podemComecar.slice(0, 1).map((jogo) => ({ campo: meuCampo, jogo }))
  const livres = camposLivres(torneio)
  const variosCampos = torneio.regras.campos > 1
  const vencedor = campeao(torneio)
  const temMata = torneio.jogos.some((j) => j.fase === 'mata')
  const jogar = (jogoId: string, campo?: number) => {
    hook.aplicar((t) => iniciarPartida(t, jogoId, campo))
    onJogar(jogoId)
  }

  return (
    <div className="scr">
      <Barra titulo="Jogos" sub={`${torneio.nome} · ${NOME_FORMATO[torneio.regras.formato]}`} />
      <div className="conteudo">
        {vencedor && (
          <section className="led num" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 16, color: '#c9d4e3', letterSpacing: 1 }}>CAMPEÃO</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, fontSize: 32, textTransform: 'uppercase' }}>
              <Icone nome="trofeu" tamanho={30} />{timePorId(torneio, vencedor)?.nome}
            </div>
          </section>
        )}
        {temMata && (
          <button className="btn w sm" style={{ flex: 'none' }} onClick={() => setChaveAberta(true)}>
            <Icone nome="trofeu" tamanho={20} /> Ver chave do mata-mata
          </button>
        )}
        {chaveAberta && <ChaveCompleta torneio={torneio} onFechar={() => setChaveAberta(false)} />}
        {[...torneio.emAndamento].sort((a, b) => a.campo - b.campo).map((p) => (
          <button key={p.jogoId} className="panel destaque row" style={{ padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
            onClick={() => onJogar(p.jogoId)}>
            <span className="tag t-ok">{variosCampos ? `Campo ${p.campo}` : 'Em andamento'}</span>
            <span className="nome" style={{ flex: 1, fontWeight: 700 }}>{descreverJogo(torneio, p.jogoId)}</span>
            <span className="num" style={{ fontSize: 18 }}>{p.placar[0]}-{p.placar[1]}</span>
            <span className="tag t-y">Abrir →</span>
          </button>
        ))}
        {mesarioSemCampo && !vencedor && (
          <div className="panel pb mut" style={{ color: 'var(--navy)' }}>
            Você está acompanhando. Para marcar jogos, escolha o seu campo em <b>Ajustes</b>.
          </div>
        )}
        {proximos.map(({ campo, jogo }) => (
          <section key={campo} className="panel destaque">
            <div className="ph">{variosCampos ? `Próximo · Campo ${campo}` : 'Próximo jogo'}<span className="sub">{nomeDoJogo(torneio, jogo)}</span></div>
            <LinhaDoJogo torneio={torneio} jogo={jogo} />
            <div className="pb"><button className="btn" onClick={() => jogar(jogo.id, campo)}>
              <Icone nome="play" /> {variosCampos ? `Jogar no Campo ${campo}` : 'Jogar agora'}
            </button></div>
          </section>
        ))}
        {proximos.length === 0 && torneio.emAndamento.length > 0 && livres.length > 0 && !vencedor && (
          <div className="panel pb mut" style={{ color: 'var(--navy)' }}>
            Campo {livres.join(' e ')} livre, mas os jogos que faltam são de outro campo, têm time que já está jogando
            ou dependem de jogos em andamento.
          </div>
        )}
        {torneio.grupos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {torneio.grupos.map((g, gi) => (
              <section key={gi} className="panel">
                <div className="ph">{nomeDoGrupo(gi)}{(() => {
                  const umJogo = torneio.jogos.find((j) => j.fase === 'grupo' && j.grupo === gi)
                  const campo = umJogo ? campoDoJogo(torneio, umJogo) : null
                  return campo ? <span className="sub">Campo {campo}</span> : null
                })()}</div>
                {g.map((id) => {
                  const t = timePorId(torneio, id)!
                  return <div key={id} className="tr" style={{ fontSize: 14 }}><Camisa cor={t.cor} tamanho={18} /><span className="nome">{t.nome}</span></div>
                })}
              </section>
            ))}
          </div>
        )}
        {[...blocos].map(([titulo, jogos]) => (
          <section key={titulo} className="panel">
            <div className="ph">{titulo}</div>
            {jogos.map((j) => (
              <LinhaDoJogo key={j.id} torneio={torneio} jogo={j}
                onJogar={podemComecar.includes(j) ? () => jogar(j.id, meuCampo ?? undefined) : undefined}
                emAndamento={torneio.emAndamento.some((p) => p.jogoId === j.id)} />
            ))}
          </section>
        ))}
        {/* antes do primeiro jogo: refazer o sorteio fica no fim da lista (não flutua por cima) */}
        {!comecou && hook.souOrganizador && (
          <button className="btn w sm" style={{ flex: 'none' }} onClick={() => confirmar({
            titulo: 'Sortear de novo?', mensagem: 'Grupos, chave e ordem dos jogos serão sorteados outra vez.',
            botao: 'Sortear de novo', aoConfirmar: () => hook.aplicar((t) => sortear(t)),
          })}><Icone nome="sorteio" /> Sortear de novo</button>
        )}
      </div>
    </div>
  )
}

function descreverJogo(torneio: Torneio, jogoId: string) {
  const jogo = torneio.jogos.find((j) => j.id === jogoId)!
  return `${descreverOrigem(torneio, jogo.casa).nome} x ${descreverOrigem(torneio, jogo.fora).nome}`
}

function LinhaDoJogo({ torneio, jogo, onJogar, emAndamento }: {
  torneio: Torneio; jogo: JogoTorneio; onJogar?: () => void; emAndamento?: boolean
}) {
  const casa = descreverOrigem(torneio, jogo.casa)
  const fora = descreverOrigem(torneio, jogo.fora)
  const r = jogo.resultado
  return (
    <div className="tr" style={{ minHeight: 46, fontSize: 14 }}>
      <Camisa cor={casa.time?.cor ?? SEM_COLETE} tamanho={18} />
      <span className="nome" style={{ color: casa.time ? undefined : 'var(--mut)' }}>{casa.nome}</span>
      <span className="led num" style={{ fontSize: 18, padding: '3px 8px', boxShadow: 'none', borderWidth: 1, flex: 'none' }}>
        {r ? `${r.placar[0]}-${r.placar[1]}${r.penaltis ? ` (${r.penaltis[0]}-${r.penaltis[1]})` : ''}` : 'x'}
      </span>
      <span className="nome" style={{ textAlign: 'right', color: fora.time ? undefined : 'var(--mut)' }}>{fora.nome}</span>
      <Camisa cor={fora.time?.cor ?? SEM_COLETE} tamanho={18} />
      {onJogar && <button className="ib s" style={{ background: 'var(--amarelo)' }} aria-label={`Jogar ${casa.nome} x ${fora.nome}`} onClick={onJogar}><Icone nome="play" tamanho={18} /></button>}
      {emAndamento && <span className="tag t-ok">ao vivo</span>}
    </div>
  )
}
