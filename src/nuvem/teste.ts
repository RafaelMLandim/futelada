// Nuvem de teste: conversa com um servidor de teste local (que faz o papel do Firebase),
// para simular vários celulares no navegador, cada um com seu próprio armazenamento.
// Liga com localStorage "nuvem:teste" = endereço do servidor (ex.: http://localhost:5299).

import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { Nuvem } from './tipos'

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
    },
  }
}
