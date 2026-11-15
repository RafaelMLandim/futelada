import { useEffect, useState, type FormEvent } from 'react'
import { LuvaDoGoleiro } from '../../components/LuvaDoGoleiro'
import { Barra } from '../../components/Barra'
import { NomeDoJogador } from '../../components/Bracadeira'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { novoCodigo, vagasDaInscricao } from '../../logic/torneio'
import { obterNuvem } from '../../nuvem'
import { ENDERECO_NA_LOJA } from '../../store/compras'
import { primeiroNome, useDadosDoJogador } from '../../store/carta'
import { useConta } from '../../store/conta'
import { linkDaInscricao } from '../../store/inscricaoDoTorneio'
import { abrirParaAcompanhar } from '../../store/torneio'
import type { InscricaoDoTorneio, TimeInscrito } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { CORES_TORNEIO, textoSobre } from '../../utils/cores'
import { maiusculas } from '../../utils/formatar'
import { abrirLink, compartilharTexto, nativo } from '../../utils/nativo'
import { Login } from '../Login'

const celularAndroid = () => /android/i.test(navigator.userAgent)

/**
 * Página do link de inscrição do torneio (PLANO.md, seção 22). Sem `time`: o capitão inscreve o time (com a conta).
 * Com `time`: o link do time, onde os jogadores entram com a conta ou só com o nome.
 */
export function InscricaoNoTorneio({ codigo, time: timeDoLink }: { codigo: string; time: string | null }) {
  const conta = useConta()
  const [timeAberto, setTimeAberto] = useState(timeDoLink)
  const [link, setLink] = useState<InscricaoDoTorneio | null | undefined>(undefined)
  const [times, setTimes] = useState<TimeInscrito[]>([])
  const [eu, setEu] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [erroAoAbrir, setErroAoAbrir] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [chamadaFechada, setChamadaFechada] = useState(false)

  useEffect(() => {
    let parar = () => {}
    let vivo = true
    let tentouDeNovo = false
    const falhou = (erro: unknown) => {
      if (!vivo) return
      parar()
      // tenta mais uma vez sozinho antes de mostrar o erro
      if (!tentouDeNovo) { tentouDeNovo = true; window.setTimeout(abrir, 1500); return }
      setErroAoAbrir((erro as { code?: string })?.code ?? String((erro as Error)?.message ?? erro))
    }
    const abrir = () => void obterNuvem().then(async (nuvem) => {
      if (!nuvem) return setLink(null)
      const id = await nuvem.usuario()
      if (!vivo) return
      setEu(id)
      parar = nuvem.ouvirInscricao(codigo, (dados, inscritos) => { setErroAoAbrir(null); setLink(dados); setTimes(inscritos) }, falhou)
    }).catch(falhou)
    abrir()
    return () => { vivo = false; parar() }
  }, [codigo, conta.perfil?.uid, tentativa])

  const abrirTime = (id: string | null) => {
    setTimeAberto(id)
    history.replaceState(null, '', `/?inscricao=${codigo}${id ? `&time=${id}` : ''}`)
  }

  if (entrando && !conta.logado) return <Login conta={conta} onVoltar={() => setEntrando(false)} />
  const time = timeAberto ? times.find((candidato) => candidato.id === timeAberto) : undefined

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo={timeAberto ? 'Entrar no time' : 'Inscrição do time'} sub={link?.nomeDoTorneio ?? ''} />
      <div className="conteudo">
        {erroAoAbrir ? (
          <div className="panel pb" style={{ display: 'grid', gap: 10, textAlign: 'center', color: 'var(--navy)' }}>
            <b>Não deu para abrir o link agora.</b>
            <span className="mut">Confira a internet. Se abriu pelo WhatsApp ou Instagram, tente abrir no Safari ou no Chrome.</span>
            <button className="btn" onClick={() => { setErroAoAbrir(null); setLink(undefined); setTentativa((numero) => numero + 1) }}>Tentar de novo</button>
            <span className="mut" style={{ fontSize: 12 }}>Código do erro: {erroAoAbrir}</span>
          </div>
        ) : (
          <>
            {link === undefined && <div className="vazio">Carregando…</div>}
            {link === null && <div className="vazio">Link não encontrado. Peça um novo para quem organiza o torneio.</div>}
          </>
        )}
        {link && !erroAoAbrir && (timeAberto
          ? (time
            ? <LinkDoTime codigo={codigo} link={link} time={time} eu={eu} onEntrarComConta={() => setEntrando(true)} onVerTimes={() => abrirTime(null)} />
            : <div className="panel pb" style={{ textAlign: 'center', color: 'var(--navy)' }}><b>Esse time saiu do torneio.</b> <span className="mut">Peça o link de novo ao capitão.</span></div>)
          : <LinkDoTorneio codigo={codigo} link={link} times={times} eu={eu} onEntrarComConta={() => setEntrando(true)} onAbrirTime={abrirTime} />)}

        {link && !nativo() && celularAndroid() && !chamadaFechada && (
          <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
            <b>Baixe o app e acompanhe o torneio: jogos, tabela e artilharia!</b>
            <button className="btn sm" onClick={() => void abrirLink(ENDERECO_NA_LOJA)}>Baixar na Play Store</button>
            <button className="lnk" onClick={() => setChamadaFechada(true)}>Agora não</button>
          </section>
        )}
      </div>
    </div>
  )
}

/** Abre o torneio para acompanhar, na aba Times (onde fica o "Encontrar meu nome"). */
function irParaOTorneio(codigo: string, nome: string) {
  abrirParaAcompanhar(codigo, nome)
  try { localStorage.setItem('app:modo', 'torneio') } catch { /* sem armazenamento: abre no início */ }
  location.href = '/'
}

/** Manda o link do time (WhatsApp etc.); sem o compartilhar do celular, copia. */
async function mandarLinkDoTime(codigo: string, link: InscricaoDoTorneio, time: TimeInscrito): Promise<string | null> {
  const texto = `⚽ Entre no time ${time.nome} do torneio ${link.nomeDoTorneio}: ${linkDaInscricao(codigo, time.id)}`
  if (await compartilharTexto({ text: texto })) return null
  await navigator.clipboard.writeText(texto).catch(() => null)
  return 'Link copiado! Cole no grupo do time.'
}

/** O capitão inscreve o time (com a conta). Quem já é capitão vai para o time dele. */
function LinkDoTorneio({ codigo, link, times, eu, onEntrarComConta, onAbrirTime }: {
  codigo: string; link: InscricaoDoTorneio; times: TimeInscrito[]; eu: string | null; onEntrarComConta: () => void; onAbrirTime: (id: string) => void
}) {
  const conta = useConta()
  const { apelido } = useDadosDoJogador()
  const [nome, setNome] = useState('')
  const usadas = new Set(times.map((time) => time.cor))
  const [cor, setCor] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const meuTime = times.find((time) => time.capitao === eu)
  const vagas = vagasDaInscricao(times.length, link.limiteDeTimes)
  const corEscolhida = cor && !usadas.has(cor) ? cor : null
  const nomeRepetido = times.some((time) => time.nome === nome.trim())

  const inscrever = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!nome.trim() || !corEscolhida || nomeRepetido) return
    setErro(null)
    setEnviando(true)
    const id = novoCodigo()
    const nomeDoCapitao = apelido ?? maiusculas(primeiroNome(conta.perfil?.nome)) ?? ''
    await obterNuvem().then((nuvem) => nuvem?.inscreverTime(codigo, { id, nome: nome.trim(), cor: corEscolhida, nomeDoCapitao: nomeDoCapitao.slice(0, 40) }))
      .then(() => onAbrirTime(id))
      .catch(() => setErro('Não deu para inscrever o time. Confira a internet e tente de novo.'))
    setEnviando(false)
  }

  return (
    <>
      {meuTime ? (
        <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
          <b style={{ fontSize: 18 }}>Você é o capitão do {meuTime.nome}!</b>
          <button className="btn" onClick={() => onAbrirTime(meuTime.id)}>Abrir o meu time</button>
        </section>
      ) : !link.aberta ? (
        <section className="panel pb" style={{ textAlign: 'center', color: 'var(--navy)' }}><b>As inscrições acabaram.</b> <span className="mut">Os times já foram sorteados.</span></section>
      ) : vagas === 0 ? (
        <section className="panel pb" style={{ textAlign: 'center', color: 'var(--navy)' }}><b>Não tem mais vaga.</b> <span className="mut">Fale com quem organiza o torneio.</span></section>
      ) : (
        <section className="panel">
          <div className="ph">Inscrever o meu time{vagas !== null && <span className="sub">{vagas} {vagas === 1 ? 'vaga' : 'vagas'}</span>}</div>
          <div className="pb" style={{ display: 'grid', gap: 10 }}>
            {!conta.logado ? (
              <>
                <span className="mut" style={{ textAlign: 'center' }}>O capitão entra com a conta para cuidar do time. Os jogadores podem entrar só com o nome.</span>
                <button className="btn" onClick={onEntrarComConta}>Entrar com a minha conta</button>
              </>
            ) : (
              <form style={{ display: 'grid', gap: 10 }} onSubmit={(evento) => void inscrever(evento)}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Nome do time</span>
                  <input className="inp" maxLength={30} placeholder="Ex.: UNIDOS DA VILA" value={nome} autoCapitalize="characters"
                    onChange={(evento) => setNome(maiusculas(evento.target.value))} aria-invalid={nomeRepetido} />
                </label>
                {nomeRepetido && <span className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>Já tem um time com esse nome.</span>}
                <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  <legend className="mut" style={{ color: 'var(--navy)', fontWeight: 700, marginBottom: 4 }}>Cor do time</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
                    {CORES_TORNEIO.map((opcao) => {
                      const ocupada = usadas.has(opcao.cor)
                      return (
                        <button key={opcao.cor} type="button" className="cor-do-time" disabled={ocupada} aria-pressed={corEscolhida === opcao.cor}
                          aria-label={ocupada ? `${opcao.nome} (já é de outro time)` : opcao.nome} onClick={() => setCor(opcao.cor)}
                          style={{ height: 44, borderRadius: 6, background: opcao.cor, border: corEscolhida === opcao.cor ? '3px solid var(--navy)' : '2px solid var(--borda)',
                            boxShadow: corEscolhida === opcao.cor ? '0 0 0 2px var(--amarelo)' : undefined, opacity: ocupada ? 0.25 : 1, cursor: ocupada ? 'not-allowed' : 'pointer' }} />
                      )
                    })}
                  </div>
                  <span className="mut" style={{ fontSize: 12 }}>As cores apagadas já são de outros times.</span>
                </fieldset>
                <button className="btn" type="submit" disabled={!nome.trim() || !corEscolhida || nomeRepetido || enviando}>Inscrever o time</button>
                {erro && <div role="status" className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
              </form>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="ph">Times inscritos<span className="sub">{link.limiteDeTimes ? `${times.length} de ${link.limiteDeTimes}` : times.length}</span></div>
        {times.length === 0 && <div className="pb mut">Nenhum time ainda. Seja o primeiro!</div>}
        {times.map((time) => (
          <div key={time.id} className="tr">
            <Camisa cor={time.cor} tamanho={22} />
            <span className="nome">{time.nome}</span>
            <span className="mut">{time.jogadores.length} {time.jogadores.length === 1 ? 'jogador' : 'jogadores'}</span>
          </div>
        ))}
      </section>
    </>
  )
}

/** O link do time: o jogador entra (com a conta ou só o nome); o capitão manda o link e tira quem entrou por engano. */
function LinkDoTime({ codigo, link, time, eu, onEntrarComConta, onVerTimes }: {
  codigo: string; link: InscricaoDoTorneio; time: TimeInscrito; eu: string | null; onEntrarComConta: () => void; onVerTimes: () => void
}) {
  const conta = useConta()
  const confirmar = useConfirmar()
  const { apelido, salvar } = useDadosDoJogador()
  const [apelidoEditado, setApelidoEditado] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [noGol, setNoGol] = useState(false)
  const [camisa, setCamisa] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const souCapitao = time.capitao === eu
  const euNoTime = time.jogadores.find((jogador) => jogador.id === eu)
  const numero = camisa === '' ? undefined : Number(camisa)
  const donoDoNumero = numero === undefined ? undefined : time.jogadores.find((jogador) => jogador.camisa === numero)
  const nomeNoTime = apelidoEditado ?? apelido ?? maiusculas(primeiroNome(conta.perfil?.nome))
  const nuvem = (fazer: (nuvemAberta: NonNullable<Awaited<ReturnType<typeof obterNuvem>>>) => Promise<void>, mensagem: string) =>
    obterNuvem().then((nuvemAberta) => (nuvemAberta ? fazer(nuvemAberta) : undefined)).catch(() => setErro(mensagem))

  const entrar = async (quem: string, comConta: boolean) => {
    if (!quem.trim() || donoDoNumero) return
    setErro(null)
    if (comConta && quem !== apelido) await salvar({ apelido: quem }).catch(() => null)
    await nuvem(async (aberta) => {
      await aberta.entrarNoTime(codigo, time.id, {
        nome: quem.trim(), comConta, ...(noGol && { goleiro: true }), ...(numero !== undefined && { camisa: numero }),
      })
      // com a conta: o torneio aparece na pré-tela "Torneios" dele (Jogando), para acompanhar
      if (comConta) {
        await aberta.guardarParticipacao(codigo, {
          torneio: link.torneio ?? null, nomeDoTorneio: link.nomeDoTorneio, time: time.id, nomeDoTime: time.nome, cor: time.cor, data: Date.now(),
        }).catch(() => null)
      }
    }, 'Não deu para entrar no time. Confira a internet e tente de novo.')
  }
  const tirar = (id: string, nomeDeQuem: string) => confirmar({
    titulo: 'Tirar do time?', mensagem: `${nomeDeQuem} sai do ${time.nome}.`, botao: 'Tirar', perigo: true,
    aoConfirmar: () => void nuvem((aberta) => aberta.sairDoTime(codigo, time.id, id), 'Não deu para tirar. Confira a internet.'),
  })
  const tirarOTime = () => confirmar({
    titulo: 'Tirar o time do torneio?', mensagem: `O ${time.nome} e os jogadores dele saem da inscrição.`, botao: 'Tirar o time', perigo: true,
    aoConfirmar: () => void nuvem((aberta) => aberta.tirarTimeInscrito(codigo, time.id), 'Não deu para tirar o time. Confira a internet.'),
  })

  return (
    <>
      <section className="panel">
        <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
          <span className="row num" style={{ gap: 8, minWidth: 0, fontSize: 20 }}>
            <Camisa cor={time.cor} tamanho={24} contorno={textoSobre(time.cor)} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{time.nome}</span>
          </span>
        </div>
        <div className="pb mut" style={{ fontSize: 13 }}>Capitão: {time.nomeDoCapitao || '—'} · {link.nomeDoTorneio}</div>
      </section>

      {souCapitao && link.aberta && (
        <section className="panel pb" style={{ display: 'grid', gap: 8, color: 'var(--navy)' }}>
          <b>Agora chame os jogadores</b>
          <span className="mut">Mande o link do time no grupo. Cada um entra com a conta ou só com o nome.</span>
          <button className="btn" onClick={() => void mandarLinkDoTime(codigo, link, time).then(setAviso)}><Icone nome="compartilhar" tamanho={20} /> Mandar o link do time</button>
          {aviso && <span role="status" className="mut" style={{ fontWeight: 600 }}>{aviso}</span>}
        </section>
      )}

      {euNoTime ? (
        <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
          <b style={{ fontSize: 18 }}>{euNoTime.goleiro ? 'Você é o goleiro do time!' : 'Você está no time!'}</b>
          {euNoTime.camisa !== undefined && <span className="mut">Camisa {euNoTime.camisa}</span>}
          {link.aberta && <button className="btn w sm" onClick={() => void nuvem(async (aberta) => {
            await aberta.sairDoTime(codigo, time.id, euNoTime.id)
            await aberta.guardarParticipacao(codigo, null).catch(() => null)
          }, 'Não deu para sair. Confira a internet.')}>Sair do time</button>}
        </section>
      ) : !link.aberta ? (
        <section className="panel pb" style={{ textAlign: 'center', color: 'var(--navy)' }}><b>As inscrições acabaram.</b> <span className="mut">Para entrar agora, fale com quem organiza o torneio.</span></section>
      ) : (
        <section className="panel">
          <div className="ph">Vai jogar no {time.nome}?</div>
          <div className="pb" style={{ display: 'grid', gap: 10 }}>
            <div role="radiogroup" aria-label="Onde você vai jogar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" role="radio" aria-checked={!noGol} className={'btn sm' + (noGol ? ' w' : '')} onClick={() => setNoGol(false)}>Na linha</button>
              <button type="button" role="radio" aria-checked={noGol} className={'btn sm' + (noGol ? '' : ' w')} onClick={() => setNoGol(true)}>No gol</button>
            </div>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Número da camisa (se tiver)</span>
              <input className={'inp' + (donoDoNumero ? ' repetida' : '')} inputMode="numeric" maxLength={2} placeholder="Nº" value={camisa} style={{ maxWidth: 96 }}
                onChange={(evento) => setCamisa(evento.target.value.replace(/\D/g, '').slice(0, 2))} aria-invalid={!!donoDoNumero} />
            </label>
            {donoDoNumero && <span className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>A camisa {numero} já é do {donoDoNumero.nome}.</span>}
            {conta.logado ? (
              <>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Como você quer aparecer</span>
                  <input className="inp" maxLength={20} placeholder="Seu apelido" value={nomeNoTime} autoCapitalize="characters" onChange={(evento) => setApelidoEditado(maiusculas(evento.target.value))} />
                </label>
                <button className="btn" disabled={!nomeNoTime.trim() || !!donoDoNumero} onClick={() => void entrar(nomeNoTime, true)}>Entrar no time</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={onEntrarComConta}>Entrar com a minha conta</button>
                <form style={{ display: 'grid', gap: 8 }} onSubmit={(evento) => { evento.preventDefault(); void entrar(nome, false) }}>
                  <span className="mut" style={{ textAlign: 'center' }}>ou só com o nome (sem carta e sem histórico)</span>
                  <label style={{ display: 'flex' }}>
                    <span className="vh">Seu nome</span>
                    <input className="inp" placeholder="Seu nome" maxLength={40} value={nome} autoCapitalize="characters" onChange={(evento) => setNome(maiusculas(evento.target.value))} />
                  </label>
                  <button className="btn w" type="submit" disabled={!nome.trim() || !!donoDoNumero}>Entrar só com o nome</button>
                </form>
              </>
            )}
            {erro && <div role="status" className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
            {/* "esse sou eu": quem o organizador já colocou pelo nome se encontra no torneio (não entra de novo) */}
            {conta.logado && link.torneio && (
              <button className="lnk" style={{ justifySelf: 'center' }} onClick={() => irParaOTorneio(link.torneio!, link.nomeDoTorneio)}>
                O organizador já me colocou pelo nome
              </button>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="ph">Jogadores<span className="sub">{time.jogadores.length}</span></div>
        {time.jogadores.length === 0 && <div className="pb mut">Ninguém entrou ainda.</div>}
        {[...time.jogadores].sort((a, b) => Number(!!b.goleiro) - Number(!!a.goleiro)).map((jogador) => (
          <div key={jogador.id} className="tr">
            <NumeroDaCamisa numero={jogador.camisa} goleiro={jogador.goleiro} cor={time.cor} />
            <NomeDoJogador nome={jogador.nome} capitao={jogador.id === time.capitao} />
            {jogador.goleiro && <LuvaDoGoleiro cor={time.cor} tamanho={28} rotulo="goleiro" />}
            {souCapitao && link.aberta && jogador.id !== eu && (
              <button className="tag" style={{ cursor: 'pointer', border: '1px solid var(--borda)' }} aria-label={`Tirar ${jogador.nome} do time`} onClick={() => tirar(jogador.id, jogador.nome)}>Tirar</button>
            )}
          </div>
        ))}
      </section>

      {souCapitao && link.aberta && <button className="btn w sm" onClick={tirarOTime}><Icone nome="lixo" tamanho={18} /> Tirar o time do torneio</button>}
      <button className="lnk" onClick={onVerTimes}>Ver todos os times do torneio</button>
    </>
  )
}
