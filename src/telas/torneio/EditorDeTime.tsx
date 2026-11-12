import { useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../components/Aviso'
import { Barra } from '../../components/Barra'
import { Camisa, CamisaQueTroca, type TrocaDeModelo } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { novoJogador } from '../../logic'
import { goleiroDoTime, jogadoresDeLinha, siglaAutomatica } from '../../logic/torneio'
import { MODELOS_DE_UNIFORME, type ModeloDeUniforme, type TimeTorneio, type Torneio } from '../../types/torneio'
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

// Cadastro de um time: nome, cor, uniforme (modelo e segunda cor), goleiro e jogadores em ordem
// (os primeiros da linha são titulares; os demais, reservas).
export function EditorDeTime({ torneio, inicial, onSalvar, onExcluir, onCancelar }: {
  torneio: Torneio
  inicial: TimeTorneio
  onSalvar: (time: TimeTorneio) => void
  onExcluir?: () => void
  onCancelar: () => void
}) {
  // na edição, `time.jogadores` fica só com os de linha; o goleiro é editado à parte e volta para a lista ao salvar
  const [time, setTime] = useState<TimeTorneio>({ ...inicial, jogadores: jogadoresDeLinha(inicial) })
  const [nomeDoGoleiro, setNomeDoGoleiro] = useState(goleiroDoTime(inicial)?.nome ?? '')
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

  // Nomes de todo mundo do torneio (os goleiros também são jogadores), mais os de linha deste time
  const nomesNoTorneio = [
    ...outros.flatMap((outroTime) => outroTime.jogadores.map((jogador) => jogador.nome)),
    ...time.jogadores.map((jogador) => jogador.nome),
  ].map(normalizarNome)

  const adicionar = (ev: FormEvent) => {
    ev.preventDefault()
    const nome = nomeJogador.trim()
    if (!nome) return
    if (nomesNoTorneio.includes(normalizarNome(nome)) || normalizarNome(nomeDoGoleiro) === normalizarNome(nome)) {
      return setAviso(`Já tem um ${nome} no torneio. Adicione o sobrenome ou um apelido.`)
    }
    setTime((t) => ({ ...t, jogadores: [...t.jogadores, novoJogador(nome)] }))
    setNomeJogador('')
    campo.current?.focus()
  }
  const subir = (i: number) => setTime((t) => {
    const js = [...t.jogadores]
    ;[js[i - 1], js[i]] = [js[i], js[i - 1]]
    return { ...t, jogadores: js }
  })
  const tirar = (id: string) => setTime((t) => ({ ...t, jogadores: t.jogadores.filter((j) => j.id !== id) }))

  const faltam = Math.max(0, linha - time.jogadores.length)
  const nomeRepetido = outros.some((t) => normalizarNome(t.nome) === normalizarNome(time.nome))
  const semGoleiro = !nomeDoGoleiro.trim() // todo time começa o jogo com goleiro
  const podeFechar = time.nome.trim() !== '' && faltam === 0 && !nomeRepetido && !semGoleiro

  const fechar = () => {
    if (nomesNoTorneio.includes(normalizarNome(nomeDoGoleiro))) {
      return setAviso(`Já tem um ${nomeDoGoleiro.trim()} no torneio. Use outro nome para o goleiro.`)
    }
    // o goleiro é um jogador do time marcado como goleiro (mantém o id ao editar)
    const goleiro = { id: goleiroDoTime(inicial)?.id ?? novoJogador(nomeDoGoleiro).id, nome: nomeDoGoleiro.trim(), goleiro: true }
    onSalvar({ ...time, nome: time.nome.trim(), jogadores: [goleiro, ...time.jogadores], fechado: true })
  }

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
                <span className="num" style={{ fontSize: 24, color: 'var(--navy)', textTransform: 'uppercase', lineHeight: 1 }} aria-live="polite">{NOME_DO_MODELO[modelo]}</span>
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

        <section className="panel">
          <div className="ph">
            <span className="row" style={{ gap: 8 }}>Goleiro <span className="tag t-y">G</span></span>
            {semGoleiro && <span className="tag t-warn">falta o goleiro</span>}
          </div>
          <div className="pb" style={{ display: 'flex' }}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do goleiro</span>
              <input className="inp" placeholder="Nome do goleiro" value={nomeDoGoleiro} autoCapitalize="characters"
                onChange={(evento) => setNomeDoGoleiro(maiusculas(evento.target.value))} />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="ph">
            <span className="row" style={{ gap: 8 }}><Camisa cor={time.cor} uniforme={time.uniforme} contorno="#fff" />Jogadores</span>
            <span className={'tag ' + (faltam ? 't-warn' : 't-ok')}>{faltam ? `faltam ${faltam} titulares` : `${time.jogadores.length} jogadores`}</span>
          </div>
          <form onSubmit={adicionar} className="pb" style={{ display: 'flex', gap: 8 }}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do jogador</span>
              <input ref={campo} className="inp" placeholder="Nome do jogador" value={nomeJogador} autoCapitalize="characters"
                enterKeyHint="done" onChange={(ev) => setNomeJogador(maiusculas(ev.target.value))} />
            </label>
            <button className="ib" type="submit" aria-label="Adicionar jogador"
              style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }}>
              <Icone nome="mais" />
            </button>
          </form>
          {time.jogadores.map((j, i) => (
            <div key={j.id}>
              {(i === 0 || i === linha) && (
                <div className="tr" style={{ minHeight: 28, fontSize: 12, letterSpacing: 1, color: 'var(--mut)', background: '#e3e8d6' }}>
                  {i === 0 ? `TITULARES (${linha} NA LINHA)` : 'RESERVAS'}
                </div>
              )}
              <div className="tr" style={{ background: i >= linha ? '#f6f7f2' : undefined }}>
                <span className="no" style={i >= linha ? { background: '#9aa4ae' } : undefined}>{i + 1}</span>
                <span className="nome">{j.nome}</span>
                <button className="ib g" aria-label={`Subir ${j.nome}`} disabled={i === 0} onClick={() => subir(i)}>↑</button>
                <button className="ib g" aria-label={`Tirar ${j.nome}`} onClick={() => tirar(j.id)}><Icone nome="lixo" tamanho={18} /></button>
              </div>
            </div>
          ))}
          {time.jogadores.length === 0 && <div className="pb mut">Adicione os jogadores em ordem: os primeiros {linha} são titulares.</div>}
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
      {aviso && <Aviso titulo="Nome repetido" onFechar={() => setAviso(null)}>{aviso}</Aviso>}
    </div>
  )
}
