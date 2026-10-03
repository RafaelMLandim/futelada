import { useState, type FormEvent } from 'react'
import { Aviso } from '../components/Aviso'
import { Barra } from '../components/Barra'
import { Camisa } from '../components/Camisa'
import { Cartao } from '../components/Cartao'
import { Chave } from '../components/Chave'
import { Icone } from '../components/Icone'
import { Passo } from '../components/Passo'
import { LADOS, alterarLinha, definirColete, definirGoleiros } from '../logic'
import type { Pelada } from '../store/usePelada'
import type { Config as Cfg } from '../types/pelada'
import { COLETES } from '../utils/cores'
import { dataHoje, limitar, normalizarNome } from '../utils/formatar'

const PRESETS: [string, number][] = [['Futsal', 4], ['Soc.', 5], ['Soc.', 6], ['Campo', 10]]

export function Config({ pelada, onPronto }: { pelada: Pelada; onPronto: () => void }) {
  const { app, aplicar } = pelada
  const cfg = app.estado.config
  const mudar = (parcial: Partial<Cfg>) => aplicar((e) => ({ ...e, config: { ...e.config, ...parcial } }))
  const linha = (n: number) => aplicar((e) => alterarLinha(e, limitar(n, 2, 11)))
  const [goleiro, setGoleiro] = useState('')
  const [repetido, setRepetido] = useState<string | null>(null)
  const addGoleiro = (ev: FormEvent) => {
    ev.preventDefault()
    const nome = goleiro.trim()
    if (!nome) return
    const existente = cfg.goleiros.find((g) => normalizarNome(g) === normalizarNome(nome))
    if (existente) {
      setRepetido(existente)
      return
    }
    aplicar((e) => definirGoleiros(e, [...e.config.goleiros, nome]))
    setGoleiro('')
  }

  return (
    <div className="scr">
      <Barra titulo={app.iniciada ? 'Ajustes' : 'Nova pelada'} sub={dataHoje()} />
      <div className="conteudo">
        <section className="panel">
          <div className="ph">Jogadores na linha<span className="tag t-y">+ goleiro</span></div>
          <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="ib" aria-label="Menos um na linha" onClick={() => linha(cfg.linha - 1)}><Icone nome="menos" /></button>
              <div className="led" style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}>
                <span className="num" style={{ fontSize: 60 }}>{cfg.linha}</span>
              </div>
              <button className="ib" aria-label="Mais um na linha" onClick={() => linha(cfg.linha + 1)}><Icone nome="mais" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {PRESETS.map(([nome, n]) => (
                <button key={n} className={'chip' + (cfg.linha === n ? ' on' : '')} onClick={() => linha(n)}>{nome} {n}</button>
              ))}
            </div>
            <div className="mut">
              Goleiro não entra na contagem. Ajuste ao tamanho do campo.
              {app.estado.emCampo && ' Quem está em campo continua; só a fila se reorganiza.'}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="ph">Coletes<span className="sub">quem entra veste o colete de quem saiu</span></div>
          {LADOS.map((lado) => (
            <div key={lado} className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: lado === 'B' ? '2px solid #e3e8d6' : undefined }}>
              <div className="row num" style={{ fontSize: 18, textTransform: 'uppercase', gap: 8 }}>
                <Camisa cor={cfg.coletes[lado].cor} />{cfg.coletes[lado].nome}
              </div>
              <div role="radiogroup" aria-label={`Colete do lado ${lado}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: 6 }}>
                {COLETES.map((c) => {
                  const marcado = cfg.coletes[lado].cor === c.cor
                  return (
                    <button key={c.cor} role="radio" aria-checked={marcado} aria-label={c.nome} title={c.nome}
                      className={'cor' + (marcado ? ' on' : '')} style={{ background: c.cor }}
                      onClick={() => aplicar((e) => definirColete(e, lado, c))} />
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="ph">Fim da partida<span className="sub">o que vier primeiro</span></div>
          <div className="tr">
            <span className="nome">Tempo</span>
            <Passo rotulo="tempo" valor={cfg.tempoMin} sufixo="min"
              menos={() => mudar({ tempoMin: limitar(cfg.tempoMin - 1, 1, 60) })}
              mais={() => mudar({ tempoMin: limitar(cfg.tempoMin + 1, 1, 60) })} />
          </div>
          <div className="tr" style={{ paddingBottom: 6 }}>
            <span className="nome">Gols</span>
            <Passo rotulo="gols" valor={cfg.gols}
              menos={() => mudar({ gols: limitar(cfg.gols - 1, 1, 20) })}
              mais={() => mudar({ gols: limitar(cfg.gols + 1, 1, 20) })} />
          </div>
          <div className="tr" style={{ paddingBottom: 6 }}>
            <span className="nome row" style={{ gap: 8 }}><Cartao cor="azul" />Cartão azul</span>
            <Passo rotulo="minutos do cartão azul" valor={cfg.minutosAzul} sufixo="min"
              menos={() => mudar({ minutosAzul: limitar(cfg.minutosAzul - 1, 1, 10) })}
              mais={() => mudar({ minutosAzul: limitar(cfg.minutosAzul + 1, 1, 10) })} />
          </div>
        </section>

        <section className="panel">
          <div className="ph">Regras opcionais</div>
          <div className="tr" style={{ padding: '8px 10px' }}>
            <div className="nome" style={{ whiteSpace: 'normal' }}>
              Limite de vitórias seguidas
              <div className="mut">Ao atingir, o vencedor sai</div>
            </div>
            <Chave rotulo="Limite de vitórias seguidas" ligada={cfg.limiteVitorias !== null}
              alternar={() => mudar({ limiteVitorias: cfg.limiteVitorias === null ? 3 : null })} />
          </div>
          {cfg.limiteVitorias !== null && (
            <div className="tr">
              <span className="nome">Vitórias seguidas</span>
              <Passo rotulo="vitórias" valor={cfg.limiteVitorias}
                menos={() => mudar({ limiteVitorias: limitar(cfg.limiteVitorias! - 1, 1, 20) })}
                mais={() => mudar({ limiteVitorias: limitar(cfg.limiteVitorias! + 1, 1, 20) })} />
            </div>
          )}
        </section>

        <section className="panel">
          <div className="ph">Goleiros fixos<span className="sub">opcional · um em cada gol</span></div>
          {cfg.goleiros.map((g, i) => (
            <div key={g + i} className="tr">
              <span className="no g">G</span>
              <span className="nome">{g}</span>
              <button className="ib g" aria-label={`Remover goleiro ${g}`}
                onClick={() => aplicar((e) => definirGoleiros(e, cfg.goleiros.filter((_, k) => k !== i)))}>
                <Icone nome="lixo" tamanho={20} />
              </button>
            </div>
          ))}
          <form className="pb" style={{ display: 'flex', gap: 8 }} onSubmit={addGoleiro}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do goleiro</span>
              <input className="inp" placeholder="Nome do goleiro" value={goleiro} autoCapitalize="words"
                onChange={(ev) => setGoleiro(ev.target.value)} />
            </label>
            <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar goleiro">
              <Icone nome="mais" />
            </button>
          </form>
          <div className="mut" style={{ padding: '0 12px 12px' }}>
            Quem perde deixa o goleiro em campo para o time que entra. Com um só goleiro, ele fica com quem continua jogando.
          </div>
        </section>
      </div>
      {repetido && (
        <Aviso titulo="Nome repetido" onFechar={() => setRepetido(null)}>
          Já tem um goleiro <b>{repetido}</b>. Adicione o sobrenome ou um apelido.
        </Aviso>
      )}
      <div className="rodape">
        <button className="btn" onClick={onPronto}>
          {app.iniciada ? 'Voltar' : 'Montar lista'} <Icone nome="seta" />
        </button>
      </div>
    </div>
  )
}
