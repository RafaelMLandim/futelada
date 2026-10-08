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
import { apitoInicio } from '../utils/sons'
import { COLETES } from '../utils/cores'
import { dataHoje, limitar, maiusculas, normalizarNome } from '../utils/formatar'

const PRESETS: [string, number][] = [['Futsal', 4], ['Soc.', 5], ['Soc.', 6], ['Campo', 10]]

/** Ajustes da pelada. Na criação (`onPronto`), tem o botão para seguir para a lista; no fim, cancelar a pelada. */
export function Config({ pelada, onPronto, onCancelar }: { pelada: Pelada; onPronto?: () => void; onCancelar?: () => void }) {
  const { app, aplicar } = pelada
  const cfg = app.estado.config
  const mudar = (parcial: Partial<Cfg>) => aplicar((e) => ({ ...e, config: { ...e.config, ...parcial } }))
  const pag = cfg.pagamento
  const mudarPag = (parcial: Partial<Cfg['pagamento']>) => aplicar((e) => ({ ...e, config: { ...e.config, pagamento: { ...e.config.pagamento, ...parcial } } }))
  /** "120", "120,50" → número (vazio = 0) */
  const numero = (texto: string) => Math.max(0, Number(texto.replace(/[^\d,.]/g, '').replace(',', '.')) || 0)
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
          <div className="ph">Coletes<span className="sub">escolha as cores</span></div>
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
          <div className="tr" style={{ padding: '8px 10px' }}>
            <div className="nome" style={{ whiteSpace: 'normal' }}>
              Gols terminam a partida
              <div className="mut">{cfg.gols === null ? 'Desligado: vai até o fim do tempo' : 'O que vier primeiro: tempo ou gols'}</div>
            </div>
            <Chave rotulo="Gols terminam a partida" ligada={cfg.gols !== null} alternar={() => mudar({ gols: cfg.gols === null ? 2 : null })} />
          </div>
          {cfg.gols !== null && (
            <div className="tr" style={{ paddingBottom: 6 }}>
              <span className="nome">Quantos gols</span>
              <Passo rotulo="gols" valor={cfg.gols}
                menos={() => mudar({ gols: limitar(cfg.gols! - 1, 1, 20) })}
                mais={() => mudar({ gols: limitar(cfg.gols! + 1, 1, 20) })} />
            </div>
          )}
          <div className="tr" style={{ padding: '8px 10px' }}>
            <div className="nome" style={{ whiteSpace: 'normal' }}>
              Acréscimos
              <div className="mut">{cfg.acrescimos ? 'Ao acabar o tempo, define os minutos na hora' : 'Desligado: acabou o tempo, acabou o jogo'}</div>
            </div>
            <Chave rotulo="Acréscimos" ligada={cfg.acrescimos} alternar={() => mudar({ acrescimos: !cfg.acrescimos })} />
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
              Sons
              <div className="mut">Apito no play e no fim, narração no gol, moeda no empate</div>
            </div>
            <Chave rotulo="Sons" ligada={cfg.som} alternar={() => {
              if (!cfg.som) apitoInicio()
              mudar({ som: !cfg.som })
            }} />
          </div>
          <div className="tr" style={{ padding: '8px 10px' }}>
            <div className="nome" style={{ whiteSpace: 'normal' }}>
              Sortear o primeiro jogo
              <div className="mut">Mistura os jogadores do Time 1 e do Time 2 antes do primeiro jogo (contra panelinha)</div>
            </div>
            <Chave rotulo="Sortear o primeiro jogo" ligada={cfg.sortearInicio} alternar={() => mudar({ sortearInicio: !cfg.sortearInicio })} />
          </div>
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

        {/* Campo pago: valor, divisão e a chave Pix de quem recebe (PLANO.md, seção 12) */}
        <section className="panel">
          <div className="tr" style={{ padding: '8px 10px' }}>
            <div className="nome" style={{ whiteSpace: 'normal' }}>
              Campo pago
              <div className="mut">{pag.ativo ? 'Cada um paga pelo Pix e marca no link' : 'Desligado: campo de graça'}</div>
            </div>
            <Chave rotulo="Campo pago" ligada={pag.ativo} alternar={() => mudarPag({ ativo: !pag.ativo })} />
          </div>
          {pag.ativo && (
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Valor do campo (R$)</span>
                <input className="inp" inputMode="decimal" placeholder="Ex.: 120" value={pag.valorCampo || ''}
                  onChange={(ev) => mudarPag({ valorCampo: numero(ev.target.value) })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className={'btn sm' + (pag.modo === 'proporcional' ? '' : ' w')} onClick={() => mudarPag({ modo: 'proporcional' })}>Dividir o campo</button>
                <button className={'btn sm' + (pag.modo === 'fixo' ? '' : ' w')} onClick={() => mudarPag({ modo: 'fixo' })}>Valor por pessoa</button>
              </div>
              {pag.modo === 'fixo'
                ? (
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Cada um paga (R$) · o que sobrar vai para o caixa</span>
                    <input className="inp" inputMode="decimal" placeholder="Ex.: 15" value={pag.valorFixo || ''}
                      onChange={(ev) => mudarPag({ valorFixo: numero(ev.target.value) })} />
                  </label>
                )
                : <div className="mut">O valor do campo é dividido por quem está na lista (ex.: R$ 120 ÷ 12 = R$ 10 cada).</div>}
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Sua chave Pix</span>
                <input className="inp" placeholder="CPF, celular, e-mail ou chave aleatória" value={pag.chavePix}
                  onChange={(ev) => mudarPag({ chavePix: ev.target.value })} autoCapitalize="none" />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Nome de quem recebe</span>
                <input className="inp" placeholder="Como aparece no Pix" value={pag.recebedor} onChange={(ev) => mudarPag({ recebedor: ev.target.value })} />
              </label>
              <div className="tr" style={{ padding: '4px 0' }}>
                <div className="nome" style={{ whiteSpace: 'normal' }}>
                  "Já paguei" já vale como pago
                  <div className="mut">{pag.confirmarAuto ? 'Sem conferir no banco (turma de confiança)' : 'Você confere no banco e confirma'}</div>
                </div>
                <Chave rotulo="Já paguei vale como pago" ligada={pag.confirmarAuto} alternar={() => mudarPag({ confirmarAuto: !pag.confirmarAuto })} />
              </div>
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
              <input className="inp" placeholder="Nome do goleiro" value={goleiro} autoCapitalize="characters"
                onChange={(ev) => setGoleiro(maiusculas(ev.target.value))} />
            </label>
            <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar goleiro">
              <Icone nome="mais" />
            </button>
          </form>
          <div className="mut" style={{ padding: '0 12px 12px' }}>
            Quem perde deixa o goleiro em campo para o time que entra. Com um só goleiro, ele fica com quem continua jogando.
          </div>
        </section>
        {/* nova pelada: o "Montar lista" fica no fim dos ajustes (não flutua por cima) */}
        {onPronto && <button className="btn" style={{ flex: 'none' }} onClick={onPronto}>Montar lista <Icone nome="seta" /></button>}
        {/* descarta a pelada de hoje sem salvar (teste, pelada que não aconteceu…) */}
        {onCancelar && (
          <button className="btn w sm" style={{ flex: 'none', color: 'var(--vermelho)' }} onClick={onCancelar}>
            <Icone nome="lixo" tamanho={20} /> Cancelar pelada
          </button>
        )}
      </div>
      {repetido && (
        <Aviso titulo="Nome repetido" onFechar={() => setRepetido(null)}>
          Já tem um goleiro <b>{repetido}</b>. Adicione o sobrenome ou um apelido.
        </Aviso>
      )}
    </div>
  )
}
