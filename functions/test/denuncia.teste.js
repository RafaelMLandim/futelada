import { test } from 'node:test'
import assert from 'node:assert/strict'
import { denunciaValida, deveRemover, idDaDenuncia } from '../denuncia.js'

test('aceita só conta e motivo válidos, e ninguém denuncia a si mesmo', () => {
  assert.deepEqual(denunciaValida({ conta: 'outra', motivo: 'impropria' }, 'eu'), { conta: 'outra', motivo: 'impropria' })
  assert.equal(denunciaValida({ conta: 'eu', motivo: 'impropria' }, 'eu'), null)
  assert.equal(denunciaValida({ conta: 'outra', motivo: 'qualquer' }, 'eu'), null)
  assert.equal(denunciaValida({ conta: 'a/b', motivo: 'outro' }, 'eu'), null)
  assert.equal(denunciaValida({ motivo: 'outro' }, 'eu'), null)
  assert.equal(denunciaValida(null, 'eu'), null)
})

test('uma denúncia por pessoa e remoção na terceira', () => {
  assert.equal(idDaDenuncia('outra', 'eu'), 'outra_eu')
  assert.equal(deveRemover(2), false)
  assert.equal(deveRemover(3), true)
})
