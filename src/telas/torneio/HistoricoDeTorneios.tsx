// Histórico de torneios (PLANO.md, seção 24): os torneios encerrados de quem organizou, jogou com a conta ou entrou no
// bolão. Fica na conta de cada um: continua aqui mesmo se o organizador apagar o torneio.

import { useState, type ReactNode } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import { euNoTorneio, nomeDoGrupo, numerosDoHistorico, type Colocacao, type DestaqueNoHistorico, type TorneioNoHistorico } from '../../logic/torneio'
import { useConta } from '../../store/conta'
import { useTorneiosEncerrados } from '../../store/historicoDeTorneios'
import { compartilharTexto } from '../../utils/nativo'
import { useVoltar } from '../../utils/voltar'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesEAno = (data: number) => { const dia = new Date(data); return `${MESES[dia.getMonth()]} ${dia.getFullYear()}` }
const diaEMes = (data: number) => { const dia = new Date(data); return `${dia.getDate()} de ${MESES[dia.getMonth()]}` }
const quantos = (numero: number, um: string, varios: string) => `${numero} ${numero === 1 ? um : varios}`
const linha = { width: '100%', border: 0, padding: '8px 12px', textAlign: 'left' as const, cursor: 'pointer', font: 'inherit', color: 'var(--navy)', gap: 10 }
const nomeGrande = { display: 'block', fontSize: 20, lineHeight: 1.1, textTransform: 'uppercase' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }
const TEXTO_DA_COLOCACAO: Record<Exclude<Colocacao, null>, string> = { campeao: 'Campeão', vice: '2º lugar', terceiro: '3º lugar' }

const timeDe = (torneio: TorneioNoHistorico, id: string | null) => torneio.times.find((time) => time.id === id) ?? null

export function HistoricoDeTorneios() {
  const conta = useConta()
  const torneios = useTorneiosEncerrados()
  const [aberto, setAberto] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'jogou' | 'organizou'>('todos')
  useVoltar(!!aberto, () => setAberto(null))
  const eu = conta.perfil?.uid ?? ''
  const torneioAberto = torneios?.find((torneio) => torneio.id === aberto)
  if (torneioAberto) return <TorneioAberto torneio={torneioAberto} eu={eu} onVoltar={() => setAberto(null)} />

  const lista = torneios ?? []
  const numeros = numerosDoHistorico(lista, eu)
  const filtrados = lista.filter((torneio) => {
    const meu = euNoTorneio(torneio, eu)
    return filtro === 'todos' || (filtro === 'jogou' ? !!meu.jogador : meu.organizou)
  })
  const anos = [...new Set(filtrados.map((torneio) => new Date(torneio.data).getFullYear()))]

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Histórico" sub={`Torneios encerrados · ${lista.length}`} />
      <div className="conteudo">
        {torneios === null && <div className="vazio">Carregando…</div>}
        {torneios !== null && lista.length === 0 && (
          <div className="vazio">Nenhum torneio encerrado ainda. Quando um torneio em que você organizou, jogou ou palpitou terminar, o resumo vem para cá.</div>
        )}
        {lista.length > 0 && (
          <>
            <section className="panel">
              <div className="ph">Seus números<span className="sub">em torneios</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <Numero valor={numeros.torneios} rotulo={numeros.torneios === 1 ? 'torneio' : 'torneios'} />
                <Numero valor={<span className="row" style={{ gap: 4, justifyContent: 'center' }}><Icone nome="trofeu" tamanho={22} />{numeros.titulos}</span>} rotulo={numeros.titulos === 1 ? 'título' : 'títulos'} />
                <Numero valor={numeros.gols} rotulo="gols" />
                <Numero valor={numeros.melhorBolao ? `${numeros.melhorBolao}º` : '—'} rotulo="melhor bolão" />
              </div>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button className={'chip' + (filtro === 'todos' ? ' on' : '')} onClick={() => setFiltro('todos')}>Todos</button>
              <button className={'chip' + (filtro === 'jogou' ? ' on' : '')} onClick={() => setFiltro('jogou')}>Joguei</button>
              <button className={'chip' + (filtro === 'organizou' ? ' on' : '')} onClick={() => setFiltro('organizou')}>Organizei</button>
            </div>
            {filtrados.length === 0 && <div className="vazio">Nenhum torneio aqui.</div>}
            {anos.map((ano) => {
              const doAno = filtrados.filter((torneio) => new Date(torneio.data).getFullYear() === ano)
              return (
                <section key={ano} className="panel">
                  <div className="ph">{ano}<span className="sub">{quantos(doAno.length, 'torneio', 'torneios')}</span></div>
                  {doAno.map((torneio) => <LinhaDoTorneio key={torneio.id} torneio={torneio} eu={eu} onAbrir={() => setAberto(torneio.id)} />)}
                </section>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: ReactNode; rotulo: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
      <div className="num" style={{ fontSize: 28, lineHeight: 1 }}>{valor}</div>
      <div className="mut" style={{ fontSize: 12 }}>{rotulo}</div>
    </div>
  )
}

function LinhaDoTorneio({ torneio, eu, onAbrir }: { torneio: TorneioNoHistorico; eu: string; onAbrir: () => void }) {
  const campeao = timeDe(torneio, torneio.podio[0])
  const meu = euNoTorneio(torneio, eu)
  const papel = meu.time ? `Jogou pelo ${meu.time.nome}` : meu.organizou ? 'Organizou' : 'Bolão'
  const detalhes = [mesEAno(torneio.data), papel, meu.jogador?.gols ? quantos(meu.jogador.gols, 'gol', 'gols') : null,
    meu.bolao ? `${meu.bolao.posicao}º no bolão · ${meu.bolao.pontos} pts` : null].filter(Boolean).join(' · ')
  return (
    <button className="tr" style={{ ...linha, minHeight: 72 }} onClick={onAbrir}>
      <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 5, background: 'var(--navy)', display: 'grid', placeItems: 'center', border: '2px solid var(--borda)' }}>
        <Camisa cor={campeao?.cor ?? '#888'} uniforme={campeao?.uniforme} tamanho={30} contorno="#fff" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="num" style={nomeGrande}>{torneio.nome}</span>
        <span className="row" style={{ gap: 4, fontSize: 13, fontWeight: 600 }}><Icone nome="trofeu" tamanho={14} />{campeao?.nome}</span>
        <span className="mut" style={{ display: 'block', fontSize: 12 }}>{detalhes}</span>
      </span>
      {meu.colocacao && <span className={'tag ' + (meu.colocacao === 'campeao' ? 't-ok' : 't-y')} style={{ flex: 'none' }}>{TEXTO_DA_COLOCACAO[meu.colocacao]}</span>}
    </button>
  )
}

function Cartoes({ amarelos, vermelhos, tamanho = 16 }: { amarelos: number; vermelhos: number; tamanho?: number }) {
  return (
    <span className="row" style={{ gap: 8, justifyContent: 'center' }}>
      {(amarelos > 0 || vermelhos === 0) && <span className="row" style={{ gap: 3 }}><Cartao cor="amarelo" tamanho={tamanho} />{amarelos}</span>}
      {vermelhos > 0 && <span className="row" style={{ gap: 3 }}><Cartao cor="vermelho" tamanho={tamanho} />{vermelhos}</span>}
    </span>
  )
}

function TorneioAberto({ torneio, eu, onVoltar }: { torneio: TorneioNoHistorico; eu: string; onVoltar: () => void }) {
  const meu = euNoTorneio(torneio, eu)
  const [aba, setAba] = useState<'resumo' | 'jogos' | 'eu'>('resumo')
  const campeao = timeDe(torneio, torneio.podio[0])
  const vice = timeDe(torneio, torneio.podio[1] ?? null)
  const temEu = !!meu.jogador || !!meu.bolao
  const final = torneio.final
  const placarDaFinal = final ? `${final.placar[0]} x ${final.placar[1]}${final.penaltis ? ` (${final.penaltis[0]} x ${final.penaltis[1]} nos pênaltis)` : ''}` : null

  const compartilhar = () => {
    const destaques = [
      torneio.artilheiro && `⚽ Artilheiro: ${torneio.artilheiro.nome} (${quantos(torneio.artilheiro.valor, 'gol', 'gols')})`,
      torneio.garcom && `🎯 Garçom: ${torneio.garcom.nome} (${torneio.garcom.valor})`,
      torneio.luva && `🧤 Goleiro menos vazado: ${torneio.luva.nome}`,
      torneio.bolao?.primeiros[0] && `🔮 Bolão: ${torneio.bolao.primeiros[0].nome} (${torneio.bolao.primeiros[0].pontos} pts)`,
    ].filter(Boolean)
    void compartilharTexto({
      title: torneio.nome,
      text: [`🏆 ${torneio.nome}`, `Campeão: ${campeao?.nome}${placarDaFinal && vice ? ` · final ${placarDaFinal} ${vice.nome}` : ''}`,
        ...torneio.podio.slice(1).map((id, indice) => `${indice + 2}º ${timeDe(torneio, id)?.nome}`), '', ...destaques].join('\n'),
    })
  }

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo={torneio.nome} sub={`Encerrado · ${diaEMes(torneio.data)} · ${quantos(torneio.times.length, 'time', 'times')} · ${quantos(torneio.jogos.length, 'jogo', 'jogos')}`} />
      <div className="conteudo">
        <section className="led num" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: 16, color: 'var(--texto-no-escuro)', letterSpacing: 1 }}>CAMPEÃO</div>
          <div className="row" style={{ justifyContent: 'center', gap: 10, fontSize: 30, textTransform: 'uppercase' }}><Icone nome="trofeu" tamanho={30} />{campeao?.nome}</div>
          {placarDaFinal && vice && <div style={{ fontSize: 15, color: 'var(--texto-no-escuro)' }}>Final: {placarDaFinal} {vice.nome}</div>}
        </section>
        <div style={{ display: 'grid', gridTemplateColumns: temEu ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
          <button className={'chip' + (aba === 'resumo' ? ' on' : '')} onClick={() => setAba('resumo')}>Resumo</button>
          <button className={'chip' + (aba === 'jogos' ? ' on' : '')} onClick={() => setAba('jogos')}>Jogos</button>
          {temEu && <button className={'chip' + (aba === 'eu' ? ' on' : '')} onClick={() => setAba('eu')}>Eu</button>}
        </div>

        {aba === 'resumo' && (
          <>
            <section className="panel">
              <div className="ph">Pódio</div>
              {torneio.podio.map((id, indice) => {
                const time = timeDe(torneio, id)
                return (
                  <div key={id} className="tr" style={{ minHeight: 46, gap: 10 }}>
                    <span className="num" style={{ width: 30, fontSize: 20 }}>{indice + 1}º</span>
                    <Camisa cor={time?.cor ?? '#888'} uniforme={time?.uniforme} tamanho={22} />
                    <span className="nome" style={{ fontWeight: 700 }}>{time?.nome}</span>
                  </div>
                )
              })}
            </section>
            {(torneio.artilheiro || torneio.garcom || torneio.luva || torneio.cartoes || torneio.melhor) && (
              <section className="panel">
                <div className="ph">Destaques</div>
                {torneio.melhor && <Destaque torneio={torneio} titulo="Melhor do torneio" nome={torneio.melhor.nome} time={torneio.melhor.time} valor={<Icone nome="trofeu" tamanho={20} />} />}
                {torneio.artilheiro && <Destaque torneio={torneio} titulo="Artilheiro" {...nomeETime(torneio.artilheiro)} valor={quantos(torneio.artilheiro.valor, 'gol', 'gols')} />}
                {torneio.garcom && <Destaque torneio={torneio} titulo="Garçom" {...nomeETime(torneio.garcom)} valor={`${torneio.garcom.valor} assist.`} />}
                {torneio.luva && <Destaque torneio={torneio} titulo="Goleiro menos vazado" {...nomeETime(torneio.luva)}
                  valor={`${(torneio.luva.valor / (torneio.luva.segundo || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por jogo`} />}
                {torneio.cartoes && <Destaque torneio={torneio} titulo="Mais cartões" {...nomeETime(torneio.cartoes)}
                  valor={<Cartoes amarelos={torneio.cartoes.valor} vermelhos={torneio.cartoes.segundo ?? 0} />} />}
              </section>
            )}
            {torneio.bolao && (
              <section className="panel">
                <div className="ph">Bolão<span className="sub">{quantos(torneio.bolao.participantes, 'participante', 'participantes')}</span></div>
                {torneio.bolao.primeiros.map((linhaDoBolao) => (
                  <div key={`${linhaDoBolao.posicao}-${linhaDoBolao.nome}`} className="tr" style={{ minHeight: 44, gap: 10 }}>
                    <span className="num" style={{ width: 30, fontSize: 18 }}>{linhaDoBolao.posicao === 1 ? <Icone nome="trofeu" tamanho={20} /> : `${linhaDoBolao.posicao}º`}</span>
                    <span className="nome" style={{ fontWeight: 700 }}>{linhaDoBolao.nome}</span>
                    <span className="num" style={{ fontSize: 18 }}>{linhaDoBolao.pontos} pts</span>
                  </div>
                ))}
                {meu.bolao && meu.bolao.posicao > 3 && (
                  <div className="tr" style={{ minHeight: 44, gap: 10, background: '#FFF6CC' }}>
                    <span className="num" style={{ width: 30, fontSize: 18 }}>{meu.bolao.posicao}º</span>
                    <span className="nome" style={{ fontWeight: 700 }}>Você</span>
                    <span className="num" style={{ fontSize: 18 }}>{meu.bolao.pontos} pts</span>
                  </div>
                )}
              </section>
            )}
            <button className="btn w" onClick={compartilhar}>Compartilhar o resumo</button>
          </>
        )}

        {aba === 'jogos' && <JogosDoTorneio torneio={torneio} />}

        {aba === 'eu' && (
          <>
            {meu.jogador && meu.time && (
              <section className="panel">
                <div className="ph">Você no torneio</div>
                <div className="tr" style={{ minHeight: 56, gap: 10 }}>
                  <Camisa cor={meu.time.cor} uniforme={meu.time.uniforme} tamanho={30} numero={meu.jogador.camisa} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="num" style={nomeGrande}>{meu.time.nome}</span>
                    <span className="mut" style={{ fontSize: 13 }}>{[meu.colocacao ? TEXTO_DA_COLOCACAO[meu.colocacao] : null, meu.jogador.camisa !== undefined ? `camisa ${meu.jogador.camisa}` : null].filter(Boolean).join(' · ') || 'Jogou o torneio'}</span>
                  </span>
                  {meu.colocacao && <span className={'tag ' + (meu.colocacao === 'campeao' ? 't-ok' : 't-y')}>{TEXTO_DA_COLOCACAO[meu.colocacao]}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <Numero valor={meu.jogador.jogos} rotulo={meu.jogador.jogos === 1 ? 'jogo' : 'jogos'} />
                  <Numero valor={meu.jogador.gols} rotulo="gols" />
                  <Numero valor={meu.jogador.assistencias} rotulo="assist." />
                  <Numero valor={<Cartoes amarelos={meu.jogador.amarelos} vermelhos={meu.jogador.vermelhos} tamanho={20} />} rotulo="cartões" />
                </div>
              </section>
            )}
            {meu.bolao && torneio.bolao && (
              <section className="panel">
                <div className="ph">Seu bolão<span className="sub">{meu.bolao.posicao}º de {torneio.bolao.participantes}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <Numero valor={meu.bolao.pontos} rotulo="pontos" />
                  <Numero valor={meu.bolao.cravados} rotulo={meu.bolao.cravados === 1 ? 'cravado' : 'cravados'} />
                  <Numero valor={meu.bolao.campeao ? <Icone nome="certo" tamanho={26} /> : '—'} rotulo={meu.bolao.campeao ? 'acertou o campeão' : 'errou o campeão'} />
                </div>
              </section>
            )}
          </>
        )}
        <button className="btn w sm" onClick={onVoltar}>Voltar aos torneios</button>
      </div>
    </div>
  )
}

const nomeETime = (destaque: DestaqueNoHistorico) => ({ nome: destaque.nome, time: destaque.time })

function Destaque({ torneio, titulo, nome, time, valor }: { torneio: TorneioNoHistorico; titulo: string; nome: string; time: string; valor: ReactNode }) {
  const doTime = timeDe(torneio, time)
  return (
    <div className="tr" style={{ minHeight: 52, gap: 10 }}>
      <Camisa cor={doTime?.cor ?? '#888'} uniforme={doTime?.uniforme} tamanho={22} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="mut" style={{ display: 'block', fontSize: 12 }}>{titulo}</span>
        <span style={{ fontWeight: 700 }}>{nome}</span>{doTime && <span className="mut" style={{ fontSize: 13 }}> · {doTime.nome}</span>}
      </span>
      <span className="num" style={{ fontSize: 18, flex: 'none' }}>{valor}</span>
    </div>
  )
}

/** Os jogos por fase: o mata-mata primeiro (da final para trás), depois os grupos ou as rodadas. */
function JogosDoTorneio({ torneio }: { torneio: TorneioNoHistorico }) {
  const blocos: { titulo: string; jogos: TorneioNoHistorico['jogos'] }[] = []
  const juntar = (titulo: string, jogo: TorneioNoHistorico['jogos'][number]) => {
    const bloco = blocos.find((item) => item.titulo === titulo)
    if (bloco) bloco.jogos.push(jogo)
    else blocos.push({ titulo, jogos: [jogo] })
  }
  for (const jogo of [...torneio.jogos].reverse()) if (jogo.fase === 'mata') juntar(jogo.rodada, jogo)
  for (const jogo of torneio.jogos) if (jogo.fase !== 'mata') juntar(jogo.fase === 'grupo' && jogo.grupo !== null ? nomeDoGrupo(jogo.grupo) : jogo.rodada, jogo)
  return (
    <>
      {blocos.map((bloco) => (
        <section key={bloco.titulo} className="panel">
          <div className="ph">{bloco.titulo}<span className="sub">{quantos(bloco.jogos.length, 'jogo', 'jogos')}</span></div>
          {bloco.jogos.map((jogo, indice) => {
            const casa = timeDe(torneio, jogo.casa)
            const fora = timeDe(torneio, jogo.fora)
            return (
              <div key={indice} className="tr" style={{ minHeight: 46, fontSize: 14 }}>
                <Camisa cor={casa?.cor ?? '#888'} uniforme={casa?.uniforme} tamanho={18} />
                <span className="nome">{casa?.nome ?? '—'}</span>
                <span className="led num" style={{ fontSize: 18, padding: '3px 8px', boxShadow: 'none', borderWidth: 1, flex: 'none' }}>
                  {jogo.placar[0]}-{jogo.placar[1]}{jogo.penaltis ? ` (${jogo.penaltis[0]}-${jogo.penaltis[1]})` : ''}
                </span>
                <span className="nome" style={{ textAlign: 'right' }}>{fora?.nome ?? '—'}</span>
                <Camisa cor={fora?.cor ?? '#888'} uniforme={fora?.uniforme} tamanho={18} />
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}
