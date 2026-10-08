import { useState } from 'react'
import { Barra } from '../components/Barra'
import { Icone } from '../components/Icone'
import type { MovimentoDoCaixa } from '../logic'
import { useCaixa, useConta } from '../store/conta'
import { useConfirmar } from '../utils/confirmacao'
import { reais } from '../utils/formatar'

const diaCurto = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/** Caixa da pelada: saldo, entradas e saídas (no perfil de quem entrou com o Google). */
export function Caixa({ onVoltar }: { onVoltar: () => void }) {
  const conta = useConta()
  const { lancamentos, saldo, lancar, apagar } = useCaixa()
  const confirmar = useConfirmar()
  const [novo, setNovo] = useState<MovimentoDoCaixa['tipo'] | null>(null)

  return (
    <div className="scr" style={{ height: '100dvh' }}>
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
            <section className="led" style={{ padding: 14, textAlign: 'center' }}>
              <div className="num" style={{ color: '#c9d4e3', fontSize: 15, letterSpacing: 1 }}>SALDO</div>
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
                  <span className="nome" style={{ whiteSpace: 'normal' }}>{l.descricao}</span>
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
      {novo && <NovoLancamento tipo={novo} onFechar={() => setNovo(null)} onSalvar={(m) => { setNovo(null); void lancar([m]) }} />}
    </div>
  )
}

/** Modal de nova entrada/saída: descrição e valor. */
function NovoLancamento({ tipo, onFechar, onSalvar }: { tipo: MovimentoDoCaixa['tipo']; onFechar: () => void; onSalvar: (m: MovimentoDoCaixa) => void }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const numero = Number(valor.replace(/[^\d,.]/g, '').replace(',', '.')) || 0
  const entrada = tipo === 'entrada'
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={entrada ? 'Nova entrada' : 'Nova saída'} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{entrada ? 'Nova entrada' : 'Nova saída'}</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Descrição</span>
            <input className="inp" autoFocus placeholder={entrada ? 'Ex.: Doação do Zé' : 'Ex.: Bola nova'} value={descricao} onChange={(ev) => setDescricao(ev.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Valor (R$)</span>
            <input className="inp" inputMode="decimal" placeholder="Ex.: 90" value={valor} onChange={(ev) => setValor(ev.target.value)} />
          </label>
          <button className={'btn' + (entrada ? '' : ' r')} disabled={!descricao.trim() || numero <= 0}
            onClick={() => onSalvar({ tipo, valor: Math.round(numero * 100) / 100, descricao: descricao.trim(), data: Date.now() })}>
            {entrada ? 'Lançar entrada' : 'Lançar saída'} · {reais(numero)}
          </button>
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}
