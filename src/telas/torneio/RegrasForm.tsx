import type { ReactNode } from 'react'
import { Cartao } from '../../components/Cartao'
import { Chave } from '../../components/Chave'
import { Passo } from '../../components/Passo'
import type { Formato, RegrasTorneio } from '../../types/torneio'
import { limitar } from '../../utils/formatar'
import { apitoInicio } from '../../utils/sons'

const FORMATOS: { id: Formato; nome: string; descricao: string }[] = [
  { id: 'pontos', nome: 'Pontos corridos', descricao: 'Todos contra todos; campeão é quem soma mais pontos.' },
  { id: 'mata-mata', nome: 'Mata-mata', descricao: 'Chave eliminatória: quem perde sai, até a final.' },
  { id: 'grupos', nome: 'Grupos + mata-mata', descricao: 'Fase de grupos e os melhores vão para o mata-mata.' },
]

function Linha({ titulo, detalhe, children }: { titulo: string; detalhe?: string; children: ReactNode }) {
  return (
    <div className="tr" style={{ padding: '8px 10px' }}>
      <div className="nome" style={{ whiteSpace: 'normal' }}>
        {titulo}
        {detalhe && <div className="mut">{detalhe}</div>}
      </div>
      {children}
    </div>
  )
}

/**
 * Regras do torneio. Com `travado` (depois do sorteio), o que muda a estrutura do
 * torneio (formato, grupos, turnos, 3º lugar) fica só para leitura.
 */
export function RegrasForm({ regras, mudar, travado = false, minCampos = 1 }: {
  regras: RegrasTorneio; mudar: (parcial: Partial<RegrasTorneio>) => void; travado?: boolean
  minCampos?: number // não deixa ter menos campos que jogos em andamento
}) {
  const r = regras
  const temPontos = r.formato === 'pontos' || r.formato === 'grupos'
  const temMata = r.formato === 'mata-mata' || r.formato === 'grupos'

  return (
    <>
      <section className="panel">
        <div className="ph">Formato{travado && <span className="sub">definido no sorteio</span>}</div>
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          {FORMATOS.filter((f) => !travado || f.id === r.formato).map((f) => (
            <button key={f.id} className={'chip' + (r.formato === f.id ? ' on' : '')} disabled={travado}
              style={{ height: 'auto', padding: '8px 12px', textAlign: 'left', textTransform: 'none' }}
              onClick={() => mudar({ formato: f.id })} aria-pressed={r.formato === f.id}>
              <div style={{ fontSize: 18, textTransform: 'uppercase' }}>{f.nome}</div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 500, fontSize: 13 }}>{f.descricao}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="ph">Partida</div>
        <Linha titulo="Jogadores na linha" detalhe="Goleiro não conta. Os primeiros de cada time são titulares.">
          <Passo rotulo="na linha" valor={r.linha} menos={() => mudar({ linha: limitar(r.linha - 1, 2, 11) })} mais={() => mudar({ linha: limitar(r.linha + 1, 2, 11) })} />
        </Linha>
        <Linha titulo="Tempo">
          <Passo rotulo="tempo" valor={r.tempoMin} sufixo="min" menos={() => mudar({ tempoMin: limitar(r.tempoMin - 1, 1, 90) })} mais={() => mudar({ tempoMin: limitar(r.tempoMin + 1, 1, 90) })} />
        </Linha>
        <Linha titulo="Campos" detalhe="Quantos jogos podem acontecer ao mesmo tempo">
          <Passo rotulo="campos" valor={r.campos} menos={() => mudar({ campos: limitar(r.campos - 1, minCampos, 4) })} mais={() => mudar({ campos: limitar(r.campos + 1, 1, 4) })} />
        </Linha>
        <Linha titulo="Gols terminam a partida" detalhe={r.gols === null ? 'Desligado: a partida vai até o fim do tempo' : 'O que vier primeiro: tempo ou gols'}>
          <Chave rotulo="Gols terminam a partida" ligada={r.gols !== null} alternar={() => mudar({ gols: r.gols === null ? 2 : null })} />
        </Linha>
        {r.gols !== null && (
          <Linha titulo="Quantos gols">
            <Passo rotulo="gols" valor={r.gols} menos={() => mudar({ gols: limitar(r.gols! - 1, 1, 20) })} mais={() => mudar({ gols: limitar(r.gols! + 1, 1, 20) })} />
          </Linha>
        )}
        <Linha titulo="Acréscimos" detalhe={r.acrescimos ? 'Ao acabar o tempo, define os minutos na hora' : 'Desligado: acabou o tempo, acabou o jogo'}>
          <Chave rotulo="Acréscimos" ligada={r.acrescimos} alternar={() => mudar({ acrescimos: !r.acrescimos })} />
        </Linha>
      </section>

      <section className="panel">
        <div className="ph">Regras do formato</div>
        {temPontos && (
          <Linha titulo="Ida e volta" detalhe="Cada confronto acontece duas vezes">
            {travado ? <span className="tag t-y">{r.idaEVolta ? 'Sim' : 'Não'}</span>
              : <Chave rotulo="Ida e volta" ligada={r.idaEVolta} alternar={() => mudar({ idaEVolta: !r.idaEVolta })} />}
          </Linha>
        )}
        {r.formato === 'grupos' && (
          <>
            <Linha titulo="Grupos">
              {travado ? <span className="num" style={{ fontSize: 24 }}>{r.grupos}</span>
                : <Passo rotulo="grupos" valor={r.grupos} menos={() => mudar({ grupos: limitar(r.grupos - 1, 2, 8) })} mais={() => mudar({ grupos: limitar(r.grupos + 1, 2, 8) })} />}
            </Linha>
            <Linha titulo="Passam de cada grupo">
              {travado ? <span className="num" style={{ fontSize: 24 }}>{r.classificamPorGrupo}</span>
                : <Passo rotulo="classificados por grupo" valor={r.classificamPorGrupo} menos={() => mudar({ classificamPorGrupo: limitar(r.classificamPorGrupo - 1, 1, 4) })} mais={() => mudar({ classificamPorGrupo: limitar(r.classificamPorGrupo + 1, 1, 4) })} />}
            </Linha>
          </>
        )}
        {r.formato === 'grupos' && r.campos >= 2 && (
          <Linha titulo="Cada grupo no seu campo" detalhe={r.grupos > r.campos ? 'Mais grupos que campos: eles se revezam' : 'Grupo A no Campo 1, Grupo B no Campo 2…'}>
            <Chave rotulo="Cada grupo no seu campo" ligada={r.grupoPorCampo} alternar={() => mudar({ grupoPorCampo: !r.grupoPorCampo })} />
          </Linha>
        )}
        {temMata && (
          <>
            <Linha titulo="Disputa de 3º lugar">
              {travado ? <span className="tag t-y">{r.terceiroLugar ? 'Sim' : 'Não'}</span>
                : <Chave rotulo="Disputa de 3º lugar" ligada={r.terceiroLugar} alternar={() => mudar({ terceiroLugar: !r.terceiroLugar })} />}
            </Linha>
            <Linha titulo="Cobranças de pênalti" detalhe="Se empatar, alternadas até alguém errar">
              <Passo rotulo="cobranças de pênalti" valor={r.cobrancasPenalti} menos={() => mudar({ cobrancasPenalti: limitar(r.cobrancasPenalti - 1, 1, 10) })} mais={() => mudar({ cobrancasPenalti: limitar(r.cobrancasPenalti + 1, 1, 10) })} />
            </Linha>
          </>
        )}
        <Linha titulo="Limitar substituições" detalhe={r.maxSubstituicoes === null ? 'Ilimitadas' : 'Por time, em cada jogo'}>
          <Chave rotulo="Limitar substituições" ligada={r.maxSubstituicoes !== null}
            alternar={() => mudar({ maxSubstituicoes: r.maxSubstituicoes === null ? 3 : null })} />
        </Linha>
        {r.maxSubstituicoes !== null && (
          <Linha titulo="Máximo de substituições">
            <Passo rotulo="substituições" valor={r.maxSubstituicoes} menos={() => mudar({ maxSubstituicoes: limitar(r.maxSubstituicoes! - 1, 1, 20) })} mais={() => mudar({ maxSubstituicoes: limitar(r.maxSubstituicoes! + 1, 1, 20) })} />
          </Linha>
        )}
        <Linha titulo="Cartão azul" detalhe="Tempo fora">
          <span className="row" style={{ gap: 8 }}><Cartao cor="azul" />
            <Passo rotulo="minutos do cartão azul" valor={r.minutosAzul} sufixo="min" menos={() => mudar({ minutosAzul: limitar(r.minutosAzul - 1, 1, 10) })} mais={() => mudar({ minutosAzul: limitar(r.minutosAzul + 1, 1, 10) })} />
          </span>
        </Linha>
        <Linha titulo="Sons" detalhe="Apitos, narração no gol, moeda">
          <Chave rotulo="Sons" ligada={r.som} alternar={() => { if (!r.som) apitoInicio(); mudar({ som: !r.som }) }} />
        </Linha>
      </section>
    </>
  )
}
