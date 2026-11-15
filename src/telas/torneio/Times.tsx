import { useState, type CSSProperties, type ReactNode } from 'react'
import { LuvaDoGoleiro } from '../../components/LuvaDoGoleiro'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { NomeDoJogador } from '../../components/Bracadeira'
import { ehCapitao, adicionarTime, editarTime, partesDoTime, novoTime, numerosDasCamisas, removerTime, timesJogando } from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { TimeTorneio } from '../../types/torneio'
import { CORES_TORNEIO, textoSobre } from '../../utils/cores'
import { EditorDeTime } from './EditorDeTime'
import { EncontrarMeuNome, useEsseSouEu } from './EsseSouEu'
import { NumerosDasCamisas } from './NumerosDasCamisas'
import { TelaPremium } from '../../components/TelaPremium'
import { usePlano } from '../../store/plano'
import type { InscricaoHook } from '../../store/inscricaoDoTorneio'
import { compartilharTexto } from '../../utils/nativo'

/** Linha do jogador: vira botão (o nome tocável do "esse sou eu") só quando dá para tocar. */
function Linha({ tocavel, onTocar, rotulo, style, children }: { tocavel: boolean; onTocar: () => void; rotulo: string; style?: CSSProperties; children: ReactNode }) {
  if (!tocavel) return <div className="tr" style={style}>{children}</div>
  return <button className="tr linha-jogador" style={{ ...style, width: '100%', fontSize: 15, fontWeight: 600, padding: '0 10px', gap: 10 }} aria-label={rotulo} onClick={onTocar}>{children}</button>
}

// Lista dos times do torneio, com titulares, reservas e goleiro. Abre o editor.
export function Times({ hook, inscricao, onSorteio }: { hook: TorneioHook; inscricao: InscricaoHook; onSorteio: () => void }) {
  const torneio = hook.torneio!
  const [editando, setEditando] = useState<TimeTorneio | null>(null)
  const [premium, setPremium] = useState(false)
  const [numerando, setNumerando] = useState<TimeTorneio | null>(null) // time em campo trocando só os números das camisas
  const plano = usePlano()
  // "esse sou eu": quem joga (sem ser ligado ainda) toca no próprio nome na lista
  const esseSouEu = useEsseSouEu(torneio, !hook.souOrganizador ? torneio.nuvem?.codigo ?? null : null)
  const [avisoDoLink, setAvisoDoLink] = useState<string | null>(null)
  const { linha } = torneio.regras
  // Time em campo não pode ser editado (a escalação do jogo depende dele)
  const emCampo = [...timesJogando(torneio)]

  if (editando) {
    const existe = torneio.times.some((t) => t.id === editando.id)
    return (
      <EditorDeTime torneio={torneio} inicial={editando}
        onCancelar={() => setEditando(null)}
        onSalvar={(time) => {
          if (existe) inscricao.aoSalvarTime(editando, time)
          hook.aplicar((t) => (existe ? editarTime(t, time.id, () => time) : adicionarTime(t, time)))
          setEditando(null)
        }}
        onExcluir={existe && !torneio.sorteado ? () => { inscricao.aoExcluirTime(editando); hook.aplicar((t) => removerTime(t, editando.id)); setEditando(null) } : undefined}
      />
    )
  }

  // cor do time novo: a menos usada (com mais de 21 times, as cores se repetem)
  const criarTime = () => {
    // torneio grátis: até 8 times (PLANO.md, seção 14.1); com o Ultimate, sem limite
    if (torneio.limiteDeTimes && !plano.ultimate && torneio.times.length >= torneio.limiteDeTimes) return setPremium(true)
    const vezes = (cor: string) => torneio.times.filter((t) => t.cor === cor).length
    const cor = [...CORES_TORNEIO].sort((a, b) => vezes(a.cor) - vezes(b.cor))[0].cor
    setEditando(novoTime(`TIME ${torneio.times.length + 1}`, cor))
  }

  const compartilharInscricao = async () => {
    setAvisoDoLink(null)
    const endereco = await inscricao.criarLink().catch(() => null)
    if (!endereco) return setAvisoDoLink('Não deu para criar o link. Confira a internet.')
    const texto = `🏆 ${torneio.nome}: capitão, inscreva o seu time pelo link e depois mande o link do time para os seus jogadores: ${endereco}`
    if (!(await compartilharTexto({ text: texto }))) { await navigator.clipboard.writeText(texto).catch(() => null); setAvisoDoLink('Link copiado! Cole no grupo dos capitães.') }
  }

  return (
    <div className="scr">
      <Barra titulo={`Times · ${torneio.times.length}`} sub={torneio.nome} />
      <div className="conteudo">
        {/* "esse sou eu": quem joga toca no próprio nome na lista (liga na hora) */}
        {torneio.nuvem && !hook.souOrganizador && <EncontrarMeuNome torneio={torneio} codigo={torneio.nuvem.codigo} />}
        {inscricao.disponivel && !torneio.sorteado && (
          <section className="panel">
            <div className="ph">Inscrição pelo link{inscricao.codigo && <span className="sub">{inscricao.inscritos} {inscricao.inscritos === 1 ? 'time' : 'times'}</span>}</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <span className="mut">Cada capitão inscreve o time e manda o link do time para os jogadores. Eles entram com a conta ou só com o nome. Fecha no sorteio.</span>
              <button className="btn sm" onClick={() => void compartilharInscricao()}><Icone nome="compartilhar" tamanho={18} /> {inscricao.codigo ? 'Mandar o link de novo' : 'Link para os capitães'}</button>
              {avisoDoLink && <span role="status" className="mut" style={{ fontWeight: 600 }}>{avisoDoLink}</span>}
            </div>
          </section>
        )}
        {torneio.times.length === 0 && <div className="vazio">Cadastre os times: nome, cor, goleiro e jogadores.</div>}
        {torneio.times.map((time) => (
          <section key={time.id} className="panel">
            <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
              <span className="row num" style={{ gap: 8, fontSize: 20 }}>
                <Camisa cor={time.cor} uniforme={time.uniforme} tamanho={24} contorno={textoSobre(time.cor)} />{time.nome}
              </span>
              {!hook.souOrganizador ? null : emCampo.includes(time.id)
                // em campo: não edita o time (a escalação do jogo depende dele), mas o número da camisa pode
                ? <span className="row" style={{ gap: 6, flex: 'none' }}>
                  <span className="tag" style={{ background: 'transparent', color: 'inherit', padding: 0 }}>Em campo</span>
                  <button className="tag t-y" style={{ border: '1px solid #0b1a2c', cursor: 'pointer' }} onClick={() => setNumerando(time)}>Números</button>
                </span>
                : <button className="tag t-y" style={{ border: '1px solid #0b1a2c', cursor: 'pointer' }} onClick={() => setEditando(time)}>
                  <Icone nome="editar" tamanho={14} /> Editar
                </button>}
            </div>
            {(() => {
              const { goleiro, titulares, reservas } = partesDoTime(time, linha)
              return [...(goleiro ? [goleiro] : []), ...titulares, ...reservas].map((jogador) => {
                const reserva = reservas.includes(jogador)
                return (
                  <Linha key={jogador.id} tocavel={esseSouEu.podeTocar && !jogador.conta} style={{ color: reserva ? 'var(--mut)' : undefined }}
                    onTocar={() => esseSouEu.pedir(jogador.id, jogador.nome, time.nome)} rotulo={`Sou o ${jogador.nome}`}>
                    <NumeroDaCamisa numero={jogador.camisa} goleiro={jogador === goleiro} reserva={reserva} cor={time.cor} />
                    <NomeDoJogador nome={jogador.nome} capitao={ehCapitao(time, jogador)} />
                    {reserva ? <span className="tag" style={{ background: 'var(--divisoria)' }}>Reserva</span>
                      : jogador === goleiro && <LuvaDoGoleiro cor={time.cor} segunda={time.uniforme?.segunda} tamanho={28} rotulo="goleiro" />}
                  </Linha>
                )
              })
            })()}
          </section>
        ))}
        {!torneio.sorteado && hook.souOrganizador && (
          <button className="btn w" onClick={criarTime}><Icone nome="mais" /> Novo time</button>
        )}
      </div>
      {!torneio.sorteado && hook.souOrganizador && torneio.times.length >= 2 && (
        <div className="rodape">
          <button className="btn" onClick={onSorteio}>Ir para o sorteio <Icone nome="seta" /></button>
        </div>
      )}
      {premium && <TelaPremium motivo="times" onFechar={() => setPremium(false)} />}
      {numerando && (
        <NumerosDasCamisas time={numerando} onCancelar={() => setNumerando(null)}
          onSalvar={(numeros) => { hook.aplicar((t) => numerosDasCamisas(t, numerando.id, numeros)); setNumerando(null) }} />
      )}
    </div>
  )
}
