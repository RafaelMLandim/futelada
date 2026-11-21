// Histórico de torneios (PLANO.md, seção 24): confere o resumo do torneio encerrado que o celular do organizador manda.
// O servidor grava uma cópia na conta de cada participante (que fica mesmo se o torneio for apagado).

const TAMANHO_MAXIMO = 300_000 // bytes do resumo em JSON (o Firestore aceita até 1 MB por documento)
const FORMATOS = ['pontos', 'mata-mata', 'grupos']

const texto = (valor, maximo = 60) => typeof valor === 'string' && valor.length <= maximo
const inteiro = (valor, maximo = 100_000) => Number.isInteger(valor) && valor >= 0 && valor <= maximo
const placar = (valor) => Array.isArray(valor) && valor.length === 2 && valor.every((gols) => inteiro(gols, 999))
const lista = (valor, maximo, item) => Array.isArray(valor) && valor.length <= maximo && valor.every(item)
const objeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const chaves = (valor, maximo) => objeto(valor) && Object.keys(valor).length <= maximo && Object.keys(valor).every((chave) => chave && !chave.includes('/') && chave.length <= 128)
const destaque = (valor) => valor === null || (objeto(valor) && texto(valor.nome) && texto(valor.time, 64) && inteiro(valor.valor, 9999) && (valor.segundo === undefined || inteiro(valor.segundo, 9999)))

/** Devolve o resumo só com os campos do histórico, ou null se não faz sentido. */
export function resumoDoHistoricoValido(resumo) {
  if (!objeto(resumo) || JSON.stringify(resumo).length > TAMANHO_MAXIMO) return null
  const { nome, data, formato, times, podio, final, artilheiro, garcom, luva, cartoes, melhor, jogos, jogadores, bolao } = resumo
  if (!texto(nome) || !nome.trim() || !Number.isInteger(data) || data <= 0 || !FORMATOS.includes(formato)) return null
  if (!lista(times, 128, (time) => objeto(time) && texto(time.id, 64) && texto(time.nome) && texto(time.cor, 32))) return null
  if (!lista(podio, 3, (time) => texto(time, 64)) || podio.length === 0) return null
  if (final !== null && !(objeto(final) && placar(final.placar) && (final.penaltis === null || placar(final.penaltis)))) return null
  if (![artilheiro, garcom, luva, cartoes].every(destaque)) return null
  if (melhor !== null && !(objeto(melhor) && texto(melhor.nome) && texto(melhor.time, 64))) return null
  if (!lista(jogos, 600, (jogo) => objeto(jogo) && texto(jogo.rodada) && placar(jogo.placar) && (jogo.penaltis === null || placar(jogo.penaltis)))) return null
  if (!chaves(jogadores, 1000) || !Object.values(jogadores).every((jogador) => objeto(jogador) && texto(jogador.time, 64)
    && ['jogos', 'gols', 'assistencias', 'amarelos', 'vermelhos'].every((campo) => inteiro(jogador[campo], 999)))) return null
  if (bolao !== null && !(objeto(bolao) && inteiro(bolao.participantes, 100_000) && lista(bolao.primeiros, 10, (linha) => objeto(linha) && texto(linha.nome))
    && chaves(bolao.contas, 5000))) return null
  // só os campos do histórico (JSON puro: sem nada além de texto, número, lista e objeto)
  return JSON.parse(JSON.stringify({ nome: nome.trim(), data, formato, times, podio, final, artilheiro, garcom, luva, cartoes, melhor, jogos, jogadores, bolao }))
}

/** Quem recebe o torneio no histórico: o organizador, quem jogou com conta e quem entrou no bolão (sem repetir). */
export function quemRecebe(organizador, base, participantesDoBolao) {
  const contas = new Set([organizador])
  for (const time of base?.times ?? []) for (const jogador of time.jogadores ?? []) if (typeof jogador.conta === 'string' && jogador.conta && !jogador.conta.includes('/')) contas.add(jogador.conta)
  for (const conta of participantesDoBolao) contas.add(conta)
  return [...contas]
}
