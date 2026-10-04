import { useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../components/Aviso'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { novoJogador } from '../../logic'
import type { TimeTorneio, Torneio } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { CORES_TORNEIO } from '../../utils/cores'
import { maiusculas, normalizarNome } from '../../utils/formatar'

// Cadastro de um time: nome, cor, goleiro e jogadores em ordem
// (os primeiros da linha são titulares; os demais, reservas).
export function EditorDeTime({ torneio, inicial, onSalvar, onExcluir, onCancelar }: {
  torneio: Torneio
  inicial: TimeTorneio
  onSalvar: (time: TimeTorneio) => void
  onExcluir?: () => void
  onCancelar: () => void
}) {
  const [time, setTime] = useState<TimeTorneio>(inicial)
  const [nomeJogador, setNomeJogador] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const confirmar = useConfirmar()
  const { linha } = torneio.regras
  const outros = torneio.times.filter((t) => t.id !== time.id)
  const coresUsadas = new Set(outros.map((t) => t.cor))

  // Nomes de todo mundo do torneio (jogadores e goleiros), menos os deste time em edição
  const nomesNoTorneio = [
    ...outros.flatMap((t) => [...t.jogadores.map((j) => j.nome), ...(t.goleiro ? [t.goleiro] : [])]),
    ...time.jogadores.map((j) => j.nome),
  ].map(normalizarNome)

  const adicionar = (ev: FormEvent) => {
    ev.preventDefault()
    const nome = nomeJogador.trim()
    if (!nome) return
    if (nomesNoTorneio.includes(normalizarNome(nome)) || normalizarNome(time.goleiro ?? '') === normalizarNome(nome)) {
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
  const podeFechar = time.nome.trim() !== '' && faltam === 0 && !nomeRepetido

  const fechar = () => {
    if (normalizarNome(time.goleiro ?? '') && nomesNoTorneio.includes(normalizarNome(time.goleiro!))) {
      return setAviso(`Já tem um ${time.goleiro} no torneio. Use outro nome para o goleiro.`)
    }
    onSalvar({ ...time, nome: time.nome.trim(), goleiro: time.goleiro?.trim() || null, fechado: true })
  }

  return (
    <div className="scr">
      <Barra titulo={inicial.fechado ? 'Editar time' : 'Novo time'} sub={torneio.nome} />
      <div className="conteudo">
        <section className="panel">
          <div className="ph">Nome e cor</div>
          <div className="pb" style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'flex' }}>
              <span className="vh">Nome do time</span>
              <input className="inp" value={time.nome} placeholder="Nome do time" autoCapitalize="characters"
                onChange={(ev) => setTime((t) => ({ ...t, nome: maiusculas(ev.target.value) }))} />
            </label>
            {nomeRepetido && <div className="mut" style={{ color: 'var(--vermelho)' }}>Já existe um time com esse nome.</div>}
            <div role="radiogroup" aria-label="Cor do time" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 6 }}>
              {CORES_TORNEIO.map((c) => {
                const usada = coresUsadas.has(c.cor)
                return (
                  <button key={c.cor} role="radio" aria-checked={time.cor === c.cor} disabled={usada}
                    aria-label={`${c.nome}${usada ? ' (já usada)' : ''}`} title={c.nome}
                    className={'cor' + (time.cor === c.cor ? ' on' : '')}
                    style={{ background: c.cor, opacity: usada ? 0.2 : 1, cursor: usada ? 'not-allowed' : 'pointer' }}
                    onClick={() => setTime((t) => ({ ...t, cor: c.cor }))} />
                )
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="ph">Goleiro <span className="tag t-y">G</span></div>
          <div className="pb" style={{ display: 'flex' }}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do goleiro</span>
              <input className="inp" placeholder="Nome do goleiro (opcional)" value={time.goleiro ?? ''} autoCapitalize="characters"
                onChange={(ev) => setTime((t) => ({ ...t, goleiro: maiusculas(ev.target.value) }))} />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="ph">
            <span className="row" style={{ gap: 8 }}><Camisa cor={time.cor} contorno="#fff" />Jogadores</span>
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
      </div>
      <div className="rodape" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
        <button className="btn w sm" onClick={onCancelar}>Cancelar</button>
        <button className="btn sm" disabled={!podeFechar} onClick={fechar}>
          {inicial.fechado ? 'Salvar time' : 'Fechar time'}
        </button>
      </div>
      {aviso && <Aviso titulo="Nome repetido" onFechar={() => setAviso(null)}>{aviso}</Aviso>}
    </div>
  )
}
