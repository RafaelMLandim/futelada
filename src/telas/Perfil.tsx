import { useRef, useState } from 'react'
import { Barra } from '../components/Barra'
import { CartaDoJogador } from '../components/CartaDoJogador'
import { Carrossel } from '../components/CarrosselDeTurmas'
import { Icone } from '../components/Icone'
import { Insignias } from '../components/Insignias'
import { conquistaLendaria, conquistasDaCarta, nivelDaCarta, numerosDaCarta, peladasDaTemporada, temporadasDaCarta, turmasDaCarta } from '../logic/carta'
import { primeiroNome, useCarta, useDadosDoJogador } from '../store/carta'
import { useConta } from '../store/conta'
import { fotoDoJogador } from '../utils/foto'
import { AjustarFoto } from '../components/AjustarFoto'
import { maiusculas } from '../utils/formatar'
import { compartilharImagem, imagemDaCarta, nomeDoArquivo, type InsigniaNaImagem } from '../utils/resumoDaPelada'


// Perfil de quem entrou: a carta da temporada (ou de uma turma), as conquistas e a foto. As temporadas passadas ficam guardadas.
export function Perfil() {
  const { perfil } = useConta()
  const peladas = useCarta()
  const { foto, apelido, carregado, fotoRemovida, salvar } = useDadosDoJogador()
  // até saber a foto escolhida, nenhuma: a da conta do Google piscava antes da certa
  const fotoDaCarta = carregado ? (foto ?? perfil?.foto ?? null) : null
  const [editandoApelido, setEditandoApelido] = useState<string | null>(null)
  const [anoAtual] = useState(() => new Date().getFullYear())
  const [temporada, setTemporada] = useState(anoAtual)
  const [turma, setTurma] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtrando, setFiltrando] = useState(false)
  const [compartilhando, setCompartilhando] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)
  const nome = apelido ?? (primeiroNome(perfil?.nome) || 'Jogador')
  const temporadas = temporadasDaCarta(peladas ?? [], anoAtual)
  const daTemporada = peladasDaTemporada(peladas ?? [], temporada)
  const turmas = turmasDaCarta(daTemporada)
  // uma carta por turma (cor e conquistas só daquela turma) e a de todas as peladas; com uma turma só, uma carta
  const cartas = turmas.length > 1 ? [null, ...turmas.map((item) => item.id)] : [null]
  const daCarta = (id: string | null) => {
    const peladasDaCarta = id ? daTemporada.filter((pelada) => pelada.turma === id) : daTemporada
    const conquistasDaTurma = conquistasDaCarta(peladasDaCarta)
    return {
      numeros: numerosDaCarta(daTemporada, id), conquistas: conquistasDaTurma, nivel: nivelDaCarta(conquistasDaTurma),
      nomeDaTurma: (id && turmas.find((item) => item.id === id)?.nome) || 'Todas as peladas',
    }
  }
  const atual = daCarta(turma)
  const { numeros, conquistas, nivel } = atual
  const rotulo = `${temporada} · ${atual.nomeDaTurma}`
  const podeFiltrar = temporadas.length > 1
  const indiceAtual = Math.max(0, cartas.indexOf(turma))
  const trilho = useRef<HTMLDivElement>(null)
  /** Deslizou: a carta mais perto do meio passa a ser a escolhida. */
  const aoDeslizar = () => {
    const elemento = trilho.current
    if (!elemento) return
    const meio = elemento.scrollLeft + elemento.clientWidth / 2
    let maisPerto = 0
    Array.from(elemento.children).forEach((filho, indice) => {
      const centro = (filho as HTMLElement).offsetLeft + (filho as HTMLElement).offsetWidth / 2
      const melhor = elemento.children[maisPerto] as HTMLElement
      if (Math.abs(centro - meio) < Math.abs(melhor.offsetLeft + melhor.offsetWidth / 2 - meio)) maisPerto = indice
    })
    if (cartas[maisPerto] !== turma) setTurma(cartas[maisPerto] ?? null)
  }
  const irParaCarta = (indice: number) => {
    const filho = trilho.current?.children[indice] as HTMLElement | undefined
    filho?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  /** As 5 melhores conquistas da carta na tela (a Lenda primeiro, depois ouro, prata e bronze), com o desenho da flâmula. */
  const melhoresInsignias = (): InsigniaNaImagem[] => {
    const NIVEIS = { ouro: [3, 'Ouro'], prata: [2, 'Prata'], bronze: [1, 'Bronze'] } as const
    const lista = [...conquistas, conquistaLendaria(peladas ?? [])]
    const flamulas = document.querySelectorAll('.insignias .insignia .flamula')
    return lista
      .map((conquista, indice) => ({ conquista, flamula: flamulas[indice] as SVGSVGElement | undefined }))
      .filter(({ conquista, flamula }) => conquista.nivel && !conquista.negativa && flamula)
      .sort((uma, outra) => (outra.conquista.especial ? 4 : NIVEIS[outra.conquista.nivel!][0]) - (uma.conquista.especial ? 4 : NIVEIS[uma.conquista.nivel!][0]))
      .slice(0, 5)
      .map(({ conquista, flamula }) => {
        const copia = flamula!.cloneNode(true) as SVGSVGElement
        copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        copia.setAttribute('width', '240')
        copia.setAttribute('height', '248')
        return {
          imagem: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copia)),
          nome: conquista.nome, nivel: conquista.especial ? 'Carta lendária' : NIVEIS[conquista.nivel!][1], destaque: conquista.especial,
        }
      })
  }
  const compartilhar = async () => {
    setErro(null)
    setCompartilhando(true)
    await imagemDaCarta({ nome, foto: fotoDaCarta, numeros, rotulo, nivel, titulo: atual.nomeDaTurma, subtitulo: `Temporada ${temporada}`, insignias: melhoresInsignias() })
      .then((imagem) => compartilharImagem(imagem, nomeDoArquivo('minha-carta')))
      .catch(() => setErro('Não deu para gerar a imagem. Tente de novo.'))
    setCompartilhando(false)
  }

  const salvarFoto = async (nova: string | null) => {
    setErro(null)
    setSalvando(true)
    await salvar({ foto: nova }).catch(() => setErro('Não deu para salvar a foto. Confira a internet e tente de novo.'))
    setSalvando(false)
  }
  const [dicaDaFoto, setDicaDaFoto] = useState(false)
  const [editando, setEditando] = useState(false) // o lápis: trocar a foto ou o apelido (vale para todas as cartas)
  const [recortando, setRecortando] = useState(false)
  const [comFundo, setComFundo] = useState(false) // o recorte não deu certo: a foto ficou com fundo, na moldura
  const [ajustando, setAjustando] = useState<File | null>(null) // foto escolhida, antes de enquadrar
  const aoEscolher = (arquivo: File | undefined) => {
    if (!arquivo) return
    setErro(null)
    setAjustando(arquivo)
  }
  /** Depois de enquadrar: tira o fundo e salva. */
  // "Usar foto": daqui até a foto aparecer (tirar o fundo e salvar) leva alguns segundos; a janela de espera
  // aparece na hora, e um segundo toque não começa outro recorte
  const [preparandoFoto, setPreparandoFoto] = useState(false)
  const usarFoto = async (arquivo: Blob) => {
    if (preparandoFoto) return
    setPreparandoFoto(true)
    try { await prepararESalvar(arquivo) } finally { setPreparandoFoto(false) }
  }
  const prepararESalvar = async (arquivo: Blob) => {
    setAjustando(null)
    setErro(null)
    setComFundo(false)
    const nova = await fotoDoJogador(arquivo, () => setRecortando(true)).catch(() => null)
    setRecortando(false)
    if (!nova) return setErro('Não deu para abrir essa imagem. Escolha outra.')
    await salvarFoto(nova.foto)
    setComFundo(!nova.semFundo)
  }

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Meu perfil" sub={`Temporada ${temporada} · ${numeros.peladas} ${numeros.peladas === 1 ? 'pelada' : 'peladas'}`} />
      <div className="conteudo">
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rotulo}
            {cartas.length > 1 && <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#c9d4e3' }}>{indiceAtual + 1} de {cartas.length} · deslize para ver as outras</span>}
          </span>
          <span className="row" style={{ gap: 8, flex: 'none' }}>
            <button className="ib" style={{ width: 38, height: 38 }} aria-label="Editar a carta" disabled={salvando || recortando} onClick={() => setEditando(true)}><Icone nome="editar" tamanho={20} /></button>
            <button className="ib" style={{ width: 38, height: 38 }} aria-label="Compartilhar minha carta" disabled={compartilhando} onClick={() => void compartilhar()}><Icone nome="compartilhar" tamanho={20} /></button>
            {podeFiltrar && <button className="btn w sm" style={{ width: 'auto', height: 38, padding: '0 14px', fontSize: 15, textTransform: 'none' }} onClick={() => setFiltrando(true)}>Filtrar</button>}
          </span>
        </div>

        <input ref={seletor} className="vh" type="file" accept="image/*" aria-label="Escolher foto" tabIndex={-1}
          onChange={(ev) => { aoEscolher(ev.target.files?.[0]); ev.target.value = '' }} />
        {cartas.length === 1
          ? <CartaDoJogador nome={nome} foto={fotoDaCarta} numeros={numeros} rotulo={rotulo} nivel={nivel} />
          : (
            <>
              <div ref={trilho} className="cartas-deslizar" onScroll={aoDeslizar} aria-label="Cartas por turma">
                {cartas.map((id, indice) => {
                  const carta = daCarta(id)
                  return (
                    <div key={id ?? 'todas'} className={'carta-da-turma' + (indice === indiceAtual ? ' atual' : '')} onClick={() => indice !== indiceAtual && irParaCarta(indice)}>
                      <CartaDoJogador nome={nome} foto={fotoDaCarta} numeros={carta.numeros} rotulo={`${temporada} · ${carta.nomeDaTurma}`} nivel={carta.nivel} />
                    </div>
                  )
                })}
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
                {cartas.map((id, indice) => (
                  <button key={id ?? 'todas'} className={'ponto-da-carta' + (indice === indiceAtual ? ' atual' : '')} aria-label={`Ver a carta ${daCarta(id).nomeDaTurma}`} onClick={() => irParaCarta(indice)} />
                ))}
              </div>
            </>
          )}
        {(preparandoFoto || recortando || salvando) && (
          <div className="modal" role="dialog" aria-modal="true" aria-label="Preparando sua foto">
            <section className="panel pb" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', color: 'var(--navy)', width: '100%', maxWidth: 300 }}>
              <span className="carregando" aria-hidden="true" />
              <b className="num" style={{ fontSize: 22 }}>{salvando ? 'Salvando a foto…' : 'Preparando sua foto'}</b>
              {!salvando && <span className="mut">Tirando o fundo · leva alguns segundos</span>}
            </section>
          </div>
        )}
        {fotoRemovida && !foto && (
          <div className="panel pb" style={{ display: 'grid', gap: 8, color: 'var(--navy)' }}>
            <b>Sua foto foi removida</b>
            <span className="mut" style={{ lineHeight: 1.35 }}>Outros jogadores denunciaram a foto ou o apelido, e eles saíram do app. Você pode escolher outra foto no lápis da carta.</span>
          </div>
        )}
        {erro && <div className="panel pb mut" style={{ textAlign: 'center', color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
        {comFundo && !salvando && (
          <div className="panel pb" style={{ display: 'grid', gap: 8, color: 'var(--navy)' }}>
            <b>Não deu para tirar o fundo dessa foto</b>
            <span className="mut" style={{ lineHeight: 1.35 }}>Ela ficou na moldura. Para aparecer sem fundo, use uma foto de perto, só você, com fundo liso.</span>
            <div className="opcoes-lado-a-lado">
              <button className="btn sm" onClick={() => { setComFundo(false); setDicaDaFoto(true) }}><Icone nome="camera" tamanho={20} /> Outra foto</button>
              <button className="btn w sm" onClick={() => setComFundo(false)}>Deixar assim</button>
            </div>
          </div>
        )}

        <Insignias conquistas={[...conquistas, conquistaLendaria(peladas ?? [])]} />

        {peladas?.length === 0 && (
          <div className="panel pb mut" style={{ textAlign: 'center' }}>Sua carta começa no primeiro jogo com a conta.</div>
        )}
      </div>
      {editando && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Editar a carta" onClick={() => setEditando(false)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Editar a carta</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <span className="mut" style={{ textAlign: 'center' }}>Vale para todas as suas cartas.</span>
              <div className="opcoes-lado-a-lado">
                <button className="btn sm" onClick={() => { setEditando(false); setDicaDaFoto(true) }}><Icone nome="camera" tamanho={20} /> Foto</button>
                <button className="btn sm" onClick={() => { setEditando(false); setEditandoApelido(nome) }}><Icone nome="editar" tamanho={20} /> Apelido</button>
              </div>
              {foto && (
                <button className="btn w sm" onClick={() => { setEditando(false); void salvar({ foto: null }).catch(() => setErro('Não deu para remover a foto. Confira a internet e tente de novo.')) }}>
                  <Icone nome="lixo" tamanho={20} /> Remover foto
                </button>
              )}
              <button className="lnk" style={{ justifySelf: 'center' }} onClick={() => setEditando(false)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {ajustando && <AjustarFoto arquivo={ajustando} aoUsar={(foto) => void usarFoto(foto)} aoCancelar={() => setAjustando(null)} />}
      {dicaDaFoto && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Sua foto" onClick={() => setDicaDaFoto(false)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Sua foto na carta</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600, lineHeight: 1.35 }}>O app tira o fundo da foto e deixa só você. Selecione uma foto em que:</span>
              <ul className="dicas-da-foto">
                {['Você esteja sozinho', 'O fundo seja simples, como uma parede branca', 'A iluminação seja boa, para ficar legal'].map((dica) => (
                  <li key={dica}><Icone nome="certo" tamanho={18} /> {dica}</li>
                ))}
              </ul>
              <span className="mut" style={{ lineHeight: 1.35 }}>Já tem uma foto sem fundo? Ela entra do jeito que está.</span>
              <button className="btn" onClick={() => { setDicaDaFoto(false); seletor.current?.click() }}><Icone nome="camera" tamanho={20} /> Escolher foto</button>
              <button className="lnk" style={{ justifySelf: 'center' }} onClick={() => setDicaDaFoto(false)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {editandoApelido !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Seu apelido" onClick={() => setEditandoApelido(null)}>
          <form className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}
            onSubmit={(ev) => { ev.preventDefault(); const novo = editandoApelido.trim(); setEditandoApelido(null); if (novo) void salvar({ apelido: novo }).catch(() => setErro('Não deu para salvar o apelido.')) }}>
            <div className="ph">Seu apelido</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <span className="mut">É como você aparece na lista, na carta e na seleção.</span>
              <label style={{ display: 'flex' }}>
                <span className="vh">Apelido</span>
                <input className="inp" autoFocus maxLength={20} value={editandoApelido} autoCapitalize="characters" onChange={(ev) => setEditandoApelido(maiusculas(ev.target.value))} />
              </label>
              <button className="btn" type="submit" disabled={!editandoApelido.trim()}>Salvar</button>
            </div>
          </form>
        </div>
      )}
      {filtrando && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Filtrar a carta" onClick={() => setFiltrando(false)}>
          <section className="panel" style={{ color: 'var(--navy)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Filtrar</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              {temporadas.length > 1 && (
                <Carrossel itens={[...temporadas].reverse()} atual={temporada} onEscolher={(ano) => { setTemporada(ano); setTurma(null); trilho.current?.scrollTo({ left: 0 }) }} nome={(ano) => `Temporada ${ano}`}
                  rotulo={{ anterior: 'Temporada anterior', proximo: 'Próxima temporada' }} />
              )}
              <button className="btn" onClick={() => setFiltrando(false)}>Ver a carta</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
