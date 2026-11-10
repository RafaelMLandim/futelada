import assert from 'node:assert/strict'
import { test } from 'node:test'
import { idDaPeladaNaCarta, jogadoresValidos } from '../carta.js'

const jogador = (parcial = {}) => ({
  conta: 'conta-1', jogos: 7, vitorias: 4, empates: 1, gols: 3, assistencias: 2, amarelos: 0, vermelhos: 0,
  golsContra: 0, jogosSemSofrer: 0, vitoriasSeguidas: 2, naSelecao: true, artilheiroDoDia: false, ...parcial,
})

test('resumo certo passa, só com os campos da carta', () => {
  const [valido] = jogadoresValidos([jogador({ hacker: true })])
  assert.equal(valido.gols, 3)
  assert.equal(valido.naSelecao, true)
  assert.equal(valido.luvaDeOuro, false)
  assert.equal('hacker' in valido, false)
  assert.equal(jogadoresValidos([jogador({ luvaDeOuro: true })])[0].luvaDeOuro, true)
})

test('barra números impossíveis', () => {
  assert.equal(jogadoresValidos([jogador({ gols: -1 })]), null)
  assert.equal(jogadoresValidos([jogador({ gols: 9999 })]), null)
  assert.equal(jogadoresValidos([jogador({ gols: 1.5 })]), null)
  assert.equal(jogadoresValidos([jogador({ vitorias: 8 })]), null)
})

test('barra conta repetida, sem conta ou com caminho no meio', () => {
  assert.equal(jogadoresValidos([jogador(), jogador()]), null)
  assert.equal(jogadoresValidos([jogador({ conta: '' })]), null)
  assert.equal(jogadoresValidos([jogador({ conta: 'a/b' })]), null)
  assert.equal(jogadoresValidos('nada'), null)
})

test('a mesma pelada tem sempre o mesmo id: reenviar não soma de novo', () => {
  assert.equal(idDaPeladaNaCarta('dono', 123), idDaPeladaNaCarta('dono', 123))
})
