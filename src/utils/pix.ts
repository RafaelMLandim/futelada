// Pix "copia e cola" (BR Code estático do Banco Central): a chave Pix de quem recebe, o valor e
// o nome/cidade. O app só monta o código; o dinheiro vai direto de quem paga para quem recebe.

/** Campo no formato do BR Code: id (2 dígitos) + tamanho (2 dígitos) + valor. */
const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, '0')}${valor}`

/** Tira acentos e caracteres que o BR Code não aceita, em maiúsculas, até `max` letras. */
function limpar(texto: string, max: number): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim().toUpperCase().slice(0, max)
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais. */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (const ch of new TextEncoder().encode(texto)) {
    crc ^= ch << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export type DadosPix = {
  chave: string // CPF, celular (+55…), e-mail ou chave aleatória
  recebedor: string // nome de quem recebe
  cidade?: string // o banco não confere; sem cidade vai "BRASIL"
  valor?: number // em reais; sem valor, quem paga digita
  identificador?: string // aparece no extrato (só letras e números)
}

/** Monta o Pix copia e cola. */
export function pixCopiaECola({ chave, recebedor, cidade, valor, identificador }: DadosPix): string {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())
  const corpo = [
    campo('00', '01'),
    campo('26', conta),
    campo('52', '0000'),
    campo('53', '986'), // real
    valor && valor > 0 ? campo('54', valor.toFixed(2)) : '',
    campo('58', 'BR'),
    campo('59', limpar(recebedor, 25) || 'RECEBEDOR'),
    campo('60', limpar(cidade ?? '', 15) || 'BRASIL'),
    campo('62', campo('05', limpar(identificador ?? '', 25).replace(/ /g, '') || '***')),
    '6304',
  ].join('')
  return corpo + crc16(corpo)
}
