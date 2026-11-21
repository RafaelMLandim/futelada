import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quemRecebe, resumoDoHistoricoValido } from '../historico.js'

const resumo = (parcial = {}) => ({
  nome: 'Copa da Vila', data: 1_700_000_000_000, organizador: 'org', formato: 'mata-mata',
  times: [{ id: 't1', nome: 'Real', cor: '#E11D48' }, { id: 't2', nome: 'Galáticos', cor: '#2563EB' }],
  podio: ['t1', 't2'], final: { placar: [2, 1], penaltis: null },
  artilheiro: { nome: 'Daniel', time: 't1', valor: 9 }, garcom: null, luva: { nome: 'Pedrão', time: 't1', valor: 3, segundo: 5 }, cartoes: null, melhor: null,
  jogos: [{ rodada: 'Final', fase: 'mata', grupo: null, casa: 't1', fora: 't2', placar: [2, 1], penaltis: null }],
  jogadores: { 'conta-1': { time: 't1', jogos: 5, gols: 6, assistencias: 2, amarelos: 1, vermelhos: 0 } },
  bolao: { participantes: 2, primeiros: [{ nome: 'Fabi', posicao: 1, pontos: 30 }], contas: { 'conta-2': { posicao: 1, pontos: 30, cravados: 2, campeao: true } } },
  ...parcial,
})

test('resumo certo passa, só com os campos do histórico', () => {
  const valido = resumoDoHistoricoValido(resumo({ hacker: true }))
  assert.equal(valido.nome, 'Copa da Vila')
  assert.equal('hacker' in valido, false)
  assert.equal('organizador' in valido, false) // quem organizou vem do servidor
})

test('barra resumo sem sentido', () => {
  assert.equal(resumoDoHistoricoValido(resumo({ nome: '' })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ podio: [] })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ formato: 'outro' })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ final: { placar: [-1, 0], penaltis: null } })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ jogadores: { 'a/b': { time: 't1', jogos: 1, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 } } })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ nome: 'x'.repeat(61) })), null)
  assert.equal(resumoDoHistoricoValido(resumo({ jogos: Array.from({ length: 601 }, () => resumo().jogos[0]) })), null)
  assert.equal(resumoDoHistoricoValido('nada'), null)
})

test('recebem: organizador, quem jogou com conta e quem está no bolão, sem repetir', () => {
  const base = { times: [{ jogadores: [{ conta: 'a' }, { nome: 'sem conta' }, { conta: 'org' }] }, { jogadores: [{ conta: 'x/y' }] }] }
  assert.deepEqual(quemRecebe('org', base, ['a', 'b']), ['org', 'a', 'b'])
})
