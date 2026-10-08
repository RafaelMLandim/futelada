// Nuvem de teste: conversa com um servidor de teste local (que faz o papel do Firebase),
// para simular vários celulares no navegador, cada um com seu próprio armazenamento.
// Liga com localStorage "nuvem:teste" = endereço do servidor (ex.: http://localhost:5299).

import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { MesarioNoCampo, Nuvem } from './tipos'

/** Nome deste "celular" nos testes (localStorage "nuvem-teste:nome"). */
const nomeDeTeste = () => { try { return localStorage.getItem('nuvem-teste:nome') ?? 'Teste' } catch { return 'Teste' } }

export function criarNuvemDeTeste(servidor: string): Nuvem {
  const url = (rota: string, codigo: string) => `${servidor}/${rota}?c=${encodeURIComponent(codigo)}`
  return {
    nome: 'teste',
    async usuario() {
      let id = localStorage.getItem('nuvem-teste:usuario')
      if (!id) {
        id = `u${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem('nuvem-teste:usuario', id)
      }
      return id
    },
    ouvir(codigo, aoMudar, aoErro) {
      const fonte = new EventSource(url('ouvir', codigo))
      fonte.onmessage = (ev) => aoMudar(JSON.parse(ev.data) as DadosNuvem)
      fonte.onerror = () => aoErro?.(new Error('servidor de teste fora do ar'))
      return () => fonte.close()
    },
    async gravar(codigo, ops: Operacao[]) {
      await fetch(url('gravar', codigo), { method: 'POST', body: JSON.stringify(ops) })
    },
    async existe(codigo) {
      const dados = (await (await fetch(url('dados', codigo))).json()) as DadosNuvem
      return dados.base !== null
    },
    async apagar(codigo) {
      await fetch(url('apagar', codigo), { method: 'POST' })
    },    // campos travados (o servidor de teste segue as mesmas regras do Firebase)
    ouvirCampos(codigo, aoMudar) {
      const fonte = new EventSource(url('campos', codigo))
      fonte.onmessage = (ev) => aoMudar(JSON.parse(ev.data) as Record<number, MesarioNoCampo>)
      return () => fonte.close()
    },
    async pegarCampo(codigo, campo) {
      const r = await fetch(url('pegar', codigo), { method: 'POST', body: JSON.stringify({ campo, uid: await this.usuario(), nome: nomeDeTeste(), foto: null }) })
      return r.ok
    },
    async soltarCampo(codigo, campo) {
      await fetch(url('soltar', codigo), { method: 'POST', body: JSON.stringify({ campo, uid: await this.usuario() }) })
    },
    // a nuvem de teste não tem login, caixa nem campo pago (só o Firebase)
    // usuário de teste já "logado" (passa da tela de login)
    ouvirPerfil(aoMudar) { void this.usuario().then((uid) => aoMudar({ uid, nome: nomeDeTeste(), email: null, foto: null, anonimo: false })); return () => {} },
    async entrarComGoogle() { throw new Error('Login só funciona com o Firebase') },
    async sair() {},
    ouvirCaixa(aoMudar) { aoMudar([]); return () => {} },
    async lancarNoCaixa() { throw new Error('Caixa só funciona com o Firebase') },
    async apagarLancamento() {},
    ouvirHistorico(aoMudar) { aoMudar([]); return () => {} },
    async guardarPelada() { throw new Error('Histórico só funciona com o Firebase') },
    async apagarPelada() {},
    async publicarCobranca() { throw new Error('Campo pago só funciona com o Firebase') },
    ouvirCobranca() { return () => {} },
    async avisarPagamento() { throw new Error('Campo pago só funciona com o Firebase') },
    async apagarCobranca() {},

  }
}
