import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { LuvaDoGoleiro } from '../../components/LuvaDoGoleiro'
import { Aviso } from '../../components/Aviso'
import { Barra } from '../../components/Barra'
import { Camisa, CamisaQueTroca, type TrocaDeModelo } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { novoJogador } from '../../logic'
import { partesDoTime, siglaAutomatica } from '../../logic/torneio'
import { MODELOS_DE_UNIFORME, type JogadorDoTime, type ModeloDeUniforme, type TimeTorneio, type Torneio } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { CORES_TORNEIO, textoSobre } from '../../utils/cores'
import { maiusculas, normalizarNome } from '../../utils/formatar'

const NOME_DO_MODELO: Record<ModeloDeUniforme, string> = {
  lisa: 'Lisa', horizontais: 'Listras horizontais', verticais: 'Listras verticais', faixaHorizontal: 'Faixa horizontal', diagonal: 'Faixa diagonal',
  diagonalInvertida: 'Diagonal invertida', meioAMeio: 'Meio a meio', faixaVertical: 'Faixa vertical', mangas: 'Mangas', faixaEmV: 'Faixa em V',
  metadeEmCima: 'Metade em cima', xadrez: 'Xadrez', duasFaixas: 'Duas faixas', ombros: 'Ombros', duasFaixasVerticais: 'Duas faixas verticais',
}

/** Segunda cor que aparece de início: preto nas cores claras, branco nas escuras. */
const segundaCorPadrao = (cor: string) => (['#F4F4F4', '#FFD23F', '#E8C15A', '#A6D930', '#3FE0C5', '#6EC1F0'].includes(cor) ? '#1B1B1B' : '#F4F4F4')

/** Tira a marca de goleiro (vira jogador de linha). */
const semMarca = ({ goleiro: _era, ...resto }: JogadorDoTime): JogadorDoTime => resto

/** Os goleiros no começo da lista (o primeiro é o titular), sem mudar a ordem dentro de cada parte. */
const goleirosPrimeiro = (jogadores: JogadorDoTime[]) => [...jogadores.filter((jogador) => jogador.goleiro), ...jogadores.filter((jogador) => !jogador.goleiro)]

// Cadastro de um time: nome, cor, uniforme (modelo e segunda cor) e jogadores em ordem. Os goleiros (pode ter vários)
// vêm primeiro: o primeiro começa no gol. Na linha, os primeiros são titulares; os demais, reservas.
export function EditorDeTime({ torneio, inicial, onSalvar, onExcluir, onCancelar }: {
  torneio: Torneio
  inicial: TimeTorneio
  onSalvar: (time: TimeTorneio) => void
  onExcluir?: () => void
  onCancelar: () => void
}) {
  // só o goleiro titular fica marcado: os outros goleiros (vindos do link, por exemplo) são reservas comuns, no fim
  const [time, setTime] = useState<TimeTorneio>(() => {
    const [titular, ...outrosGoleiros] = inicial.jogadores.filter((jogador) => jogador.goleiro)
    return { ...inicial, jogadores: [...(titular ? [titular] : []), ...inicial.jogadores.filter((jogador) => !jogador.goleiro), ...outrosGoleiros.map(semMarca)] }
  })
  const nomeDoCapitao = inicial.capitao ? inicial.jogadores.find((jogador) => jogador.inscrito === inicial.capitao)?.nome : undefined
  const [nomeJogador, setNomeJogador] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const confirmar = useConfirmar()
  const { linha } = torneio.regras
  const outros = torneio.times.filter((t) => t.id !== time.id)
  // uniforme: a segunda cor fica guardada mesmo na lisa (voltando para um modelo, ela continua a mesma)
  const [segunda, setSegunda] = useState(inicial.uniforme?.segunda ?? segundaCorPadrao(inicial.cor))
  const [troca, setTroca] = useState<TrocaDeModelo | null>(null)
  const [paletaAberta, setPaletaAberta] = useState<'principal' | 'secundaria' | null>(null)
  const inicioDoArrasto = useRef<number | null>(null)
  const modelo = time.uniforme?.modelo ?? 'lisa'
  const posicaoDoModelo = MODELOS_DE_UNIFORME.indexOf(modelo)
  const nomeDaCor = (cor: string) => CORES_TORNEIO.find((c) => c.cor === cor)?.nome ?? ''
  /** Passa para o modelo seguinte (1) ou anterior (-1), dando a volta; o desenho desliza para o lado. */
  const passarModelo = (direcao: 1 | -1) => {
    const novo = MODELOS_DE_UNIFORME[(posicaoDoModelo + direcao + MODELOS_DE_UNIFORME.length) % MODELOS_DE_UNIFORME.length]
    setTroca((anterior) => ({ anterior: time.uniforme, direcao, numero: (anterior?.numero ?? 0) + 1 }))
    setTime((t) => ({ ...t, uniforme: novo === 'lisa' ? undefined : { modelo: novo, segunda } }))
  }
  const escolherPrincipal = (cor: string) => {
    // a segunda cor não pode ser igual à principal: troca pela de início (preto ou branco)
    const novaSegunda = segunda === cor ? segundaCorPadrao(cor) : segunda
    setSegunda(novaSegunda)
    setTroca(null)
    setTime((t) => ({ ...t, cor, uniforme: t.uniforme ? { ...t.uniforme, segunda: novaSegunda } : undefined }))
    setPaletaAberta(null)
  }
  const escolherSecundaria = (cor: string) => {
    setSegunda(cor)
    setTroca(null)
    setTime((t) => (t.uniforme ? { ...t, uniforme: { ...t.uniforme, segunda: cor } } : t))
    setPaletaAberta(null)
  }

  // Nomes de todo mundo do torneio, mais os deste time
  const nomesNoTorneio = [
    ...outros.flatMap((outroTime) => outroTime.jogadores.map((jogador) => jogador.nome)),
    ...time.jogadores.map((jogador) => jogador.nome),
  ].map(normalizarNome)

  /** Adiciona na linha (ou no gol, com `goleiro`): os goleiros ficam no começo da lista. */
  const adicionar = (goleiro: boolean) => {
    const nome = nomeJogador.trim()
    if (!nome) return
    if (nomesNoTorneio.includes(normalizarNome(nome))) {
      return setAviso(`Já tem um ${nome} no torneio. Adicione o sobrenome ou um apelido.`)
    }
    setTime((t) => ({ ...t, jogadores: goleirosPrimeiro([...t.jogadores, { ...novoJogador(nome), ...(goleiro && { goleiro: true }) }]) }))
    setNomeJogador('')
    campo.current?.focus()
  }
  const aoEnviar = (evento: FormEvent) => { evento.preventDefault(); adicionar(false) }
  // subir e descer trocam com o vizinho da mesma parte (goleiros entre si, linha entre si)
  const mesmaParte = (i: number, j: number) => !!time.jogadores[i]?.goleiro === !!time.jogadores[j]?.goleiro && j >= 0 && j < time.jogadores.length
  const subir = (i: number) => setTime((t) => {
    const js = [...t.jogadores]
    ;[js[i - 1], js[i]] = [js[i], js[i - 1]]
    return { ...t, jogadores: js }
  })
  /**
   * Passa para o gol: vira o goleiro, e quem estava no gol vai para a linha no lugar dele (uma troca). Do goleiro,
   * "passar para a linha" só tira a marca. É só a posição de costume: no jogo, qualquer um vai para qualquer posição.
   */
  const alternarGoleiro = (id: string) => setTime((t) => {
    const titular = t.jogadores.find((jogador) => jogador.goleiro)
    if (titular?.id === id) return { ...t, jogadores: goleirosPrimeiro(t.jogadores.map((jogador) => (jogador.id === id ? semMarca(jogador) : jogador))) }
    const vai = t.jogadores.find((jogador) => jogador.id === id)!
    // quem estava no gol fica no lugar (na lista) de quem foi para o gol
    const resto = t.jogadores
      .filter((jogador) => jogador.id !== titular?.id)
      .flatMap((jogador) => (jogador.id !== id ? [jogador] : titular ? [semMarca(titular)] : []))
    return { ...t, jogadores: goleirosPrimeiro([{ ...vai, goleiro: true }, ...resto]) }
  })
  /** Número da camisa (opcional): só dígitos, até 2; vazio tira o número. */
  const lerCamisa = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 2)
    return digitos === '' ? undefined : Number(digitos)
  }
  const mudarCamisa = (id: string, texto: string) => setTime((t) => ({
    ...t, jogadores: t.jogadores.map((jogador) => (jogador.id === id ? { ...jogador, camisa: lerCamisa(texto) } : jogador)),
  }))
  // número repetido no time: o campo fica vermelho (não impede salvar)
  const camisas = time.jogadores.map((jogador) => jogador.camisa).filter((numero) => numero !== undefined)
  const camisaRepetida = (numero: number | undefined) => numero !== undefined && camisas.filter((outro) => outro === numero).length > 1
  /** Enter no número: vai para o número do próximo jogador (no último, só fecha o teclado). */
  const passarParaOProximo = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    const campos = [...document.querySelectorAll<HTMLInputElement>('.numerando .inp.camisa')]
    const proximo = campos[campos.indexOf(evento.currentTarget) + 1]
    if (proximo) proximo.focus()
    else evento.currentTarget.blur()
  }
  const campoDaCamisa = (rotulo: string, numero: number | undefined, mudar: (texto: string) => void) => (
    <label style={{ display: 'flex', flex: 'none' }}>
      <span className="vh">{rotulo}</span>
      <input className={'inp camisa' + (camisaRepetida(numero) ? ' repetida' : '')} inputMode="numeric" placeholder="Nº" maxLength={2}
        enterKeyHint="next" onKeyDown={passarParaOProximo} onFocus={(evento) => evento.currentTarget.select()}
        value={numero ?? ''} onChange={(evento) => mudar(evento.target.value)} />
    </label>
  )
  const descer = (i: number) => subir(i + 1)
  // colocando os números nas camisas: um campo na frente de cada nome, até confirmar
  const [numerando, setNumerando] = useState(false)
  const comecarNumeros = () => {
    setNumerando(true)
    // já abre o teclado no primeiro sem número (ou no primeiro da lista)
    setTimeout(() => {
      const campos = [...document.querySelectorAll<HTMLInputElement>('.numerando .inp.camisa')]
      ;(campos.find((campoDoNumero) => campoDoNumero.value === '') ?? campos[0])?.focus()
    }, 0)
  }
  // jogador com as ações abertas (subir, descer, tirar)
  const [acoesDe, setAcoesDe] = useState<string | null>(null)
  const tirar = (id: string) => setTime((t) => ({ ...t, jogadores: t.jogadores.filter((j) => j.id !== id) }))

  const goleiros = time.jogadores.filter((jogador) => jogador.goleiro)
  const daLinha = time.jogadores.filter((jogador) => !jogador.goleiro)
  // o goleiro e os da linha; um goleiro reserva pode completar a linha
  const faltam = Math.max(0, linha + 1 - time.jogadores.length)
  const nomeRepetido = outros.some((t) => normalizarNome(t.nome) === normalizarNome(time.nome))
  const semGoleiro = goleiros.length === 0 // todo time começa o jogo com alguém no gol
  const podeFechar = time.nome.trim() !== '' && faltam === 0 && !nomeRepetido && !semGoleiro

  const fechar = () => {
    // sem número, o campo `camisa` nem vai (a nuvem não aceita valor vazio)
    const jogadores = time.jogadores.map(({ camisa, ...jogador }) => (camisa === undefined ? jogador : { ...jogador, camisa }))
    onSalvar({ ...time, nome: time.nome.trim(), jogadores, fechado: true })
  }
  /** Em que parte da lista o jogador está: goleiro titular ou reserva; na linha, titular ou reserva. */
  const papel = (jogador: JogadorDoTime) => {
    if (jogador.goleiro) return goleiros.indexOf(jogador) === 0 ? 'goleiro' : 'goleiro reserva'
    const posicao = daLinha.indexOf(jogador)
    return posicao < linha ? `titular · ${posicao + 1}º` : 'reserva'
  }
  const { goleiro: goleiroTitular, titulares, reservas } = partesDoTime(time, linha)
  const partes: [string, JogadorDoTime[]][] = [
    ['GOLEIRO', goleiroTitular ? [goleiroTitular] : []], [`TITULARES (${linha} NA LINHA)`, titulares], ['RESERVAS', reservas],
  ]
  const ehReserva = (jogador: JogadorDoTime) => (jogador.goleiro ? goleiros.indexOf(jogador) > 0 : daLinha.indexOf(jogador) >= linha)

  return (
    <div className="scr">
      <Barra titulo={inicial.fechado ? 'Editar time' : 'Novo time'} sub={torneio.nome} />
      <div className="conteudo">
        <section className="panel">
          <div className="ph">Nome do time</div>
          <div className="pb" style={{ display: 'grid', gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
              <label style={{ display: 'flex', flex: 1, minWidth: 0 }}>
                <span className="vh">Nome do time</span>
                <input className="inp" value={time.nome} placeholder="Nome do time" autoCapitalize="characters"
                  onChange={(ev) => setTime((t) => ({ ...t, nome: maiusculas(ev.target.value) }))} />
              </label>
              {/* sigla de 3 letras (como no Brasileirão): aparece nos botões de gol; vazia, sai do nome */}
              <label style={{ display: 'flex', width: 84, flex: 'none' }}>
                <span className="vh">Sigla do time</span>
                <input className="inp" value={time.sigla ?? ''} placeholder={siglaAutomatica(time.nome || 'Time')} maxLength={3} autoCapitalize="characters"
                  style={{ textAlign: 'center', letterSpacing: 1 }}
                  onChange={(ev) => setTime((t) => ({ ...t, sigla: ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || undefined }))} />
              </label>
            </div>
            <div className="mut" style={{ fontSize: 13, marginTop: -4 }}>A sigla (3 letras) aparece nos botões de gol. Vazia, sai do nome.</div>
            {nomeRepetido && <div className="mut" style={{ color: 'var(--vermelho)' }}>Já existe um time com esse nome.</div>}
            {/* time que veio do link de inscrição: o nome e a cor seguem os do capitão (mudar aqui muda no link também) */}
            {inicial.inscricao && (
              <div className="mut" style={{ fontSize: 13 }}>
                Inscrito pelo link{nomeDoCapitao ? ` pelo capitão ${nomeDoCapitao}` : ''}: o nome e a cor mudam no link também.
              </div>
            )}
          </div>
        </section>

        {/* Uniforme: a camisa grande com ‹ › para o modelo (o desenho desliza) e as duas cores em botões pintados com elas */}
        <section className="panel">
          <div className="ph">Uniforme</div>
          <div className="pb" style={{ display: 'grid', gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <button className="ib" aria-label="Modelo anterior" onClick={() => passarModelo(-1)}>
                <span style={{ display: 'flex', transform: 'scaleX(-1)' }}><Icone nome="seta" /></span>
              </button>
              <div style={{ flex: 1, minWidth: 0, display: 'grid', justifyItems: 'center', gap: 4, touchAction: 'pan-y', userSelect: 'none' }}
                onPointerDown={(evento) => { inicioDoArrasto.current = evento.clientX }}
                onPointerUp={(evento) => {
                  // arrastar a camisa para o lado também troca o modelo
                  const deslocamento = inicioDoArrasto.current === null ? 0 : evento.clientX - inicioDoArrasto.current
                  inicioDoArrasto.current = null
                  if (Math.abs(deslocamento) > 40) passarModelo(deslocamento < 0 ? 1 : -1)
                }}>
                <CamisaQueTroca cor={time.cor} uniforme={time.uniforme} troca={troca} tamanho={150} />
                <span className="num" style={{ fontSize: 26, color: 'var(--navy)', textTransform: 'uppercase', lineHeight: 1 }} aria-live="polite">{NOME_DO_MODELO[modelo]}</span>
                <span className="mut" style={{ fontSize: 13 }}>{posicaoDoModelo + 1} de {MODELOS_DE_UNIFORME.length}</span>
              </div>
              <button className="ib" aria-label="Próximo modelo" onClick={() => passarModelo(1)}>
                <Icone nome="seta" />
              </button>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className={'botao-de-cor' + (paletaAberta === 'principal' ? ' aberto' : '')} aria-expanded={paletaAberta === 'principal'}
                style={{ background: time.cor, color: textoSobre(time.cor) }}
                onClick={() => setPaletaAberta(paletaAberta === 'principal' ? null : 'principal')}>
                <b>Cor principal</b><small>{nomeDaCor(time.cor)}</small>
              </button>
              <button className={'botao-de-cor' + (paletaAberta === 'secundaria' ? ' aberto' : '')} aria-expanded={paletaAberta === 'secundaria'}
                disabled={!time.uniforme} style={{ background: segunda, color: textoSobre(segunda) }}
                onClick={() => setPaletaAberta(paletaAberta === 'secundaria' ? null : 'secundaria')}>
                <b>Cor secundária</b><small>{time.uniforme ? nomeDaCor(segunda) : 'a lisa não usa'}</small>
              </button>
            </div>
            {paletaAberta === 'principal' && (
              <div role="radiogroup" aria-label="Cor principal" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 6 }}>
                {/* a cor pode repetir entre os times: o uniforme (modelo e segunda cor) e o nome diferenciam */}
                {CORES_TORNEIO.map((c) => (
                  <button key={c.cor} role="radio" aria-checked={time.cor === c.cor} aria-label={c.nome} title={c.nome}
                    className={'cor' + (time.cor === c.cor ? ' on' : '')} style={{ background: c.cor }}
                    onClick={() => escolherPrincipal(c.cor)} />
                ))}
              </div>
            )}
            {paletaAberta === 'secundaria' && time.uniforme && (
              <div role="radiogroup" aria-label="Cor secundária" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 6 }}>
                {CORES_TORNEIO.filter((c) => c.cor !== time.cor).map((c) => (
                  <button key={c.cor} role="radio" aria-checked={segunda === c.cor} aria-label={c.nome} title={c.nome}
                    className={'cor' + (segunda === c.cor ? ' on' : '')} style={{ background: c.cor }}
                    onClick={() => escolherSecundaria(c.cor)} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={'panel' + (numerando ? ' numerando' : '')}>
          <div className="ph">
            <span className="row" style={{ gap: 8 }}><Camisa cor={time.cor} uniforme={time.uniforme} contorno="#fff" />Jogadores</span>
            <span className={'tag ' + (faltam || semGoleiro ? 't-warn' : 't-ok')}>
              {semGoleiro ? 'falta o goleiro' : faltam ? `faltam ${faltam}` : `${time.jogadores.length} jogadores`}
            </span>
          </div>
          <form onSubmit={aoEnviar} className="pb" style={{ display: 'flex', gap: 8 }}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do jogador</span>
              <input ref={campo} className="inp" placeholder="Nome do jogador" value={nomeJogador} autoCapitalize="characters"
                enterKeyHint="done" onChange={(ev) => setNomeJogador(maiusculas(ev.target.value))} />
            </label>
            <button className="ib" type="submit" aria-label="Adicionar jogador"
              style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }}>
              <Icone nome="mais" />
            </button>
            {/* sem goleiro ainda: a luva adiciona o goleiro (depois, "Passar para o gol" nos 3 pontinhos troca) */}
            {semGoleiro && (
              <button className="ib" type="button" aria-label="Adicionar goleiro" title="Adicionar goleiro" onClick={() => adicionar(true)}
                style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }}>
                <LuvaDoGoleiro cor={time.cor} segunda={time.uniforme?.segunda} tamanho={34} />
              </button>
            )}
          </form>
          {/* o goleiro, os titulares da linha e, no fim, os reservas */}
          {partes.map(([titulo, lista]) => lista.map((j, i) => (
            <div key={j.id}>
              {i === 0 && (
                <div className="tr" style={{ minHeight: 28, fontSize: 12, letterSpacing: 1, color: 'var(--mut)', background: 'var(--divisoria)' }}>
                  {titulo}
                </div>
              )}
              {numerando ? (
                // colocando os números: o campo na frente de cada nome (Enter passa para o próximo)
                <div className="tr" style={{ background: ehReserva(j) ? '#f6f7f2' : undefined, minHeight: 48 }}>
                  {campoDaCamisa(`Número da camisa de ${j.nome}`, j.camisa, (texto) => mudarCamisa(j.id, texto))}
                  <span className="nome">{j.nome}</span>
                  {j === goleiroTitular && <LuvaDoGoleiro cor={time.cor} segunda={time.uniforme?.segunda} tamanho={28} rotulo="goleiro" />}
                </div>
              ) : (
                <div className="tr" style={{ background: ehReserva(j) ? '#f6f7f2' : undefined, paddingLeft: 0 }}>
                  {/* tocar no jogador abre subir, descer, gol/linha e tirar */}
                  <button className="linha-jogador" aria-label={`Opções de ${j.nome}`} onClick={() => setAcoesDe(j.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, minHeight: 42, padding: '0 0 0 10px', background: 'transparent' }}>
                    <NumeroDaCamisa numero={j.camisa} goleiro={j === goleiroTitular} reserva={ehReserva(j)} cor={time.cor} />
                    <span className="nome">{j.nome}</span>
                  </button>
                  <button className="ib g" style={{ color: 'var(--navy)', marginLeft: -4 }} aria-label={`Mais opções de ${j.nome}`} onClick={() => setAcoesDe(j.id)}>
                    <Icone nome="opcoes" tamanho={24} />
                  </button>
                </div>
              )}
            </div>
          )))}
          {time.jogadores.length === 0 && <div className="pb mut">Adicione os jogadores em ordem: os primeiros {linha} da linha são titulares. A luva adiciona o goleiro.</div>}
          {time.jogadores.length > 0 && (
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              {numerando
                ? <button className="btn sm" onClick={() => setNumerando(false)}><Icone nome="certo" tamanho={20} /> Confirmar números</button>
                : <>
                  <button className="btn w sm" onClick={comecarNumeros}>
                    <Camisa cor={time.cor} uniforme={time.uniforme} tamanho={22} /> Colocar números nas camisas
                  </button>
                  <div className="mut" style={{ fontSize: 13 }}>O número é opcional. Nos 3 pontinhos: mudar a ordem, passar para o gol ou para a linha, ou tirar do time.</div>
                </>}
            </div>
          )}
        </section>

        {onExcluir && (
          <button className="btn r sm" onClick={() => confirmar({
            titulo: 'Excluir time?', mensagem: `O time ${time.nome || 'sem nome'} e os jogadores dele saem do torneio.`,
            botao: 'Excluir', perigo: true, aoConfirmar: onExcluir,
          })}><Icone nome="lixo" tamanho={20} /> Excluir time</button>
        )}
        {/* no fim da tela (não flutua por cima dos jogadores) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, flex: 'none' }}>
          <button className="btn w sm" onClick={onCancelar}>Cancelar</button>
          <button className="btn sm" disabled={!podeFechar} onClick={fechar}>
            {inicial.fechado ? 'Salvar time' : 'Fechar time'}
          </button>
        </div>
      </div>
      {acoesDe && (() => {
        const posicao = time.jogadores.findIndex((jogador) => jogador.id === acoesDe)
        const jogador = time.jogadores[posicao]
        if (!jogador) return null
        const fechar = () => setAcoesDe(null)
        return (
          <div className="modal" role="dialog" aria-modal="true" aria-label={jogador.nome} onClick={fechar}>
            <section className="panel" onClick={(evento) => evento.stopPropagation()}>
              <div className="ph">
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  <Camisa cor={time.cor} uniforme={time.uniforme} tamanho={30} contorno="#fff" numero={jogador.camisa} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jogador.nome}</span>
                </span>
                <span className="sub">{papel(jogador)}</span>
              </div>
              <div className="pb" style={{ display: 'grid', gap: 10 }}>
                <button className="btn w sm" disabled={!mesmaParte(posicao, posicao - 1)} onClick={() => subir(posicao)}>
                  <span style={{ display: 'flex', transform: 'rotate(-90deg)' }}><Icone nome="seta" tamanho={20} /></span> Subir
                </button>
                <button className="btn w sm" disabled={!mesmaParte(posicao, posicao + 1)} onClick={() => descer(posicao)}>
                  <span style={{ display: 'flex', transform: 'rotate(90deg)' }}><Icone nome="seta" tamanho={20} /></span> Descer
                </button>
                <button className="btn w sm" onClick={() => alternarGoleiro(jogador.id)}>
                  <LuvaDoGoleiro cor={time.cor} segunda={time.uniforme?.segunda} tamanho={26} /> {jogador === goleiroTitular ? 'Passar para a linha' : 'Passar para o gol'}
                </button>
                <button className="btn r sm" onClick={() => {
                  fechar()
                  confirmar({
                    titulo: `Tirar ${jogador.nome}?`, mensagem: `${jogador.nome} sai da lista do ${time.nome || 'time'}.`,
                    botao: 'Tirar', perigo: true, aoConfirmar: () => tirar(jogador.id),
                  })
                }}><Icone nome="lixo" tamanho={20} /> Tirar do time</button>
                <button className="btn w sm" onClick={fechar}>Pronto</button>
              </div>
            </section>
          </div>
        )
      })()}
      {aviso && <Aviso titulo="Nome repetido" onFechar={() => setAviso(null)}>{aviso}</Aviso>}
    </div>
  )
}
