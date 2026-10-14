import { useContext, useState } from 'react'
import type { Perfil } from '../nuvem/tipos'
import { useConta } from '../store/conta'
import { useConfirmar } from '../utils/confirmacao'
import { abrirLink, paginaDoSite } from '../utils/nativo'
import { Icone } from './Icone'
import { MeuPlano } from './MeuPlano'
import { VoltarAoInicio } from './navegacao'

/** A foto do Google (ou a inicial do nome, sem foto). */
function Foto({ perfil, tamanho }: { perfil: Perfil; tamanho: number }) {
  const nome = perfil.nome ?? perfil.email ?? ''
  const estilo = { width: tamanho, height: tamanho, borderRadius: '50%', border: '2px solid var(--amarelo)', flex: 'none', display: 'block' } as const
  if (perfil.foto) return <img src={perfil.foto} alt="" style={estilo} referrerPolicy="no-referrer" />
  return (
    <span className="num" style={{ ...estilo, display: 'grid', placeItems: 'center', background: 'var(--amarelo)', color: 'var(--navy)', fontSize: tamanho * 0.5 }}>
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

// Foto de quem entrou com o Google, no topo. Tocar abre as opções: plano, voltar ao início, sair e excluir a conta.
export function Avatar({ tamanho = 36 }: { tamanho?: number }) {
  const { perfil, logado, sair, excluirConta } = useConta()
  const confirmar = useConfirmar()
  const [aberta, setAberta] = useState(false)
  const [plano, setPlano] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // conta com e-mail e senha: pede a senha antes de excluir (no Google, a própria conta do Google confirma)
  const [senha, setSenha] = useState<string | null>(null)
  const voltarAoInicio = useContext(VoltarAoInicio)
  if (!logado || !perfil) return null
  const nome = perfil.nome ?? perfil.email ?? ''
  const pedirExclusao = () => confirmar({
    titulo: 'Excluir conta',
    mensagem: 'Excluir a conta apaga para sempre o histórico, as turmas, o caixa, os torneios e as cobranças que você criou. '
      + 'Se você assina o Premium, cancele a assinatura na Play Store: excluir a conta não cancela a cobrança. Deseja excluir?',
    botao: 'Excluir',
    perigo: true,
    aoConfirmar: () => (perfil.comSenha ? setSenha('') : void excluir()),
  })
  const excluir = async (comSenha?: string) => {
    setErro(null)
    setExcluindo(true)
    const falhou = await excluirConta(comSenha)
    setExcluindo(false)
    setErro(falhou)
  }
  return (
    <>
      <button aria-label={`Conta: ${nome}`} onClick={() => setAberta(true)}
        style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}>
        <Foto perfil={perfil} tamanho={tamanho} />
      </button>
      {aberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Opções" onClick={() => setAberta(false)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 360 }}>
            <div className="ph">Opções</div>
            <div className="pb" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
              <Foto perfil={perfil} tamanho={72} />
              <div style={{ display: 'grid', gap: 2 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)' }}>{perfil.nome ?? perfil.email}</div>
                {perfil.nome && perfil.email && <div className="mut">{perfil.email}</div>}
              </div>
              <button className="btn w" onClick={() => { setAberta(false); setPlano(true) }}><Icone nome="trofeu" /> Meu plano</button>
              {voltarAoInicio && (
                <button className="btn" onClick={() => { setAberta(false); voltarAoInicio() }}><Icone nome="inicio" /> Voltar ao início</button>
              )}
              <button className="btn r sm" onClick={() => { setAberta(false); void sair() }}>Sair da conta</button>
              <button className="btn w sm" onClick={() => setAberta(false)}>Fechar</button>
              {erro && <div className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
              <button className="lnk" disabled={excluindo} onClick={pedirExclusao} style={{ color: 'var(--vermelho)' }}>
                {excluindo ? 'Excluindo a conta…' : 'Excluir conta'}
              </button>
              <div className="mut" style={{ display: 'flex', gap: 14 }}>
                <button className="lnk" onClick={() => void abrirLink(paginaDoSite('termos'))}>Termos de uso</button>
                <button className="lnk" onClick={() => void abrirLink(paginaDoSite('privacidade'))}>Privacidade</button>
              </div>
            </div>
          </section>
        </div>
      )}
      {plano && <MeuPlano onFechar={() => setPlano(false)} />}
      {senha !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Confirme a senha" onClick={() => setSenha(null)}>
          <form className="panel" style={{ width: '100%', maxWidth: 360, color: 'var(--navy)' }} onClick={(ev) => ev.stopPropagation()}
            onSubmit={(ev) => { ev.preventDefault(); const s = senha; setSenha(null); void excluir(s) }}>
            <div className="ph">Excluir conta</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Para excluir, digite a senha da conta {perfil.email}.</div>
              <label style={{ display: 'flex' }}>
                <span className="vh">Senha</span>
                <input className="inp" type="password" autoFocus autoComplete="current-password" placeholder="Senha" value={senha}
                  onChange={(ev) => setSenha(ev.target.value)} />
              </label>
            </div>
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn w sm" type="button" onClick={() => setSenha(null)}>Cancelar</button>
              <button className="btn r sm" type="submit" disabled={!senha}>Excluir</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
