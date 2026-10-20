// Nuvem de teste: conversa com um servidor de teste local (que faz o papel do Firebase),
// para simular vários celulares no navegador, cada um com seu próprio armazenamento.
// Liga com localStorage "nuvem:teste" = endereço do servidor (ex.: http://localhost:5299).

import type { DadosNuvem, Operacao } from '../logic/torneio'
import { CONTADORES_ZERADOS, PLANO_VAZIO, type DadosDoPlano } from '../logic/plano'
import type { JogadorDaTurma } from '../logic/turma'
import type { MesarioNoCampo, Nuvem, PeladaNoHistorico, Turma } from './tipos'

/** Nome deste "celular" nos testes (localStorage "nuvem-teste:nome"). */
const nomeDeTeste = () => { try { return localStorage.getItem('nuvem-teste:nome') ?? 'Teste' } catch { return 'Teste' } }

/** Turmas da nuvem de teste, no localStorage deste navegador (avisa quem está ouvindo). */
const local = (() => {
  type Dados = { turmas: Turma[]; jogadores: Record<string, JogadorDaTurma[]>; peladas: PeladaNoHistorico[] }
  const ouvintes = new Set<() => void>()
  const ler = (): Dados => {
    try { return { turmas: [], jogadores: {}, peladas: [], ...JSON.parse(localStorage.getItem('nuvem-teste:turmas') ?? '') } as Dados } catch { return { turmas: [], jogadores: {}, peladas: [] } }
  }
  return {
    ler,
    turmas: () => ler().turmas,
    jogadores: (turma: string) => [...(ler().jogadores[turma] ?? [])],
    salvar: (d: Dados) => { localStorage.setItem('nuvem-teste:turmas', JSON.stringify(d)); ouvintes.forEach((f) => f()) },
    ouvir: (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } },
  }
})()

/**
 * Plano na nuvem de teste (localStorage "nuvem-teste:plano"): para testar as travas, ligue a cobrança
 * com { "config": { "ativa": true } } e mude os contadores ou o plano à mão.
 */
const planoLocal = (() => {
  type Dados = Omit<DadosDoPlano, 'aparelho'> & { aparelhos: Record<string, number> }
  const ouvintes = new Set<() => void>()
  const ler = (): Dados => {
    const vazio: Dados = { plano: PLANO_VAZIO, contadores: CONTADORES_ZERADOS, aparelhos: {}, config: { ativa: false } }
    try { return { ...vazio, ...JSON.parse(localStorage.getItem('nuvem-teste:plano') ?? '') } as Dados } catch { return vazio }
  }
  return {
    ler,
    salvar: (d: Dados) => { localStorage.setItem('nuvem-teste:plano', JSON.stringify(d)); ouvintes.forEach((f) => f()) },
    ouvir: (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } },
  }
})()

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
    async entrarComEmail() { throw new Error('Login só funciona com o Firebase') },
    async criarContaComEmail() { throw new Error('Login só funciona com o Firebase') },
    async sair() {},
    ouvirCaixa(aoMudar) { aoMudar([]); return () => {} },
    async lancarNoCaixa() { throw new Error('Caixa só funciona com o Firebase') },
    async apagarLancamento() {},
    // histórico também neste navegador (o mais novo primeiro, como no Firebase)
    ouvirHistorico(aoMudar) { const f = () => aoMudar([...local.ler().peladas].sort((a, b) => b.data - a.data)); f(); return local.ouvir(f) },
    async guardarPelada(pelada) {
      local.salvar({ ...local.ler(), peladas: [...local.ler().peladas, { ...JSON.parse(JSON.stringify(pelada)), id: `p${Date.now().toString(36)}` }] })
    },
    async apagarPelada(id) { local.salvar({ ...local.ler(), peladas: local.ler().peladas.filter((p) => p.id !== id) }) },
    // turmas: guardadas neste navegador (para testar a tela; no app de verdade, no Firebase)
    ouvirTurmas(aoMudar) { const f = () => aoMudar(local.turmas()); f(); return local.ouvir(f) },
    async criarTurma(nome) {
      const id = `turma${Date.now().toString(36)}`
      local.salvar({ ...local.ler(), turmas: [...local.turmas(), { id, nome, criadaEm: Date.now() }] })
      return id
    },
    ouvirJogadoresDaTurma(turma, aoMudar) { const f = () => aoMudar(local.jogadores(turma)); f(); return local.ouvir(f) },
    async registrarPeladaNaTurma(turma, jogadores, data) {
      const atuais = local.jogadores(turma)
      for (const j of jogadores) {
        const a = atuais.find((x) => x.id === j.id)
        if (a) Object.assign(a, { nome: j.nome, peladas: a.peladas + 1, ultimaPelada: data })
        else atuais.push({ id: j.id, nome: j.nome, peladas: 1, ultimaPelada: data })
      }
      local.salvar({ ...local.ler(), jogadores: { ...local.ler().jogadores, [turma]: atuais } })
    },
    ouvirPlano(aparelho, aoMudar) {
      const f = () => { const d = planoLocal.ler(); aoMudar({ plano: d.plano, contadores: d.contadores, aparelho: d.aparelhos[aparelho] ?? 0, config: d.config }) }
      f()
      return planoLocal.ouvir(f)
    },
    async contarUso(tipo, aparelho) {
      const d = planoLocal.ler()
      const contadores = { ...CONTADORES_ZERADOS, ...d.contadores, [tipo]: (d.contadores?.[tipo] ?? 0) + 1 }
      const aparelhos = tipo === 'peladas' ? { ...d.aparelhos, [aparelho]: (d.aparelhos[aparelho] ?? 0) + 1 } : d.aparelhos
      planoLocal.salvar({ ...d, contadores, aparelhos })
    },
    async usarCreditoDeTorneio() {
      const d = planoLocal.ler()
      if ((d.plano?.creditosTorneio ?? 0) <= 0) return false
      planoLocal.salvar({ ...d, plano: { ...d.plano!, creditosTorneio: d.plano!.creditosTorneio - 1 } })
      return true
    },
    async removerTurma(turma, peladas) {
      const d = local.ler()
      const { [turma]: _, ...jogadores } = d.jogadores
      local.salvar({ turmas: d.turmas.filter((t) => t.id !== turma), jogadores, peladas: d.peladas.filter((p) => !peladas.includes(p.id)) })
    },
    // sem conta Google na nuvem de teste: apaga o que é deste navegador e vira um usuário novo
    async excluirConta() {
      local.salvar({ turmas: [], jogadores: {}, peladas: [] })
      localStorage.removeItem('nuvem-teste:usuario')
      location.reload()
    },
    async importarTurma(turma, jogadores, peladas) {
      const d = local.ler()
      local.salvar({ ...d, jogadores: { ...d.jogadores, [turma]: jogadores }, peladas: d.peladas.map((p) => (peladas.includes(p.id) ? { ...p, turma } : p)) })
    },
    async publicarCobranca() { throw new Error('Campo pago só funciona com o Firebase') },
    ouvirCobranca() { return () => {} },
    async avisarPagamento() { throw new Error('Campo pago só funciona com o Firebase') },
    async apagarCobranca() {},
    // pelada compartilhada: no servidor de teste (outro "celular" acompanha ao vivo)
    async criarPeladaCompartilhada(codigo, dados, chave) {
      await fetch(url('pelada-criar', codigo), { method: 'POST', body: JSON.stringify({ dados, chave, uid: await this.usuario() }) })
    },
    async publicarPeladaCompartilhada(codigo, dados) {
      await fetch(url('pelada-publicar', codigo), { method: 'POST', body: JSON.stringify({ dados, uid: await this.usuario() }) })
    },
    async assumirControleDaPelada(codigo, chave, nome) {
      const resposta = await fetch(url('pelada-assumir', codigo), { method: 'POST', body: JSON.stringify({ chave, nome, uid: await this.usuario() }) })
      return resposta.ok
    },
    ouvirPeladaCompartilhada(codigo, aoMudar, aoErro) {
      const fonte = new EventSource(url('pelada-ouvir', codigo))
      fonte.onmessage = (evento) => aoMudar(JSON.parse(evento.data))
      fonte.onerror = () => aoErro?.(new Error('servidor de teste fora do ar'))
      return () => fonte.close()
    },

  }
}
