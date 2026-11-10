import { useState } from 'react'
import { Barra } from '../components/Barra'
import { Carrossel } from '../components/CarrosselDeTurmas'
import { Icone } from '../components/Icone'
import { lancamentosDoFiltro, saldoDoCaixa, SEM_TURMA, TODAS_AS_TURMAS, type MovimentoDoCaixa } from '../logic'
import type { Turma } from '../nuvem/tipos'
import { useCaixa, useConta } from '../store/conta'
import { useTurmas } from '../store/turmas'
import { useConfirmar } from '../utils/confirmacao'
import { reais } from '../utils/formatar'

const diaCurto = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/** Caixa da pelada: saldo, entradas e saídas de cada turma (no perfil de quem entrou com o Google). */
export function Caixa({ onVoltar }: { onVoltar: () => void }) {
  const conta = useConta()
  const { lancamentos: todos, lancar, apagar } = useCaixa()
  const { turmas } = useTurmas()
  const confirmar = useConfirmar()
  const [filtro, setFiltro] = useState(TODAS_AS_TURMAS)
  const lancamentos = todos && lancamentosDoFiltro(todos, filtro)
  const saldo = saldoDoCaixa(lancamentos ?? [])
  const nomeDaTurma = (id: string | null | undefined) => turmas?.find((turma) => turma.id === id)?.nome ?? 'Sem turma'
  const temSemTurma = todos?.some((lancamento) => !lancamento.turma)
  const filtros = [TODAS_AS_TURMAS, ...(turmas ?? []).map((turma) => turma.id), ...(temSemTurma ? [SEM_TURMA] : [])]
  const [novo, setNovo] = useState<MovimentoDoCaixa['tipo'] | null>(null)

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Caixa da pelada" sub={conta.perfil && !conta.perfil.anonimo ? (conta.perfil.nome ?? conta.perfil.email ?? '') : ''} />
      <div className="conteudo">
        {!conta.logado && conta.perfil !== undefined && (
          <section className="panel pb" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>O caixa fica guardado no seu perfil. Entre com o Google para usar.</div>
            <button className="btn" onClick={conta.entrar}>Entrar com Google</button>
          </section>
        )}
        {conta.logado && (
          <>
            {!!turmas?.length && (
              <section className="panel">
                <div className="ph">Pelada{filtros.length > 1 && <span className="sub">{filtros.indexOf(filtro) + 1} de {filtros.length}</span>}</div>
                <div className="pb">
                  <Carrossel itens={filtros} atual={filtro} onEscolher={setFiltro} nome={(item) => (item === TODAS_AS_TURMAS ? 'Todas' : nomeDaTurma(item))}
                    rotulo={{ anterior: 'Pelada anterior', proximo: 'Próxima pelada' }} />
                </div>
              </section>
            )}
            <section className="led" style={{ padding: 14, textAlign: 'center' }}>
              <div className="num" style={{ color: '#c9d4e3', fontSize: 15, letterSpacing: 1 }}>{filtro === TODAS_AS_TURMAS ? 'SALDO TOTAL' : `SALDO · ${nomeDaTurma(filtro).toUpperCase()}`}</div>
              <div className="num" style={{ fontSize: 52, color: saldo >= 0 ? 'var(--amarelo)' : '#ff8a80' }}>{reais(saldo)}</div>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" style={{ background: 'var(--verde)', color: '#fff' }} onClick={() => setNovo('entrada')}><Icone nome="mais" /> Entrada</button>
              <button className="btn r" onClick={() => setNovo('saida')}><Icone nome="menos" /> Saída</button>
            </div>
            <section className="panel">
              <div className="ph">Lançamentos<span className="sub">toque para apagar</span></div>
              {lancamentos === null && <div className="pb mut">Carregando…</div>}
              {lancamentos?.length === 0 && <div className="pb mut">Nada lançado ainda. Use os botões acima ou "Lançar no caixa" no campo pago da pelada.</div>}
              {lancamentos?.map((l) => (
                <button key={l.id} className="tr" style={{ width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => confirmar({ titulo: 'Apagar lançamento?', mensagem: `${l.descricao} · ${reais(l.valor)}`, botao: 'Apagar', perigo: true, aoConfirmar: () => void apagar(l.id) })}>
                  <span className="mut" style={{ width: 62, flex: 'none', fontSize: 12 }}>{diaCurto(l.data)}</span>
                  <span className="nome" style={{ whiteSpace: 'normal' }}>
                    {l.descricao}
                    {filtro === TODAS_AS_TURMAS && !!turmas?.length && <span className="mut" style={{ display: 'block', fontSize: 12 }}>{nomeDaTurma(l.turma)}</span>}
                  </span>
                  <span className="num" style={{ fontSize: 18, color: l.tipo === 'entrada' ? 'var(--verde)' : 'var(--vermelho)' }}>
                    {l.tipo === 'entrada' ? '+' : '−'}{reais(l.valor)}
                  </span>
                </button>
              ))}
            </section>
          </>
        )}
      </div>
      <div className="rodape">
        <button className="btn w sm" onClick={onVoltar}><Icone nome="inicio" /> Início</button>
      </div>
      {novo && <NovoLancamento tipo={novo} turmas={turmas ?? []} turmaInicial={filtro === TODAS_AS_TURMAS || filtro === SEM_TURMA ? (turmas?.[0]?.id ?? null) : filtro}
        onFechar={() => setNovo(null)} onSalvar={(m) => { setNovo(null); void lancar([m]) }} />}
    </div>
  )
}

/** Modal de nova entrada/saída: descrição e valor. */
function NovoLancamento({ tipo, turmas, turmaInicial, onFechar, onSalvar }: {
  tipo: MovimentoDoCaixa['tipo']; turmas: Turma[]; turmaInicial: string | null; onFechar: () => void; onSalvar: (m: MovimentoDoCaixa) => void
}) {
  const [turma, setTurma] = useState(turmaInicial)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const numero = Number(valor.replace(/[^\d,.]/g, '').replace(',', '.')) || 0
  const entrada = tipo === 'entrada'
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={entrada ? 'Nova entrada' : 'Nova saída'} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{entrada ? 'Nova entrada' : 'Nova saída'}</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          {turmas.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Pelada</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {turmas.map((item) => (
                  <button key={item.id} className={'chip' + (turma === item.id ? ' on' : '')} style={{ height: 34, fontSize: 14, textTransform: 'none' }} aria-pressed={turma === item.id} onClick={() => setTurma(item.id)}>{item.nome}</button>
                ))}
              </div>
            </div>
          )}
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Descrição</span>
            <input className="inp" autoFocus placeholder={entrada ? 'Ex.: Doação do Zé' : 'Ex.: Bola nova'} value={descricao} onChange={(ev) => setDescricao(ev.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Valor (R$)</span>
            <input className="inp" inputMode="decimal" placeholder="Ex.: 90" value={valor} onChange={(ev) => setValor(ev.target.value)} />
          </label>
          <button className={'btn' + (entrada ? '' : ' r')} disabled={!descricao.trim() || numero <= 0}
            onClick={() => onSalvar({ tipo, valor: Math.round(numero * 100) / 100, descricao: descricao.trim(), data: Date.now(), ...(turma && { turma }) })}>
            {entrada ? 'Lançar entrada' : 'Lançar saída'} · {reais(numero)}
          </button>
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}
