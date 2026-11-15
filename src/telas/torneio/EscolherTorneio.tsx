import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { useParticipacoes } from '../../store/participacoes'
import { abrirParaAcompanhar, abrirTorneio, guardarTorneioAberto, listaDeTorneios, type ResumoDoTorneio } from '../../store/torneio'

const estiloDaLinha = { width: '100%', border: 0, minHeight: 60, padding: '8px 12px', textAlign: 'left' as const, cursor: 'pointer', font: 'inherit', color: 'var(--navy)' }
const estiloDoNome = { display: 'block', fontSize: 20, lineHeight: 1.1, textTransform: 'uppercase' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }

/**
 * Pré-tela "Torneios" (PLANO.md, seção 22.3): os torneios em que você joga (entrou num time pelo link com a conta; abre
 * só para acompanhar) e os que você organiza neste celular, e o botão de criar outro (dá para organizar jogando).
 */
export function EscolherTorneio({ onAbrir, onVoltar }: { onAbrir: () => void; onVoltar: () => void }) {
  const [torneios] = useState(listaDeTorneios)
  const participacoes = useParticipacoes() ?? []
  const abrir = (id: string) => { abrirTorneio(id); onAbrir() }
  const acompanhar = (codigo: string, nome: string) => { abrirParaAcompanhar(codigo, nome); onAbrir() }
  const novo = () => { guardarTorneioAberto(); onAbrir() }
  // jogando: as participações e os torneios abertos para acompanhar (sem repetir); organizando: os outros
  const codigosJogando = new Set([
    ...participacoes.flatMap((participacao) => (participacao.torneio ? [participacao.torneio] : [])),
    ...torneios.flatMap((torneio) => (torneio.jogador && torneio.codigo ? [torneio.codigo] : [])),
  ])
  const organizando = torneios.filter((torneio) => !(torneio.codigo && codigosJogando.has(torneio.codigo)))
  const soNaLista = torneios.filter((torneio) => torneio.jogador && torneio.codigo && !participacoes.some((participacao) => participacao.torneio === torneio.codigo))
  const resumoDe = (codigo: string | null) => torneios.find((torneio) => torneio.codigo === codigo)
  const quantos = (numero: number, um: string, varios: string) => `${numero} ${numero === 1 ? um : varios}`

  const linhaOrganizando = (torneio: ResumoDoTorneio) => (
    <button key={torneio.id} className="tr" onClick={() => abrir(torneio.id)} style={estiloDaLinha}>
      <Icone nome="trofeu" tamanho={24} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="num" style={estiloDoNome}>{torneio.nome}</span>
        <span className="mut" style={{ display: 'block', fontSize: 13 }}>
          {torneio.campeao ? `🏆 ${torneio.campeao}` : 'Em andamento'}{torneio.codigo ? ` · compartilhado · ${torneio.codigo}` : ''}
        </span>
      </span>
      <span className={'tag' + (torneio.aberto ? ' t-y' : '')} style={{ height: 30, fontSize: 16, flex: 'none', border: torneio.aberto ? undefined : '2px solid var(--borda)' }}>
        {torneio.aberto ? 'Continuar' : 'Abrir'} →
      </span>
    </button>
  )

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Torneios" sub={`Jogando ${codigosJogando.size} · organizando ${organizando.length}`} />
      <div className="conteudo">
        {(participacoes.length > 0 || soNaLista.length > 0) && (
          <section className="panel">
            <div className="ph">Jogando<span className="sub">só acompanhar</span></div>
            {participacoes.map((participacao) => {
              const campeao = resumoDe(participacao.torneio)?.campeao
              return (
                <button key={participacao.id} className="tr" disabled={!participacao.torneio} style={estiloDaLinha}
                  onClick={() => participacao.torneio && acompanhar(participacao.torneio, participacao.nomeDoTorneio)}>
                  <Camisa cor={participacao.cor} tamanho={26} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="num" style={estiloDoNome}>{participacao.nomeDoTorneio}</span>
                    <span className="mut" style={{ display: 'block', fontSize: 13 }}>
                      {participacao.nomeDoTime}{campeao ? ` · 🏆 ${campeao}` : ''}{participacao.torneio ? '' : ' · esperando o organizador'}
                    </span>
                  </span>
                  {participacao.torneio && <span className="tag" style={{ height: 30, fontSize: 16, flex: 'none', border: '2px solid var(--borda)' }}>Ver →</span>}
                </button>
              )
            })}
            {soNaLista.map((torneio) => (
              <button key={torneio.id} className="tr" onClick={() => acompanhar(torneio.codigo!, torneio.nome)} style={estiloDaLinha}>
                <Icone nome="trofeu" tamanho={24} />
                <span style={{ flex: 1, minWidth: 0 }}><span className="num" style={estiloDoNome}>{torneio.nome}</span></span>
                <span className="tag" style={{ height: 30, fontSize: 16, flex: 'none', border: '2px solid var(--borda)' }}>Ver →</span>
              </button>
            ))}
          </section>
        )}
        <section className="panel">
          <div className="ph">Organizando<span className="sub">{quantos(organizando.length, 'torneio', 'torneios')}</span></div>
          {organizando.length === 0 && <div className="pb mut">Você ainda não organiza nenhum torneio. Crie o seu: dá para organizar e jogar ao mesmo tempo.</div>}
          {organizando.map(linhaOrganizando)}
        </section>
        <button className="btn" onClick={novo}><Icone nome="mais" /> Novo torneio</button>
        <div className="mut" style={{ color: '#fff', textAlign: 'center' }}>
          Os outros continuam guardados. Torneio compartilhado segue na nuvem com os mesários.
        </div>
        <button className="btn w sm" onClick={onVoltar}>Voltar ao início</button>
      </div>
    </div>
  )
}
