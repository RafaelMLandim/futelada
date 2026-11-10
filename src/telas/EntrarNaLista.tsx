import { useEffect, useState } from 'react'
import { Barra } from '../components/Barra'
import { obterNuvem } from '../nuvem'
import type { ConfirmadoNaLista, ListaDaPelada } from '../nuvem/tipos'
import { ENDERECO_NA_LOJA } from '../store/compras'
import { primeiroNome, useDadosDoJogador } from '../store/carta'
import { useConta } from '../store/conta'
import { maiusculas } from '../utils/formatar'
import { abrirLink, nativo } from '../utils/nativo'
import { Login } from './Login'

const celularAndroid = () => /android/i.test(navigator.userAgent)

/**
 * Página do link da pelada (quem joga abre pelo grupo, sem instalar nada): entra com a conta ou só digita o nome.
 * A pessoa cai nos Confirmados; quem define a ordem de chegada é o organizador.
 */
export function EntrarNaLista({ codigo }: { codigo: string }) {
  const conta = useConta()
  const { apelido, salvar } = useDadosDoJogador()
  const [apelidoEditado, setApelidoEditado] = useState<string | null>(null)
  const [lista, setLista] = useState<ListaDaPelada | null | undefined>(undefined)
  const [confirmados, setConfirmados] = useState<ConfirmadoNaLista[]>([])
  const [eu, setEu] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [chamadaFechada, setChamadaFechada] = useState(false)
  const [noGol, setNoGol] = useState(false) // vai como goleiro fixo

  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then(async (nuvem) => {
      if (!nuvem) return setLista(null)
      const id = await nuvem.usuario()
      if (!vivo) return
      setEu(id)
      parar = nuvem.ouvirLista(codigo, (dados, lista) => { setLista(dados); setConfirmados(lista) }, () => setLista(null))
    })
    return () => { vivo = false; parar() }
  }, [codigo, conta.perfil?.uid])

  const confirmar = async (quem: string, comConta: boolean) => {
    setErro(null)
    await obterNuvem().then((nuvem) => nuvem?.confirmarNaLista(codigo, quem.trim(), comConta, noGol))
      .catch(() => setErro('Não deu para entrar na lista. Confira a internet e tente de novo.'))
  }
  const sair = async () => {
    if (eu) await obterNuvem().then((nuvem) => nuvem?.tirarDaLista(codigo, eu)).catch(() => null)
  }

  if (entrando && !conta.logado) return <Login conta={conta} onVoltar={() => setEntrando(false)} />
  const euNaLista = confirmados.find((confirmado) => confirmado.id === eu)
  // o e-mail nunca aparece para os outros: sem nome na conta, a pessoa escolhe o apelido
  const nomeNaLista = apelidoEditado ?? apelido ?? maiusculas(primeiroNome(conta.perfil?.nome))
  const entrarComConta = async () => {
    const quem = nomeNaLista.trim()
    if (quem !== apelido) await salvar({ apelido: quem }).catch(() => null)
    await confirmar(quem, true)
  }

  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Lista da pelada" sub={lista ? lista.data : ''} />
      <div className="conteudo">
        {lista === undefined && <div className="vazio">Carregando…</div>}
        {lista === null && <div className="vazio">Link não encontrado. Peça um novo para quem organiza a pelada.</div>}
        {lista && (
          <>
            {euNaLista?.naFila ? (
              <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
                <b style={{ fontSize: 18 }}>{euNaLista.goleiro ? 'Você já está no gol!' : 'Você já está na fila!'}</b>
                <span className="mut">Boa pelada! Se precisar sair, avise o organizador.</span>
              </section>
            ) : euNaLista ? (
              <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
                <b style={{ fontSize: 18 }}>{euNaLista.goleiro ? 'Você está na lista como goleiro!' : 'Você está na lista!'}</b>
                <span className="mut">A ordem de chegada quem define é o organizador, no campo.</span>
                <button className="btn w sm" onClick={() => void sair()}>Não vou mais</button>
              </section>
            ) : (
              <section className="panel">
                <div className="ph">Vai jogar?</div>
                <div className="pb" style={{ display: 'grid', gap: 10 }}>
                  <div role="radiogroup" aria-label="Onde você vai jogar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button type="button" role="radio" aria-checked={!noGol} className={'btn sm' + (noGol ? ' w' : '')} onClick={() => setNoGol(false)}>Na linha</button>
                    <button type="button" role="radio" aria-checked={noGol} className={'btn sm' + (noGol ? '' : ' w')} onClick={() => setNoGol(true)}>No gol</button>
                  </div>
                  {noGol && <span className="mut" style={{ textAlign: 'center' }}>Goleiro fixo: você fica no gol a pelada toda.</span>}
                  {conta.logado
                    ? (
                      <>
                        <label style={{ display: 'grid', gap: 4 }}>
                          <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Como você quer aparecer</span>
                          <input className="inp" maxLength={20} placeholder="Seu apelido" value={nomeNaLista} autoCapitalize="characters" onChange={(ev) => setApelidoEditado(maiusculas(ev.target.value))} />
                        </label>
                        <button className="btn" disabled={!nomeNaLista.trim()} onClick={() => void entrarComConta()}>Entrar na lista</button>
                      </>
                    )
                    : <button className="btn" onClick={() => setEntrando(true)}>Entrar com a minha conta</button>}
                  {!conta.logado && (
                    <form style={{ display: 'grid', gap: 8 }} onSubmit={(ev) => { ev.preventDefault(); if (nome.trim()) void confirmar(nome, false) }}>
                      <span className="mut" style={{ textAlign: 'center' }}>ou só com o nome (sem carta e sem histórico)</span>
                      <label style={{ display: 'flex' }}>
                        <span className="vh">Seu nome</span>
                        <input className="inp" placeholder="Seu nome" maxLength={40} value={nome} autoCapitalize="characters" onChange={(ev) => setNome(maiusculas(ev.target.value))} />
                      </label>
                      <button className="btn w" type="submit" disabled={!nome.trim()}>Entrar só com o nome</button>
                    </form>
                  )}
                  {erro && <div className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
                </div>
              </section>
            )}

            {!nativo() && celularAndroid() && !chamadaFechada && (
              <section className="panel pb" style={{ display: 'grid', gap: 8, textAlign: 'center', color: 'var(--navy)' }}>
                <b>Baixe o app e tenha todo o seu histórico de jogos!</b>
                <button className="btn sm" onClick={() => void abrirLink(ENDERECO_NA_LOJA)}>Baixar na Play Store</button>
                <button className="lnk" onClick={() => setChamadaFechada(true)}>Agora não</button>
              </section>
            )}

            <section className="panel">
              <div className="ph">Confirmados<span className="sub">{confirmados.length}</span></div>
              {confirmados.length === 0 && <div className="pb mut">Ninguém confirmou ainda. Seja o primeiro!</div>}
              {confirmados.map((confirmado) => <div key={confirmado.id} className="tr"><span className="nome">{confirmado.nome}</span>{confirmado.goleiro && <span className="tag">Goleiro</span>}{confirmado.naFila && <span className="mut">{confirmado.goleiro ? 'no gol' : 'na fila'}</span>}</div>)}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
