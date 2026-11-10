// Denúncia de foto ou apelido (PLANO.md, seção 17.6). Cada pessoa denuncia a mesma conta uma vez; com
// DENUNCIAS_PARA_REMOVER pessoas diferentes, o servidor tira a foto e o apelido sozinho (sem ninguém revisar).

export const MOTIVOS = ['impropria', 'nao-e-a-pessoa', 'outro']
export const DENUNCIAS_PARA_REMOVER = 3

/** O pedido do app: { conta, motivo }. null = inválido (inclusive denunciar a si mesmo). */
export function denunciaValida(dados, quemDenuncia) {
  const conta = dados?.conta
  const motivo = dados?.motivo
  if (typeof conta !== 'string' || !conta || conta.length > 128 || conta.includes('/')) return null
  if (conta === quemDenuncia || !MOTIVOS.includes(motivo)) return null
  return { conta, motivo }
}

/** Uma denúncia por pessoa para cada conta: o id junta as duas. */
export const idDaDenuncia = (conta, quemDenuncia) => `${conta}_${quemDenuncia}`

/** Com esta denúncia (já contada em `total`), a foto e o apelido saem. */
export const deveRemover = (total) => total >= DENUNCIAS_PARA_REMOVER
