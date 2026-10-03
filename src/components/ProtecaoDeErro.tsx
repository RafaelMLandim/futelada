import { Component, type ReactNode } from 'react'
import { apagarPelada } from '../store/armazenamento'

// Se alguma tela quebrar, mostra uma saída em vez de deixar a tela vazia.
export class ProtecaoDeErro extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="scr" style={{ justifyContent: 'center', padding: 16 }}>
        <section className="panel">
          <div className="ph">Ops, algo deu errado</div>
          <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>
            Tente abrir de novo. Se continuar, recomece a pelada (a lista e a tabela de hoje serão apagadas).
          </div>
          <div className="pb" style={{ display: 'grid', gap: 8, paddingTop: 0 }}>
            <button className="btn" onClick={() => location.reload()}>Tentar de novo</button>
            <button className="btn r sm" onClick={() => { apagarPelada(); location.reload() }}>Recomeçar pelada</button>
          </div>
        </section>
      </div>
    )
  }
}
