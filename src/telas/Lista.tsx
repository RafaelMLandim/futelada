import { useRef, useState, type FormEvent } from 'react'
import {
  adicionarJogador, alterarLinha, blocosDaFila, comecar, novoJogador, podeComecar, removerJogador,
  LADOS, timesCompletosNaFila, todosOsJogadores,
} from '../logic'
import { Aviso } from '../components/Aviso'
import { Barra } from '../components/Barra'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import type { Pelada } from '../store/usePelada'
import { SEM_COLETE } from '../utils/cores'
import { normalizarNome } from '../utils/formatar'

export function Lista({ pelada, onApitar }: { pelada: Pelada; onApitar: () => void }) {
  const { app, aplicar } = pelada
  const { estado } = app
  const [nome, setNome] = useState('')
  const [repetido, setRepetido] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const linha = estado.config.linha
  const { coletes } = estado.config
  const blocos = blocosDaFila(estado)
  const completos = timesCompletosNaFila(estado)
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
    if (confirm(`${quem} foi embora? A fila sobe uma posição.`)) aplicar((e) => removerJogador(e, id))
  }
  const apitar = () => {
    aplicar(comecar, true)
    onApitar()
  }

  let posicao = 0
  return (
    <div className="scr">
      <Barra
        titulo={emJogo ? `Fila · ${estado.fila.length}` : `Lista · ${estado.fila.length}`}
        sub={`${completos} ${completos === 1 ? 'time completo' : 'times completos'}${blocos.length > completos ? ' · 1 incompleto' : ''}`}
        direita={
          <div className="row" style={{ gap: 4 }}>
            <button className="ib s" aria-label="Menos um na linha" onClick={() => aplicar((e) => alterarLinha(e, Math.max(2, linha - 1)))}><Icone nome="menos" /></button>
            <div className="led" style={{ minWidth: 46, textAlign: 'center', padding: '3px 0' }}>
              <div className="num" style={{ fontSize: 22 }}>{linha}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#c9d4e3' }}>LINHA</div>
            </div>
            <button className="ib s" aria-label="Mais um na linha" onClick={() => aplicar((e) => alterarLinha(e, Math.min(11, linha + 1)))}><Icone nome="mais" /></button>
          </div>
        }
      />
      <form onSubmit={adicionar} style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', flex: 1 }}>
          <span className="vh">Nome do jogador</span>
          <input ref={campo} className="inp" placeholder={emJogo ? 'Chegou atrasado?' : 'Quem chegou?'} value={nome}
            onChange={(ev) => setNome(ev.target.value)} autoCapitalize="words" enterKeyHint="done" />
        </label>
        <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar jogador">
          <Icone nome="mais" />
        </button>
      </form>

      <div className="conteudo">
        {blocos.length === 0 && (
          <div className="vazio">{emJogo ? 'Ninguém esperando. Quem perder vem para cá.' : 'Adicione os nomes na ordem de chegada.'}</div>
        )}
        {blocos.map((bloco, i) => {
          const numero = estado.proximoNumero + i
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
                      <span className="nome">{j.nome}</span>
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
            Apitar · Time {estado.proximoNumero} x Time {estado.proximoNumero + 1}
          </button>
        </div>
      )}
    </div>
  )
}
