import { useRef, useState, type FormEvent } from 'react'
import {
  adicionarJogador, blocosDaFila, comecar, sortearPrimeirosTimes, novoJogador, podeComecar, removerJogador,
  LADOS, parecidoNaTurma, resumoPagamentos, subiuDe, sugestoes, todosOsJogadores, type JogadorDaTurma, definirGoleiros, contaNaLista, incluirConta, ligarConta, passarParaALinha, passarParaOGol, quemFoiEmbora, voltouParaALista,
} from '../logic'
import { useListaDaPelada } from '../store/listaDaPelada'
import { primeiroNome, useDadosDoJogador } from '../store/carta'
import { useConta } from '../store/conta'
import { useJogadoresDaTurma } from '../store/turmas'
import { contarUso, usePlano } from '../store/plano'
import { TelaPremium } from '../components/TelaPremium'
import { Aviso } from '../components/Aviso'
import { Barra } from '../components/Barra'
import { BotaoDesfazer } from '../components/BotaoDesfazer'
import { BotaoCompartilhar } from '../components/CompartilharPelada'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import { Subiu } from '../components/Subiu'
import { ListaDeMachucados } from '../components/Machucado'
import type { ConfirmadoNaLista } from '../nuvem/tipos'
import type { Jogador } from '../types/pelada'
import type { Pelada } from '../store/usePelada'
import { SEM_COLETE } from '../utils/cores'
import { useConfirmar } from '../utils/confirmacao'
import { maiusculas, normalizarNome, reais } from '../utils/formatar'
import { compartilharTexto } from '../utils/nativo'
import { useAjudando, useSomenteLeitura } from '../utils/somenteLeitura'
import type { useCobranca } from '../store/cobranca'
import { Pagamentos } from './Pagamentos'

export function Lista({ pelada, cobranca, onApitar }: { pelada: Pelada; cobranca: ReturnType<typeof useCobranca>; onApitar: () => void }) {
  const { app, aplicar } = pelada
  const { estado } = app
  const somenteLeitura = useSomenteLeitura()
  // o organizador se inclui na pelada com a conta (a carta dele conta), sem precisar abrir o próprio link
  const { perfil } = useConta()
  const { apelido } = useDadosDoJogador()
  const minhaConta = perfil && !perfil.anonimo ? perfil.uid : null
  const meuNome = maiusculas(apelido ?? primeiroNome(perfil?.nome) ?? '') || 'EU'
  const [meIncluindo, setMeIncluindo] = useState(false)
  const euNaLista = !!minhaConta && contaNaLista(estado, minhaConta)
  /** Já tem alguém com o meu nome, sem conta (digitado antes): pergunta se sou eu. */
  const meuNomeSemConta = todosOsJogadores(estado).find((jogador) => !jogador.conta && normalizarNome(jogador.nome) === normalizarNome(meuNome))
  const meIncluir = (noGol: boolean, souEuJaNaLista: boolean) => {
    if (!minhaConta) return
    setMeIncluindo(false)
    if (souEuJaNaLista && meuNomeSemConta && !noGol) aplicar((e) => ligarConta(e, meuNomeSemConta.id, minhaConta))
    else aplicar((e) => incluirConta(e, minhaConta, meuNome, noGol))
  }
  const [nome, setNome] = useState('')
  const confirmar = useConfirmar()
  const [repetido, setRepetido] = useState<string | null>(null)
  const [pagamentos, setPagamentos] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const linha = estado.config.linha
  const { coletes } = estado.config
  const blocos = blocosDaFila(estado)
  const emJogo = estado.emCampo !== null

  // Turma: os jogadores de sempre (sugestões ao digitar, "é ele?")
  const turma = useJogadoresDaTurma(somenteLeitura ? null : estado.config.turma)
  const naLista = todosOsJogadores(estado)
  const sugeridos = sugestoes(turma, nome, naLista)
  // link da pelada: quem confirmou e ainda não chegou (o organizador toca em quem chegou)
  const link = useListaDaPelada(pelada, !somenteLeitura)
  const { confirmados } = link
  // nome igual a alguém da lista ou a outro confirmado: o organizador decide quem é quem
  const [mesmoNome, setMesmoNome] = useState<{ confirmado: ConfirmadoNaLista; jogador: { id: string; nome: string } } | null>(null)
  const [escolhendo, setEscolhendo] = useState<ConfirmadoNaLista[] | null>(null)
  // é outra pessoa com o mesmo nome: o organizador inclui o sobrenome
  // confirmado: quem chegou pelo link; null: nome digitado (outra pessoa com o nome de quem foi embora); evitar: o nome que já existe
  const [sobrenome, setSobrenome] = useState<{ confirmado: ConfirmadoNaLista | null; nome: string; evitar?: string } | null>(null)
  // alguém com esse nome jogou hoje e saiu da lista: voltou?
  const [voltou, setVoltou] = useState<Jogador | null>(null)
  const nomeRepetido = (texto: string) => naLista.some((jogador) => normalizarNome(jogador.nome) === normalizarNome(texto))
  const repetidoNoSobrenome = !!sobrenome && (nomeRepetido(sobrenome.nome) || (!!sobrenome.evitar && normalizarNome(sobrenome.nome) === normalizarNome(sobrenome.evitar)))
  const tocouEmQuemChegou = (confirmado: ConfirmadoNaLista) => {
    // já está na pelada com essa conta (ex.: o organizador se incluiu e também confirmou pelo link): só marca
    if (confirmado.comConta && contaNaLista(estado, confirmado.id)) return link.chegou(confirmado)
    const jogador = confirmado.goleiro ? undefined : naLista.find((item) => normalizarNome(item.nome) === normalizarNome(confirmado.nome))
    if (jogador) setMesmoNome({ confirmado, jogador })
    else link.chegou(confirmado)
  }
  const [avisoDoLink, setAvisoDoLink] = useState<string | null>(null)
  const compartilharLink = async () => {
    const endereco = await link.criarLink().catch(() => null)
    if (!endereco) return setAvisoDoLink('Não deu para criar o link. Confira a internet.')
    const texto = `⚽ Vai jogar hoje? Coloque seu nome na lista: ${endereco}`
    if (!(await compartilharTexto({ text: texto }))) { await navigator.clipboard.writeText(texto).catch(() => null); setAvisoDoLink('Link copiado! Cole no grupo.') }
  }
  const [ehEle, setEhEle] = useState<{ nome: string; jogador: JogadorDaTurma } | null>(null)
  /** Quem saiu da lista hoje voltou. Sendo da turma (o mesmo id), é a mesma pessoa e volta direto; senão, pergunta. */
  const voltouOuPergunta = (saiu: Jogador, mesmaPessoa: boolean) => {
    if (!mesmaPessoa) return setVoltou(saiu)
    aplicar((e) => voltouParaALista(e, saiu)) // com a conta, se tinha
    setNome('')
  }
  /** Entra na fila com o id da turma (assim é a mesma pessoa de uma pelada para a outra). */
  const entrar = (j: { id: string; nome: string }) => {
    // tocou na sugestão da turma, mas alguém com esse nome saiu da lista hoje: pode ser ele voltando
    const saiu = quemFoiEmbora(estado, j.nome)
    if (saiu) return voltouOuPergunta(saiu, saiu.id === j.id)
    aplicar((e) => adicionarJogador(e, { id: j.id, nome: j.nome }))
    setNome('')
  }
  const adicionar = (ev: FormEvent) => {
    ev.preventDefault()
    if (!nome.trim()) return
    const existente = naLista.find((j) => normalizarNome(j.nome) === normalizarNome(nome))
    if (existente) {
      setRepetido(existente.nome)
      return
    }
    // já confirmou pelo link: é a mesma pessoa, não cria outra
    const iguais = confirmados.filter((item) => normalizarNome(item.nome) === normalizarNome(nome))
    if (iguais.length > 1) return setEscolhendo(iguais)
    if (iguais.length === 1) { link.chegou(iguais[0]); return setNome('') }
    const saiu = quemFoiEmbora(estado, nome)
    if (saiu) return voltouOuPergunta(saiu, turma.some((j) => j.id === saiu.id))
    const daTurma = turma.find((j) => normalizarNome(j.nome) === normalizarNome(nome))
    if (daTurma) return entrar(daTurma)
    const parecido = parecidoNaTurma(turma, nome)
    if (parecido) return setEhEle({ nome: nome.trim(), jogador: parecido })
    aplicar((e) => adicionarJogador(e, novoJogador(nome)))
    setNome('')
  }
  const remover = (id: string, quem: string) => {
    confirmar({
      titulo: 'Foi embora?', mensagem: `${quem} foi embora? A fila sobe uma posição.`, botao: 'Foi embora', perigo: true,
      aoConfirmar: () => aplicar((e) => removerJogador(e, id)),
    })
  }
  const irParaOGol = (id: string, quem: string) => {
    confirmar({
      titulo: 'Vai para o gol?', mensagem: `${quem} sai da fila e vira goleiro fixo. Os números dele continuam indo para a mesma carta.`, botao: 'Vai para o gol',
      aoConfirmar: () => aplicar((e) => passarParaOGol(e, id)),
    })
  }
  // os três pontinhos do jogador (na fila) ou do goleiro fixo: as ações dele
  const [opcoes, setOpcoes] = useState<{ tipo: 'jogador' | 'goleiro'; id: string; nome: string } | null>(null)
  const goleiroFoiEmbora = (quem: string) => {
    confirmar({
      titulo: 'Foi embora?', mensagem: `${quem} foi embora? Ele sai dos goleiros fixos.`, botao: 'Foi embora', perigo: true,
      aoConfirmar: () => aplicar((e) => definirGoleiros(e, e.config.goleiros.filter((goleiro) => goleiro !== quem))),
    })
  }
  const irParaALinha = (quem: string) => {
    confirmar({
      titulo: 'Vai jogar na linha?', mensagem: `${quem} sai do gol e entra no fim da fila. Os números dele continuam indo para a mesma carta.`, botao: 'Vai para a linha',
      aoConfirmar: () => aplicar((e) => passarParaALinha(e, quem)),
    })
  }
  // Plano pago (PLANO.md, seção 14): a pelada conta no 1º "Apitar" do dia
  const plano = usePlano()
  const [premium, setPremium] = useState(false)
  // quem assumiu o controle da pelada de outra pessoa não gasta o próprio plano (a pelada é do dono)
  const ajudando = useAjudando()
  const apitar = () => {
    const primeiro = estado.historico.length === 0 && !ajudando
    if (primeiro && !plano.podeComecarPelada) return setPremium(true)
    if (primeiro && plano.cobrancaAtiva && !plano.premium) void contarUso('peladas').catch(() => null)
    // primeiro jogo: mistura os jogadores dos 2 primeiros times (se ligado nos Ajustes)
    aplicar((e) => comecar(e.config.sortearInicio ? sortearPrimeirosTimes(e) : e), true)
    onApitar()
  }

  let posicao = 0
  return (
    <div className="scr">
      <Barra
        titulo={emJogo ? 'Fila' : 'Lista'}
        sub={`${estado.fila.length} ${estado.fila.length === 1 ? 'jogador' : 'jogadores'}`}
        direita={somenteLeitura ? undefined : <div className="row" style={{ gap: 6 }}><BotaoCompartilhar /><BotaoDesfazer pelada={pelada} /></div>}
      />
      {!somenteLeitura && <form onSubmit={adicionar} style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', flex: 1 }}>
          <span className="vh">Nome do jogador</span>
          <input ref={campo} className="inp" placeholder={emJogo ? 'Chegou atrasado?' : 'Quem chegou?'} value={nome}
            onChange={(ev) => setNome(maiusculas(ev.target.value))} autoCapitalize="characters" enterKeyHint="done" />
        </label>
        <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar jogador">
          <Icone nome="mais" />
        </button>
      </form>}
      {/* sugestões da turma enquanto digita */}
      {!somenteLeitura && sugeridos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px 0', scrollbarWidth: 'none' }} aria-label="Sugestões da turma">
          {sugeridos.map((j) => (
            <button key={j.id} className="chip" style={{ flex: 'none', textTransform: 'none', background: '#fff' }} onClick={() => { entrar(j); campo.current?.focus() }}>
              {j.nome} <span className="mut" style={{ fontSize: 12 }}>· {j.peladas}</span>
            </button>
          ))}
        </div>
      )}

      {!somenteLeitura && (
        <div className="opcoes-lado-a-lado" style={{ margin: '8px 12px 0', gridTemplateColumns: minhaConta && !euNaLista ? '1fr 1fr' : '1fr' }}>
          <button className="btn w sm" style={{ textTransform: 'none' }} onClick={() => void compartilharLink()}>
            <Icone nome="compartilhar" tamanho={20} /> Link de presença
          </button>
          {minhaConta && !euNaLista && (
            <button className="btn w sm" style={{ textTransform: 'none' }} onClick={() => setMeIncluindo(true)}>
              <Icone nome="mais" tamanho={20} /> Me incluir
            </button>
          )}
        </div>
      )}
      {meIncluindo && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Me incluir na lista" onClick={() => setMeIncluindo(false)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Você vai jogar?</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              {meuNomeSemConta
                ? <span style={{ fontWeight: 600, lineHeight: 1.35 }}>Já tem um <b>{meuNomeSemConta.nome}</b> na lista. É você? Assim os jogos dele vão para a sua carta.</span>
                : <span style={{ fontWeight: 600, lineHeight: 1.35 }}>Você entra como <b>{meuNome}</b>, ligado à sua conta: os seus jogos vão para a sua carta.</span>}
              <div className="opcoes-lado-a-lado">
                <button className="btn sm" onClick={() => meIncluir(false, true)}>{meuNomeSemConta ? 'Sou eu' : 'Na linha'}</button>
                <button className="btn sm w" onClick={() => meIncluir(!meuNomeSemConta, false)}>{meuNomeSemConta ? 'Não, outro' : 'No gol'}</button>
              </div>
              <button className="lnk" style={{ justifySelf: 'center' }} onClick={() => setMeIncluindo(false)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {avisoDoLink && <div className="mut" style={{ margin: '6px 12px 0', color: '#fff', fontWeight: 600 }}>{avisoDoLink}</div>}
      {/* campo pago: quantos já pagaram; abre QR Pix, link para o grupo e a lista de pagamentos */}
      {!somenteLeitura && estado.config.pagamento.ativo && (() => {
        const r = resumoPagamentos(estado)
        return (
          <button className="panel row" style={{ margin: '10px 12px 0', padding: '8px 10px', cursor: 'pointer', font: 'inherit', color: 'var(--navy)', textAlign: 'left' }}
            onClick={() => setPagamentos(true)}>
            <span className="num" style={{ fontSize: 20 }}>💰</span>
            <span style={{ flex: 1, fontWeight: 700 }}>Campo · {reais(r.valor)} cada</span>
            {r.avisaram > 0 && <span className="tag" style={{ background: 'var(--amarelo)' }}>{r.avisaram} avisou</span>}
            <span className={'tag ' + (r.pagos === r.pessoas && r.pessoas ? 't-ok' : 't-warn')}>{r.pagos}/{r.pessoas} pagos</span>
          </button>
        )
      })()}
      {pagamentos && <Pagamentos pelada={pelada} cobranca={cobranca} onFechar={() => setPagamentos(false)} />}
      {mesmoNome && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Mesmo nome" onClick={() => setMesmoNome(null)}>
          <section className="panel" style={{ color: 'var(--navy)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Já tem um {mesmoNome.jogador.nome}</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>É a mesma pessoa que já está na lista?</span>
              <button className="btn" onClick={() => { link.mesmaPessoa(mesmoNome.confirmado, mesmoNome.jogador.id); setMesmoNome(null) }}>Sim, é a mesma pessoa</button>
              <button className="btn w sm" onClick={() => { setSobrenome({ confirmado: mesmoNome.confirmado, nome: `${maiusculas(mesmoNome.confirmado.nome)} ` }); setMesmoNome(null) }}>Não, é outra pessoa</button>
            </div>
          </section>
        </div>
      )}
      {voltou && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`${voltou.nome} voltou?`} onClick={() => setVoltou(null)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">{voltou.nome} voltou?</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{voltou.nome} saiu da lista hoje. É a mesma pessoa voltando?</span>
              <button className="btn" onClick={() => { aplicar((e) => voltouParaALista(e, voltou)); setVoltou(null); setNome('') }}>Sim, voltou</button>
              <button className="btn w sm" onClick={() => { setSobrenome({ confirmado: null, nome: `${maiusculas(voltou.nome)} `, evitar: voltou.nome }); setVoltou(null) }}>Não, é outra pessoa</button>
            </div>
          </section>
        </div>
      )}
      {sobrenome && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Inclua o sobrenome" onClick={() => setSobrenome(null)}>
          <form className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}
            onSubmit={(ev) => {
              ev.preventDefault()
              if (repetidoNoSobrenome) return
              if (sobrenome.confirmado) link.chegou(sobrenome.confirmado, sobrenome.nome.trim())
              else { aplicar((e) => adicionarJogador(e, novoJogador(sobrenome.nome))); setNome('') }
              setSobrenome(null)
            }}>
            <div className="ph">Inclua o sobrenome</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Para diferenciar os dois na lista:</span>
              <label style={{ display: 'flex' }}>
                <span className="vh">Nome com sobrenome</span>
                <input className="inp" autoFocus maxLength={20} placeholder="BRUNO LANDIM" value={sobrenome.nome} autoCapitalize="characters"
                  onChange={(ev) => setSobrenome({ ...sobrenome, nome: maiusculas(ev.target.value) })} />
              </label>
              {repetidoNoSobrenome && <span className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{nomeRepetido(sobrenome.nome) ? 'Esse nome já está na lista.' : 'Esse nome já jogou hoje.'}</span>}
              <button className="btn" type="submit" disabled={!sobrenome.nome.trim() || repetidoNoSobrenome}>Colocar na fila</button>
            </div>
          </form>
        </div>
      )}
      {escolhendo && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Qual deles chegou" onClick={() => setEscolhendo(null)}>
          <section className="panel" style={{ color: 'var(--navy)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Qual deles chegou?</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              {escolhendo.map((confirmado, indice) => (
                <button key={confirmado.id} className="btn w sm" onClick={() => { setEscolhendo(null); setNome(''); tocouEmQuemChegou(confirmado) }}>
                  {confirmado.nome} · {confirmado.comConta ? 'com conta' : `sem conta ${indice + 1}`}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="conteudo lado-a-lado">
        {!somenteLeitura && confirmados.length > 0 && (
          <section className="panel inteiro">
            <div className="ph">Confirmados<span className="sub">toque em quem chegou</span></div>
            {confirmados.map((confirmado) => (
              <button key={confirmado.id} className="tr" style={{ width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer' }}
                aria-label={`${confirmado.nome} chegou`} onClick={() => tocouEmQuemChegou(confirmado)}>
                <span className="nome">{confirmado.nome}</span>
                {confirmado.goleiro && <span className="tag">Goleiro</span>}
                <span className="tag t-y">Chegou</span>
              </button>
            ))}
          </section>
        )}
        {/* goleiros fixos: separados da fila (ficam no gol a pelada toda) */}
        {estado.config.goleiros.length > 0 && (
          <section className="panel">
            <div className="ph">Goleiros fixos<span className="sub">{estado.config.goleiros.length}</span></div>
            {estado.config.goleiros.map((goleiro) => (
              <div key={goleiro} className="tr">
                <span className="no g">G</span>
                <span className="nome" style={{ flex: '0 1 auto' }}>{goleiro}</span>
                <span className="mut" style={{ flex: 1, fontSize: 12 }}>{estado.goleiros.A === goleiro || estado.goleiros.B === goleiro ? 'no gol' : 'esperando'}</span>
                {!somenteLeitura && (
                  <button className="ib g" aria-label={`Opções de ${goleiro}`} onClick={() => setOpcoes({ tipo: 'goleiro', id: goleiro, nome: goleiro })}>
                    <Icone nome="opcoes" tamanho={20} />
                  </button>
                )}
              </div>
            ))}
          </section>
        )}
        {blocos.length === 0 && (
          <div className="vazio">{emJogo ? 'Ninguém esperando. Quem perder vem para cá.' : 'Adicione os nomes na ordem de chegada.'}</div>
        )}
        {blocos.map((bloco, i) => {
          const numero = estado.filaTimes[i]
          const falta = linha - bloco.length
          // Antes de apitar, os dois primeiros times já vestem os coletes
          const colete = !emJogo && i < 2 ? coletes[LADOS[i]] : null
          const posicaoNaFila = emJogo ? i : i - 2
          const proximo = posicaoNaFila === 0
          return (
            <section key={numero} className={'panel' + (proximo && emJogo ? ' destaque' : '')}>
              <div className="ph">
                <span className="row" style={{ gap: 8 }}>
                  <Camisa cor={colete?.cor ?? SEM_COLETE} contorno="#fff" />
                  <span>
                    Time {numero}
                    <span style={{ display: 'block', fontSize: 12, color: '#c9d4e3', letterSpacing: 1 }}>
                      {colete ? colete.nome : proximo ? 'Próximo' : `${posicaoNaFila + 1}º da fila`}
                    </span>
                  </span>
                </span>
                <span className={'tag ' + (falta ? 't-warn' : 't-ok')}>{falta ? `faltam ${falta}` : `${bloco.length}/${linha}`}</span>
              </div>
              <div>
                {bloco.map((j) => {
                  posicao++
                  return (
                    <div key={j.id} className="tr">
                      <span className="no">{posicao}</span>
                      <span className="nome" style={{ flex: '0 1 auto' }}>{j.nome}</span>
                      <Subiu de={subiuDe(estado, j.id)} />
                      <span style={{ flex: 1 }} />
                      {!somenteLeitura && (
                        <button className="ib g" aria-label={`Opções de ${j.nome}`} onClick={() => setOpcoes({ tipo: 'jogador', id: j.id, nome: j.nome })}>
                          <Icone nome="opcoes" tamanho={20} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {Array.from({ length: falta }, (_, k) => (
                  <div key={k} className="slot"><span className="no">?</span>{emJogo ? `vaga · ${k + 1}º de quem perder` : 'vaga'}</div>
                ))}
              </div>
            </section>
          )
        })}
        <ListaDeMachucados pelada={pelada} />
      </div>

      {opcoes && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Opções de ${opcoes.nome}`} onClick={() => setOpcoes(null)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">{opcoes.nome}{opcoes.tipo === 'goleiro' && <span className="sub">goleiro fixo</span>}</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <div className="opcoes-lado-a-lado">
                {opcoes.tipo === 'jogador'
                  ? <button className="btn sm" onClick={() => { setOpcoes(null); irParaOGol(opcoes.id, opcoes.nome) }}><Icone nome="luva" tamanho={20} /> Vai para o gol</button>
                  : <button className="btn sm" onClick={() => { setOpcoes(null); irParaALinha(opcoes.nome) }}><Icone nome="times" tamanho={20} /> Vai para a linha</button>}
                <button className="btn sm r" onClick={() => { setOpcoes(null); if (opcoes.tipo === 'jogador') remover(opcoes.id, opcoes.nome); else goleiroFoiEmbora(opcoes.nome) }}>
                  <Icone nome="saiu" tamanho={20} /> Foi embora
                </button>
              </div>
              <button className="lnk" style={{ justifySelf: 'center' }} onClick={() => setOpcoes(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {/* nome novo parecido com alguém da turma */}
      {ehEle && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-label="É ele?" onClick={() => setEhEle(null)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">É ele?</div>
            <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>
              <b>{ehEle.nome}</b> parece com <b>{ehEle.jogador.nome}</b>, da turma ({ehEle.jogador.peladas} {ehEle.jogador.peladas === 1 ? 'pelada' : 'peladas'}).
            </div>
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gap: 8 }}>
              <button className="btn sm" onClick={() => { entrar(ehEle.jogador); setEhEle(null) }}>Sim, é o {ehEle.jogador.nome}</button>
              <button className="btn w sm" onClick={() => { aplicar((e) => adicionarJogador(e, novoJogador(ehEle.nome))); setNome(''); setEhEle(null) }}>
                Não, é outra pessoa
              </button>
            </div>
          </section>
        </div>
      )}
      {premium && <TelaPremium motivo="peladas" jogadores={todosOsJogadores(estado).length} onFechar={() => setPremium(false)} />}
      {repetido && (
        <Aviso titulo="Nome repetido" onFechar={() => { setRepetido(null); campo.current?.focus() }}>
          Já tem um <b>{repetido}</b> na lista. Adicione o sobrenome ou um apelido.
        </Aviso>
      )}

      {!emJogo && !somenteLeitura && (
        <div className="rodape">
          <button className="btn" disabled={!podeComecar(estado)} onClick={apitar}>
            {estado.config.sortearInicio && estado.historico.length === 0 ? 'Sortear e apitar' : 'Apitar'} · Time {estado.filaTimes[0]} x Time {estado.filaTimes[1]}
          </button>
        </div>
      )}
    </div>
  )
}
