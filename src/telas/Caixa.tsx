import { useState } from 'react'
import { Barra } from '../components/Barra'
import { Carrossel } from '../components/CarrosselDeTurmas'
import { Icone } from '../components/Icone'
import { lancamentosDoFiltro, saldoDoCaixa, SEM_TURMA, type Caixinha, type MovimentoDoCaixa } from '../logic'
import { useCaixinhas } from '../store/caixinhas'
import { SecaoDeCaixinhas } from './Caixinhas'
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
  // o caixa é sempre de uma turma (sem "Todas"); "Sem turma" só aparece se tiver lançamento antigo sem turma
  const [escolhido, setFiltro] = useState<string | null>(null)
  const nomeDaTurma = (id: string | null | undefined) => turmas?.find((turma) => turma.id === id)?.nome ?? 'Sem turma'
  const temSemTurma = todos?.some((lancamento) => !lancamento.turma)
  const filtros = [...(turmas ?? []).map((turma) => turma.id), ...(temSemTurma || !turmas?.length ? [SEM_TURMA] : [])]
  const filtro = escolhido && filtros.includes(escolhido) ? escolhido : filtros[0]
  const turmaDoFiltro = filtro === SEM_TURMA ? null : filtro
  const lancamentos = todos && lancamentosDoFiltro(todos, filtro)
  const saldo = saldoDoCaixa(lancamentos ?? [])
  // nova entrada ou saída; com caixinha, é o dinheiro dela sendo usado ("Usar o dinheiro")
  const [novo, setNovo] = useState<{ tipo: MovimentoDoCaixa['tipo']; caixinha?: Caixinha } | null>(null)
  const caixinhas = useCaixinhas()
  const nomeDaCaixinha = (id: string | undefined) => caixinhas?.find((caixinha) => caixinha.id === id)?.nome

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
                  <Carrossel itens={filtros} atual={filtro} onEscolher={setFiltro} nome={(item) => nomeDaTurma(item)}
                    rotulo={{ anterior: 'Pelada anterior', proximo: 'Próxima pelada' }} />
                </div>
              </section>
            )}
            <section className="led" style={{ padding: 14, textAlign: 'center' }}>
              <div className="num" style={{ color: '#c9d4e3', fontSize: 15, letterSpacing: 1 }}>{`SALDO · ${nomeDaTurma(turmaDoFiltro).toUpperCase()}`}</div>
              <div className="num" style={{ fontSize: 52, color: saldo >= 0 ? 'var(--amarelo)' : '#ff8a80' }}>{reais(saldo)}</div>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" style={{ background: 'var(--verde)', color: '#fff' }} onClick={() => setNovo({ tipo: 'entrada' })}><Icone nome="mais" /> Entrada</button>
              <button className="btn r" onClick={() => setNovo({ tipo: 'saida' })}><Icone nome="menos" /> Saída</button>
            </div>
            {caixinhas && (
              <SecaoDeCaixinhas caixinhas={caixinhas} turmas={turmas ?? []} turmaDoFiltro={turmaDoFiltro}
                lancamentos={todos} lancar={lancar} apagar={apagar} onSaida={(caixinha) => setNovo({ tipo: 'saida', caixinha })} />
            )}
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
                    {l.caixinha && <span className="mut" style={{ display: 'block', fontSize: 12 }}>💰 {nomeDaCaixinha(l.caixinha) ?? 'Caixinha'}</span>}
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
      {novo && <NovoLancamento tipo={novo.tipo} caixinha={novo.caixinha} nomeDaTurma={nomeDaTurma(turmaDoFiltro)}
        turma={novo.caixinha ? novo.caixinha.turma : turmaDoFiltro}
        onFechar={() => setNovo(null)} onSalvar={(m) => { setNovo(null); void lancar([m]) }} />}
    </div>
  )
}

/** Modal de nova entrada/saída na turma do caixa (ou na caixinha): descrição e valor. */
function NovoLancamento({ tipo, caixinha, turma, nomeDaTurma, onFechar, onSalvar }: {
  tipo: MovimentoDoCaixa['tipo']; caixinha?: Caixinha; turma: string | null; nomeDaTurma: string; onFechar: () => void; onSalvar: (m: MovimentoDoCaixa) => void
}) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const numero = Number(valor.replace(/[^\d,.]/g, '').replace(',', '.')) || 0
  const entrada = tipo === 'entrada'
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={entrada ? 'Nova entrada' : 'Nova saída'} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{caixinha ? `Usar a caixinha · ${caixinha.nome}` : entrada ? 'Nova entrada' : 'Nova saída'}</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          {!caixinha && <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Caixa: {nomeDaTurma}</div>}
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Descrição</span>
            <input className="inp" autoFocus placeholder={entrada ? 'Ex.: Doação do Zé' : 'Ex.: Bola nova'} value={descricao} onChange={(ev) => setDescricao(ev.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Valor (R$)</span>
            <input className="inp" inputMode="decimal" placeholder="Ex.: 90" value={valor} onChange={(ev) => setValor(ev.target.value)} />
          </label>
          <button className={'btn' + (entrada ? '' : ' r')} disabled={!descricao.trim() || numero <= 0}
            onClick={() => onSalvar({ tipo, valor: Math.round(numero * 100) / 100, descricao: descricao.trim(), data: Date.now(), ...(turma && { turma }), ...(caixinha && { caixinha: caixinha.id }) })}>
            {entrada ? 'Lançar entrada' : 'Lançar saída'} · {reais(numero)}
          </button>
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}
