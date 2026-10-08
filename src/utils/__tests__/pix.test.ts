import { describe, expect, it } from 'vitest'
import { crc16, pixCopiaECola } from '../pix'

describe('Pix copia e cola', () => {
  it('CRC16-CCITT confere com o valor de referência', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('monta o BR Code com chave, valor, nome e cidade (e o CRC no fim)', () => {
    const pix = pixCopiaECola({ chave: '+5511999998888', recebedor: 'João Pelé', cidade: 'São Paulo', valor: 10, identificador: 'PELADA' })
    expect(pix.startsWith('000201')).toBe(true)
    expect(pix).toContain('0014br.gov.bcb.pix0114+5511999998888')
    expect(pix).toContain('540510.00')
    expect(pix).toContain('5909JOAO PELE')
    expect(pix).toContain('6009SAO PAULO')
    expect(pix).toContain('62100506PELADA')
    expect(pix.slice(-8, -4)).toBe('6304')
    expect(pix.slice(-4)).toBe(crc16(pix.slice(0, -4)))
  })

  it('sem valor, quem paga digita (não tem o campo 54)', () => {
    expect(pixCopiaECola({ chave: 'a@b.com', recebedor: 'Ana' })).not.toContain('5404')
  })
})
