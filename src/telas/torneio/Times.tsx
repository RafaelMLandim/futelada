import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { adicionarTime, editarTime, novoTime, removerTime, timesJogando } from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { TimeTorneio } from '../../types/torneio'
import { CORES_TORNEIO, textoSobre } from '../../utils/cores'
import { EditorDeTime } from './EditorDeTime'

// Lista dos times do torneio, com titulares, reservas e goleiro. Abre o editor.
export function Times({ hook, onSorteio }: { hook: TorneioHook; onSorteio: () => void }) {
  const torneio = hook.torneio!
  const [editando, setEditando] = useState<TimeTorneio | null>(null)
  const { linha } = torneio.regras
  // Time em campo não pode ser editado (a escalação do jogo depende dele)
  const emCampo = [...timesJogando(torneio)]

  if (editando) {
    const existe = torneio.times.some((t) => t.id === editando.id)
    return (
      <EditorDeTime torneio={torneio} inicial={editando}
        onCancelar={() => setEditando(null)}
        onSalvar={(time) => {
          hook.aplicar((t) => (existe ? editarTime(t, time.id, () => time) : adicionarTime(t, time)))
          setEditando(null)
        }}
        onExcluir={existe && !torneio.sorteado ? () => { hook.aplicar((t) => removerTime(t, editando.id)); setEditando(null) } : undefined}
      />
    )
  }

  // cor do time novo: a menos usada (com mais de 21 times, as cores se repetem)
  const criarTime = () => {
    const vezes = (cor: string) => torneio.times.filter((t) => t.cor === cor).length
    const cor = [...CORES_TORNEIO].sort((a, b) => vezes(a.cor) - vezes(b.cor))[0].cor
    setEditando(novoTime(`TIME ${torneio.times.length + 1}`, cor))
  }

  return (
    <div className="scr">
      <Barra titulo={`Times · ${torneio.times.length}`} sub={torneio.nome} />
      <div className="conteudo">
        {torneio.times.length === 0 && <div className="vazio">Cadastre os times: nome, cor, goleiro e jogadores.</div>}
        {torneio.times.map((time) => (
          <section key={time.id} className="panel">
            <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
              <span className="row num" style={{ gap: 8, fontSize: 20 }}>
                <Camisa cor={time.cor} tamanho={24} contorno={textoSobre(time.cor)} />{time.nome}
              </span>
              {!hook.souOrganizador ? null : emCampo.includes(time.id)
                ? <span className="tag t-ok">Em campo</span>
                : <button className="tag t-y" style={{ border: '1px solid #0b1a2c', cursor: 'pointer' }} onClick={() => setEditando(time)}>
                  <Icone nome="editar" tamanho={14} /> Editar
                </button>}
            </div>
            {time.goleiro && <div className="tr"><span className="no g">G</span><span className="nome">{time.goleiro}</span></div>}
            {time.jogadores.map((j, i) => (
              <div key={j.id} className="tr" style={{ minHeight: 36, fontSize: 14, color: i >= linha ? 'var(--mut)' : undefined }}>
                <span className="no" style={i >= linha ? { background: '#9aa4ae' } : undefined}>{i + 1}</span>
                <span className="nome">{j.nome}</span>
                {i >= linha && <span className="tag" style={{ background: '#e3e8d6' }}>Reserva</span>}
              </div>
            ))}
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
    </div>
  )
}
