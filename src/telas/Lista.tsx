import { useRef, useState, type FormEvent } from 'react'
import {
  adicionarJogador, blocosDaFila, comecar, sortearPrimeirosTimes, novoJogador, podeComecar, removerJogador,
  LADOS, resumoPagamentos, subiuDe, todosOsJogadores,
} from '../logic'
import { Aviso } from '../components/Aviso'
import { Barra } from '../components/Barra'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import { Subiu } from '../components/Subiu'
import type { Pelada } from '../store/usePelada'
import { SEM_COLETE } from '../utils/cores'
import { useConfirmar } from '../utils/confirmacao'
import { maiusculas, normalizarNome, reais } from '../utils/formatar'
import type { useCobranca } from '../store/cobranca'
import { Pagamentos } from './Pagamentos'

export function Lista({ pelada, cobranca, onApitar }: { pelada: Pelada; cobranca: ReturnType<typeof useCobranca>; onApitar: () => void }) {
  const { app, aplicar } = pelada
  const { estado } = app
  const [nome, setNome] = useState('')
  const confirmar = useConfirmar()
  const [repetido, setRepetido] = useState<string | null>(null)
  const [pagamentos, setPagamentos] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const linha = estado.config.linha
  const { coletes } = estado.config
  const blocos = blocosDaFila(estado)
  const emJogo = estado.emCampo !== null

  const adicionar = (ev: FormEvent) => {
    ev.preventDefault()
    if (!nome.trim()) return
    const existente = todosOsJogadores(estado).find((j) => normalizarNome(j.nome) === normalizarNome(nome))
    if (existente) {
      setRepetido(existente.nome)
      return
    }
    aplicar((e) => adicionarJogador(e, novoJogador(nome)))
    setNome('')
  }
  const remover = (id: string, quem: string) => {
    confirmar({
      titulo: 'Foi embora?', mensagem: `${quem} foi embora? A fila sobe uma posição.`, botao: 'Foi embora', perigo: true,
      aoConfirmar: () => aplicar((e) => removerJogador(e, id)),
    })
  }
  const apitar = () => {
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
      />
      <form onSubmit={adicionar} style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', flex: 1 }}>
          <span className="vh">Nome do jogador</span>
          <input ref={campo} className="inp" placeholder={emJogo ? 'Chegou atrasado?' : 'Quem chegou?'} value={nome}
            onChange={(ev) => setNome(maiusculas(ev.target.value))} autoCapitalize="characters" enterKeyHint="done" />
        </label>
        <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar jogador">
          <Icone nome="mais" />
        </button>
      </form>

      {/* campo pago: quantos já pagaram; abre QR Pix, link para o grupo e a lista de pagamentos */}
      {estado.config.pagamento.ativo && (() => {
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

      <div className="conteudo">
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
                      <button className="ib g" aria-label={`${j.nome} foi embora`} onClick={() => remover(j.id, j.nome)}>
                        <Icone nome="saiu" tamanho={20} />
                      </button>
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
      </div>

      {repetido && (
        <Aviso titulo="Nome repetido" onFechar={() => { setRepetido(null); campo.current?.focus() }}>
          Já tem um <b>{repetido}</b> na lista. Adicione o sobrenome ou um apelido.
        </Aviso>
      )}

      {!emJogo && (
        <div className="rodape">
          <button className="btn" disabled={!podeComecar(estado)} onClick={apitar}>
            {estado.config.sortearInicio && estado.historico.length === 0 ? 'Sortear e apitar' : 'Apitar'} · Time {estado.filaTimes[0]} x Time {estado.filaTimes[1]}
          </button>
        </div>
      )}
    </div>
  )
}
