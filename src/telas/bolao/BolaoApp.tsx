// Bolão (PLANO.md, seção 23): "Meus bolões" (entrar pelo link ou pelo código) e, dentro de cada um, os jogos (ao vivo
// em destaque, como na aba Jogos do torneio), os palpites do torneio e o ranking. Brincadeira sem dinheiro: só pontos.

import { useEffect, useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { useConta } from '../../store/conta'
import { useFotosDasContas } from '../../store/denuncias'
import { codigoDoBolao, entrarNoBolao, linkDoBolao, useBolao, useMeusBoloes, type BolaoHook } from '../../store/bolao'
import {
  PONTOS_DO_BOLAO, palpiteDoJogoFechado, palpiteDoTorneioFechado, pontosDoJogo, pontosDoTorneio, respostasDoTorneio, situacaoDoJogo,
  timesDoJogo, type PalpiteDoTorneio,
} from '../../logic/torneio'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { compartilharTexto } from '../../utils/nativo'
import { useVoltar } from '../../utils/voltar'
import { descreverOrigem, nomeDoJogo } from '../torneio/nomes'
import { PalpiteDoJogo } from './PalpiteDoJogo'

/** `codigoDoLink`: veio pelo link do bolão (?bolao=CÓDIGO): entra e abre direto. */
export function BolaoApp({ codigoDoLink, onVoltar }: { codigoDoLink: string | null; onVoltar: () => void }) {
  const [aberto, setAberto] = useState<string | null>(null)
  const conta = useConta()
  const [entrando, setEntrando] = useState(!!codigoDoLink)
  const [erroDoLink, setErroDoLink] = useState<string | null>(null)
  useEffect(() => {
    if (!codigoDoLink || !conta.perfil) return
    let ativo = true
    void entrarNoBolao(codigoDoLink, conta.perfil.nome ?? 'Jogador').then((achou) => {
      if (!ativo) return
      if (achou) setAberto(achou.codigo)
      else setErroDoLink('Esse torneio não existe mais (ou o código está errado).')
    }).catch(() => { if (ativo) setErroDoLink('Não deu para entrar agora. Confira a internet.') })
      .finally(() => { if (ativo) setEntrando(false) })
    // o link já foi usado: tira da barra de endereço (voltar não entra de novo)
    history.replaceState(null, '', location.pathname)
    return () => { ativo = false }
  }, [codigoDoLink, conta.perfil])

  useVoltar(!!aberto, () => setAberto(null))
  if (aberto && conta.perfil) return <TelaDoBolao codigo={aberto} eu={conta.perfil.uid} onVoltar={() => setAberto(null)} />
  return <ListaDeBoloes entrando={entrando} erroInicial={erroDoLink} nome={conta.perfil?.nome ?? 'Jogador'} onAbrir={setAberto} onVoltar={onVoltar} />
}

function ListaDeBoloes({ entrando, erroInicial, nome, onAbrir, onVoltar }: {
  entrando: boolean; erroInicial: string | null; nome: string; onAbrir: (codigo: string) => void; onVoltar: () => void
}) {
  const boloes = useMeusBoloes()
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const entrar = async () => {
    const codigo = codigoDoBolao(texto)
    if (!codigo) return setErro('Cole o link do bolão ou digite o código do torneio (6 letras e números).')
    setOcupado(true)
    setErro(null)
    try {
      const achou = await entrarNoBolao(codigo, nome)
      if (achou) { setTexto(''); onAbrir(achou.codigo) } else setErro('Não achamos esse torneio. Confira o código com o organizador.')
    } catch {
      setErro('Não deu para entrar agora. Confira a internet e tente de novo.')
    } finally {
      setOcupado(false)
    }
  }
  const ativos = (boloes ?? []).filter((bolao) => !bolao.encerrado)
  const encerrados = (boloes ?? []).filter((bolao) => bolao.encerrado)
  return (
    <div className="scr">
      <Barra titulo="Bolão" sub="Palpites dos torneios" />
      <div className="conteudo" style={{ gap: 10 }}>
        <section className="panel">
          <div className="ph">Entrar num bolão</div>
          <div className="pb" style={{ display: 'grid', gap: 8 }}>
            <input className="inp" placeholder="Cole o link ou digite o código" value={texto} onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => { if (evento.key === 'Enter') void entrar() }} autoCapitalize="characters" />
            <button className="btn" disabled={!texto.trim() || ocupado} onClick={() => void entrar()}>{ocupado ? 'Entrando…' : '+ Entrar no bolão'}</button>
            {(erro ?? erroInicial) && <div role="status" style={{ color: 'var(--vermelho)', fontWeight: 600, fontSize: 14 }}>{erro ?? erroInicial}</div>}
            <div className="mut" style={{ fontSize: 13 }}>Peça o link ao organizador do torneio. Os palpites são de graça e valem só pontos.</div>
          </div>
        </section>

        <section className="panel">
          <div className="ph">Meus bolões{ativos.length > 0 && <span className="sub">{ativos.length} {ativos.length === 1 ? 'torneio' : 'torneios'}</span>}</div>
          {entrando || boloes === null ? <div className="pb mut">Carregando…</div>
            : ativos.length === 0 ? <div className="pb mut" style={{ fontSize: 14 }}>Você ainda não está em nenhum bolão.</div>
            : ativos.map((bolao) => (
              <button key={bolao.id} className="tr" style={{ width: '100%', border: 0, minHeight: 64, padding: '8px 12px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--navy)', gap: 10 }}
                onClick={() => onAbrir(bolao.id)}>
                <span className="num" style={{ width: 46, height: 46, flex: 'none', borderRadius: 5, background: 'var(--navy)', color: 'var(--amarelo)', display: 'grid', placeItems: 'center', fontSize: 22, border: '2px solid var(--borda)' }}>
                  {bolao.posicao ? `${bolao.posicao}º` : '—'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="num" style={{ display: 'block', fontSize: 20, lineHeight: 1.1, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bolao.nomeDoTorneio}</span>
                  <span className="mut" style={{ display: 'block', fontSize: 13 }}>
                    {bolao.posicao ? `Você está em ${bolao.posicao}º · ${bolao.pontos ?? 0} pts` : 'Faça seus palpites'}{bolao.participantes ? ` · ${bolao.participantes} ${bolao.participantes === 1 ? 'participante' : 'participantes'}` : ''}
                  </span>
                </span>
                <span className="tag t-y" style={{ height: 30, fontSize: 16, flex: 'none' }}>Abrir →</span>
              </button>
            ))}
        </section>

        {encerrados.length > 0 && (
          <section className="panel">
            <div className="ph">Encerrados</div>
            {encerrados.map((bolao) => (
              <button key={bolao.id} className="tr" style={{ width: '100%', border: 0, minHeight: 50, padding: '6px 12px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--navy)', gap: 10 }}
                onClick={() => onAbrir(bolao.id)}>
                <span style={{ fontSize: 22 }}>{bolao.posicao === 1 ? '🏆' : bolao.posicao && bolao.posicao <= 3 ? '🏅' : '⚽'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700 }}>{bolao.nomeDoTorneio}</span>
                  <span className="mut" style={{ display: 'block', fontSize: 13 }}>Terminou em {bolao.posicao ?? '—'}º · {bolao.pontos ?? 0} pts</span>
                </span>
                {bolao.posicao === 1 && <span className="tag t-ok">Campeão</span>}
              </button>
            ))}
          </section>
        )}
        <button className="btn w sm" onClick={onVoltar}>Voltar ao início</button>
      </div>
    </div>
  )
}

type Aba = 'jogos' | 'torneio' | 'ranking'

function TelaDoBolao({ codigo, eu, onVoltar }: { codigo: string; eu: string; onVoltar: () => void }) {
  const bolao = useBolao(codigo, eu)
  const [aba, setAba] = useState<Aba>('jogos')
  const [jogo, setJogo] = useState<string | null>(null)
  useVoltar(!!jogo, () => setJogo(null))
  const { torneio } = bolao
  if (torneio === 'carregando' || torneio === 'nao-encontrado') {
    return (
      <div className="scr">
        <Barra titulo="Bolão" sub={`Torneio ${codigo}`} />
        <div className="conteudo">
          <div className="panel pb mut" style={{ color: 'var(--navy)' }}>{torneio === 'carregando' ? 'Carregando o torneio…' : 'Esse torneio não existe mais (o organizador apagou).'}</div>
          <button className="btn w sm" onClick={onVoltar}>Voltar</button>
        </div>
      </div>
    )
  }
  if (jogo) return <PalpiteDoJogo bolao={bolao} torneio={torneio} jogoId={jogo} eu={eu} onVoltar={() => setJogo(null)} />
  const sub = bolao.minha ? `Bolão · você em ${bolao.minha.posicao}º · ${bolao.minha.pontos} pts` : `Bolão · ${bolao.participantes.length} ${bolao.participantes.length === 1 ? 'participante' : 'participantes'}`
  return (
    <div className="scr">
      <Barra titulo={torneio.nome} sub={sub} />
      <div className="conteudo" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          {(['jogos', 'torneio', 'ranking'] as const).map((qual) => (
            <button key={qual} className={'chip' + (aba === qual ? ' on' : '')} style={{ flex: 1, height: 40, fontSize: 17 }} onClick={() => setAba(qual)}>
              {qual === 'jogos' ? 'Jogos' : qual === 'torneio' ? 'Torneio' : 'Ranking'}
            </button>
          ))}
        </div>
        {aba === 'jogos' && <AbaJogos bolao={bolao} torneio={torneio} eu={eu} onAbrir={setJogo} />}
        {aba === 'torneio' && <AbaTorneio bolao={bolao} torneio={torneio} />}
        {aba === 'ranking' && <AbaRanking bolao={bolao} torneio={torneio} eu={eu} />}
        <button className="btn w sm" onClick={onVoltar}>Meus bolões</button>
      </div>
    </div>
  )
}

function LadosDoJogo({ torneio, jogo, placar }: { torneio: Torneio; jogo: JogoTorneio; placar: string }) {
  const casa = descreverOrigem(torneio, jogo.casa)
  const fora = descreverOrigem(torneio, jogo.fora)
  return (
    <>
      {casa.time && <Camisa cor={casa.time.cor} uniforme={casa.time.uniforme} tamanho={18} />}
      <span className="nome" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: casa.time ? undefined : 'var(--mut)' }}>{casa.nome}</span>
      <span className="led num" style={{ fontSize: 18, padding: '3px 8px', boxShadow: 'none', borderWidth: 1, flex: 'none' }}>{placar}</span>
      <span className="nome" style={{ textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: fora.time ? undefined : 'var(--mut)' }}>{fora.nome}</span>
      {fora.time && <Camisa cor={fora.time.cor} uniforme={fora.time.uniforme} tamanho={18} />}
    </>
  )
}

const SELO: Record<string, React.CSSProperties> = {
  palpitar: { background: 'var(--amarelo)' },
  feito: { background: '#e7f3e6', color: 'var(--verde)', borderColor: 'var(--verde)' },
  apagado: { background: '#eef0ea', color: 'var(--mut)', borderColor: '#c9d1bc' },
  pontos: { background: 'var(--verde)', color: '#fff' },
}
const selo = (estilo: keyof typeof SELO, texto: string) => (
  <span className="num" style={{ flex: 'none', minWidth: 62, height: 30, borderRadius: 4, border: '2px solid var(--borda)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, textTransform: 'uppercase', padding: '0 6px', color: 'var(--navy)', ...SELO[estilo] }}>{texto}</span>
)

function AbaJogos({ bolao, torneio, eu, onAbrir }: { bolao: BolaoHook; torneio: Torneio; eu: string; onAbrir: (jogo: string) => void }) {
  const meu = (jogoId: string) => bolao.meus?.[jogoId] ?? bolao.palpitesDosJogos[jogoId]?.[eu]
  const aoVivo = [...torneio.emAndamento].sort((primeiro, segundo) => primeiro.campo - segundo.campo)
  const variosCampos = torneio.regras.campos > 1
  // as rodadas na ordem do torneio (a mais nova em cima: o que dá para palpitar primeiro)
  const rodadas: { nome: string; jogos: JogoTorneio[] }[] = []
  for (const jogo of torneio.jogos) {
    const nome = nomeDoJogo(torneio, jogo).split(' · ')[0]
    const grupo = rodadas.find((rodada) => rodada.nome === nome)
    if (grupo) grupo.jogos.push(jogo)
    else rodadas.push({ nome, jogos: [jogo] })
  }
  const pendentes = rodadas.filter((rodada) => rodada.jogos.some((jogo) => !jogo.resultado))
  const acabadas = rodadas.filter((rodada) => rodada.jogos.every((jogo) => jogo.resultado)).reverse()
  if (!torneio.sorteado) return <div className="panel pb mut" style={{ color: 'var(--navy)' }}>Os jogos aparecem aqui assim que o organizador sortear o torneio.</div>
  return (
    <>
      {aoVivo.map((partida) => {
        const jogo = torneio.jogos.find((item) => item.id === partida.jogoId)
        if (!jogo) return null
        const palpite = meu(jogo.id)
        const conta = palpite ? pontosDoJogo(palpite, situacaoDoJogo(torneio, jogo.id)!) : null
        return (
          <button key={partida.jogoId} className="panel destaque" style={{ display: 'grid', gap: 8, padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => onAbrir(jogo.id)}>
            <span className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tag t-ok">● Ao vivo{variosCampos ? ` · Campo ${partida.campo}` : ''}</span>
              <span className="mut" style={{ fontSize: 13, fontWeight: 700 }}>{nomeDoJogo(torneio, jogo)}</span>
            </span>
            <span className="row" style={{ gap: 6, fontSize: 15, fontWeight: 700 }}><LadosDoJogo torneio={torneio} jogo={jogo} placar={`${partida.placar[0]}-${partida.placar[1]}`} /></span>
            <span className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 700, background: 'var(--zebra)', borderRadius: 4, padding: '6px 8px', color: palpite ? 'var(--navy)' : 'var(--mut)' }}>
              <span>{palpite ? `🔒 Seu palpite: ${palpite.placar[0]}-${palpite.placar[1]}` : 'Você não palpitou neste jogo'}</span>
              <span style={{ color: conta?.total ? 'var(--verde)' : undefined }}>{conta ? `+${conta.total} até agora` : '0'}</span>
            </span>
            <span className="tag t-y" style={{ justifySelf: 'end' }}>Abrir →</span>
          </button>
        )
      })}
      {[...pendentes, ...acabadas].map((rodada) => {
        const pontosDaRodada = rodada.jogos.reduce((soma, jogo) => {
          const palpite = meu(jogo.id)
          const situacao = situacaoDoJogo(torneio, jogo.id)
          return soma + (palpite && situacao ? pontosDoJogo(palpite, situacao).total : 0)
        }, 0)
        const todosAcabaram = rodada.jogos.every((jogo) => jogo.resultado)
        const algumAberto = rodada.jogos.some((jogo) => !palpiteDoJogoFechado(torneio, jogo.id))
        return (
          <section key={rodada.nome} className="panel">
            <div className="ph">{rodada.nome}<span className="sub">{todosAcabaram ? `+${pontosDaRodada} pts` : algumAberto ? 'palpites abertos' : 'em andamento'}</span></div>
            {rodada.jogos.map((jogo) => {
              const ids = timesDoJogo(torneio, jogo)
              const definido = !!ids.A && !!ids.B
              const situacao = situacaoDoJogo(torneio, jogo.id)
              const palpite = meu(jogo.id)
              const placar = jogo.resultado ? `${jogo.resultado.placar[0]}-${jogo.resultado.placar[1]}` : situacao ? `${situacao.placar[0]}-${situacao.placar[1]}` : 'x'
              const estado = !definido ? selo('apagado', 'A definir')
                : jogo.resultado ? (palpite ? (() => { const conta = pontosDoJogo(palpite, situacao!); return selo(conta.total ? 'pontos' : 'apagado', `${conta.cravou ? '🎯 ' : ''}${conta.total ? `+${conta.total}` : '0'}`) })() : selo('apagado', '—'))
                : situacao ? <span className="tag t-ok">ao vivo</span>
                : palpite ? selo('feito', `✓ ${palpite.placar[0]}-${palpite.placar[1]}`)
                : selo('palpitar', 'Palpitar')
              return (
                <button key={jogo.id} className="tr" style={{ width: '100%', border: 0, minHeight: 50, fontSize: 14, gap: 6, font: 'inherit', cursor: definido ? 'pointer' : 'default', color: 'var(--navy)', textAlign: 'left' }}
                  disabled={!definido} onClick={() => onAbrir(jogo.id)}>
                  <LadosDoJogo torneio={torneio} jogo={jogo} placar={placar} />{estado}
                </button>
              )
            })}
          </section>
        )
      })}
    </>
  )
}

type CampoDoTorneio = 'campeao' | 'vice' | 'artilheiro' | 'garcom' | 'maisCartoes'
const CAMPOS: { campo: CampoDoTorneio; rotulo: string; icone: string; deTime: boolean }[] = [
  { campo: 'campeao', rotulo: 'Campeão', icone: '🏆', deTime: true },
  { campo: 'vice', rotulo: 'Vice', icone: '🥈', deTime: true },
  { campo: 'artilheiro', rotulo: 'Artilheiro', icone: '⚽', deTime: false },
  { campo: 'garcom', rotulo: 'Garçom', icone: '🎯', deTime: false },
  { campo: 'maisCartoes', rotulo: 'Mais cartões', icone: '🟨', deTime: false },
]

function AbaTorneio({ bolao, torneio }: { bolao: BolaoHook; torneio: Torneio }) {
  const fechado = palpiteDoTorneioFechado(torneio)
  const vazio: PalpiteDoTorneio = { campeao: null, vice: null, artilheiro: null, garcom: null, maisCartoes: null, em: 0 }
  const [palpite, setPalpite] = useState<PalpiteDoTorneio>(bolao.meuDoTorneio ?? vazio)
  useEffect(() => { if (bolao.meuDoTorneio) setPalpite(bolao.meuDoTorneio) }, [bolao.meuDoTorneio])
  const [escolhendo, setEscolhendo] = useState<CampoDoTorneio | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const campos = CAMPOS.filter((item) => item.campo !== 'garcom' || torneio.regras.assistencias)
  const respostas = respostasDoTorneio(torneio)
  const pontos = pontosDoTorneio(bolao.meuDoTorneio ?? undefined, respostas)
  const jogadores = torneio.times.flatMap((time) => time.jogadores.map((jogador) => ({ ...jogador, time })))
  const nomeDe = (campo: CampoDoTorneio, id: string | null) => !id ? null
    : CAMPOS.find((item) => item.campo === campo)!.deTime ? torneio.times.find((time) => time.id === id)?.nome ?? '—'
    : jogadores.find((jogador) => jogador.id === id)?.nome ?? '—'
  const mudou = JSON.stringify({ ...palpite, em: 0 }) !== JSON.stringify({ ...(bolao.meuDoTorneio ?? vazio), em: 0 })
  const salvar = async () => {
    setSalvando(true)
    setAviso(null)
    try {
      await bolao.salvarPalpiteDoTorneio({ ...palpite, em: Date.now() })
      setAviso('Palpites do torneio salvos!')
    } catch {
      setAviso(palpiteDoTorneioFechado(torneio) ? 'O torneio já começou: esses palpites fecharam.' : 'Não deu para salvar. Confira a internet.')
    } finally {
      setSalvando(false)
    }
  }
  const escolher = (id: string | null) => { if (escolhendo) setPalpite({ ...palpite, [escolhendo]: id }); setEscolhendo(null) }
  const opcoes = escolhendo && CAMPOS.find((item) => item.campo === escolhendo)!.deTime
  return (
    <section className="panel">
      <div className="ph">Palpites do torneio<span className="sub">{fechado ? '🔒 fechados' : '🔒 fecham no 1º jogo'}</span></div>
      {campos.map((item) => {
        const escolha = nomeDe(item.campo, palpite[item.campo])
        return (
          <button key={item.campo} className="tr" style={{ width: '100%', border: 0, minHeight: 46, font: 'inherit', color: 'var(--navy)', textAlign: 'left', gap: 8, cursor: fechado ? 'default' : 'pointer' }}
            disabled={fechado} onClick={() => setEscolhendo(item.campo)}>
            <span>{item.icone}</span><span className="nome">{item.rotulo}</span>
            <span style={{ fontWeight: 700, color: escolha ? 'var(--navy)' : 'var(--mut)' }}>{escolha ?? (fechado ? '—' : 'Escolher ▾')}</span>
            <span className="mut" style={{ fontSize: 12, fontWeight: 700, width: 46, textAlign: 'right', color: respostas && pontos[item.campo] ? 'var(--verde)' : undefined }}>
              {respostas ? (pontos[item.campo] ? `+${pontos[item.campo]}` : '0') : `${PONTOS_DO_BOLAO[item.campo]} pts`}
            </span>
          </button>
        )
      })}
      <div className="pb" style={{ display: 'grid', gap: 8 }}>
        {aviso && <div role="status" style={{ fontWeight: 700, textAlign: 'center', color: aviso.endsWith('salvos!') ? 'var(--verde)' : 'var(--vermelho)' }}>{aviso}</div>}
        {!fechado && <button className="btn" disabled={!mudou || salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar palpites do torneio'}</button>}
        {fechado && !respostas && <div className="mut" style={{ fontSize: 13 }}>Os pontos destes palpites entram quando o torneio acabar.</div>}
        {respostas && <div className="num" style={{ textAlign: 'center', fontSize: 20, color: 'var(--navy)' }}>+{pontos.total} pts no torneio</div>}
      </div>
      {escolhendo && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Escolher" onClick={() => setEscolhendo(null)}>
          <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .9)', overflowY: 'auto' }}>
            <div className="ph">{CAMPOS.find((item) => item.campo === escolhendo)!.rotulo}</div>
            <div className="pb" style={{ display: 'grid', gap: 6 }}>
              {opcoes
                ? torneio.times.map((time) => (
                    <button key={time.id} className="btn w sm" style={{ textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => escolher(time.id)}>
                      <Camisa cor={time.cor} uniforme={time.uniforme} tamanho={20} /> {time.nome}
                    </button>
                  ))
                : torneio.times.map((time) => (
                    <div key={time.id} style={{ display: 'grid', gap: 4 }}>
                      <div className="mut row" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, gap: 6, textTransform: 'uppercase' }}><Camisa cor={time.cor} uniforme={time.uniforme} tamanho={16} />{time.nome}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {time.jogadores.map((jogador) => <button key={jogador.id} className="btn w sm" style={{ textTransform: 'none', minWidth: 0 }} onClick={() => escolher(jogador.id)}>{jogador.nome}</button>)}
                      </div>
                    </div>
                  ))}
              <button className="btn w sm" onClick={() => escolher(null)}>Tirar a escolha</button>
              <button className="btn w sm" onClick={() => setEscolhendo(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

// quem não tem foto: as iniciais numa cor que é sempre a mesma para a mesma conta
const CORES_DAS_PESSOAS = ['#1e5fbf', '#c8352b', '#2e9e44', '#6a1b9a', '#d9822b', '#00838f', '#5d4037', '#ad1457']
const corDaPessoa = (uid: string) => CORES_DAS_PESSOAS[[...uid].reduce((soma, letra) => soma + letra.charCodeAt(0), 0) % CORES_DAS_PESSOAS.length]

function AbaRanking({ bolao, torneio, eu }: { bolao: BolaoHook; torneio: Torneio; eu: string }) {
  const fotos = useFotosDasContas(bolao.ranking.map((linha) => linha.uid))
  const [aviso, setAviso] = useState<string | null>(null)
  const iniciais = (nome: string) => nome.split(/\s+/).map((parte) => parte[0]).join('').slice(0, 2).toUpperCase()
  const foto = (uid: string, nome: string, tamanho: number) => fotos[uid]
    ? <img src={fotos[uid]} alt="" style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--borda)', background: '#fff', flex: 'none' }} />
    : <span className="num" style={{ width: tamanho, height: tamanho, borderRadius: '50%', background: corDaPessoa(uid), color: '#fff', display: 'grid', placeItems: 'center', fontSize: tamanho * 0.4, border: '2px solid var(--borda)', flex: 'none' }}>{iniciais(nome)}</span>
  const compartilhar = async () => {
    const topo = bolao.ranking.slice(0, 10).map((linha) => `${linha.posicao}º ${linha.nome} · ${linha.pontos} pts`).join('\n')
    const texto = `🎯 Bolão · ${torneio.nome}\n${topo}\n\nEntre e palpite: ${linkDoBolao(torneio.codigoDoBolao ?? torneio.nuvem?.codigo ?? '')}`
    if (!(await compartilharTexto({ text: texto }))) { await navigator.clipboard.writeText(texto).catch(() => null); setAviso('Ranking copiado! É só colar no grupo.') }
  }
  const podio = bolao.ranking.slice(0, 3)
  return (
    <>
      <section className="panel">
        {podio.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'end', gap: 6, padding: '12px 10px 0', background: 'var(--navy)' }}>
            {[podio[1], podio[0], podio[2]].map((linha, indice) => linha ? (
              <div key={linha.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}>
                {indice === 1 && <span style={{ fontSize: 22 }}>👑</span>}
                {foto(linha.uid, linha.nome, indice === 1 ? 44 : 36)}
                <span style={{ fontWeight: 700, fontSize: 13, textAlign: 'center', lineHeight: 1.1 }}>{linha.uid === eu ? 'Você' : linha.nome.split(' ')[0]}</span>
                <span style={{ fontSize: 12, color: 'var(--texto-no-escuro)', fontWeight: 600 }}>{linha.pontos} pts</span>
                <span className="num" style={{ width: '100%', background: 'var(--amarelo)', color: 'var(--navy)', borderRadius: '4px 4px 0 0', display: 'grid', placeItems: 'center', fontSize: 26, height: indice === 1 ? 74 : indice === 0 ? 54 : 40 }}>{linha.posicao}</span>
              </div>
            ) : <div key={indice} />)}
          </div>
        )}
        <div className="ph">Classificação<span className="sub">pts · cravados</span></div>
        {bolao.ranking.length === 0 && <div className="pb mut">Ninguém entrou no bolão ainda.</div>}
        {bolao.ranking.map((linha) => (
          <div key={linha.uid} className="tr" style={{ minHeight: 50, gap: 8, ...(linha.uid === eu && { background: 'var(--amarelo-claro)', boxShadow: 'inset 4px 0 0 var(--amarelo)' }) }}>
            <span className="num" style={{ width: 26, textAlign: 'center', fontSize: 20 }}>{linha.posicao}</span>
            {foto(linha.uid, linha.nome, 34)}
            <span className="nome">{linha.uid === eu ? 'Você' : linha.nome}</span>
            <span className="mut" style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{linha.cravados} 🎯</span>
            <span className="num" style={{ fontSize: 22, minWidth: 36, textAlign: 'right' }}>{linha.pontos}</span>
          </div>
        ))}
        <div className="pb mut" style={{ fontSize: 13, display: 'grid', gap: 6 }}>
          <span>Empate nos pontos: na frente quem cravou mais placares; depois, quem entrou primeiro no bolão.</span>
          <b style={{ color: 'var(--navy)' }}>Brincadeira sem valor. Prêmios, se houver, são do organizador. Apple e Google não patrocinam.</b>
        </div>
      </section>
      {aviso && <div role="status" className="panel pb" style={{ fontWeight: 700, textAlign: 'center', color: 'var(--navy)' }}>{aviso}</div>}
      <button className="btn" onClick={() => void compartilhar()}>Compartilhar ranking</button>
    </>
  )
}
