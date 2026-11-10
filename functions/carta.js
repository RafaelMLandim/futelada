// Carta do jogador (PLANO.md, seção 17): confere o resumo que o app manda ao encerrar a pelada.

const CAMPOS = ['jogos', 'vitorias', 'empates', 'gols', 'assistencias', 'amarelos', 'vermelhos', 'golsContra', 'jogosSemSofrer', 'vitoriasSeguidas']
const MAXIMO = 500 // nenhum número de uma pelada passa disso
const JOGADORES_NA_PELADA = 100

const numeroValido = (valor) => Number.isInteger(valor) && valor >= 0 && valor <= MAXIMO

/** Id da pelada na carta: repetir o envio regrava a mesma pelada, nunca soma duas vezes. */
export const idDaPeladaNaCarta = (organizador, data) => `${organizador}_${data}`

/** Devolve os jogadores só com os campos da carta, ou null se o resumo não faz sentido. */
export function jogadoresValidos(jogadores) {
  if (!Array.isArray(jogadores) || jogadores.length > JOGADORES_NA_PELADA) return null
  const contas = new Set()
  const validos = []
  for (const jogador of jogadores) {
    if (typeof jogador?.conta !== 'string' || !jogador.conta || jogador.conta.includes('/') || contas.has(jogador.conta)) return null
    if (!CAMPOS.every((campo) => numeroValido(jogador[campo]))) return null
    if (jogador.vitorias + jogador.empates > jogador.jogos) return null
    contas.add(jogador.conta)
    validos.push({
      conta: jogador.conta,
      ...Object.fromEntries(CAMPOS.map((campo) => [campo, jogador[campo]])),
      naSelecao: jogador.naSelecao === true,
      artilheiroDoDia: jogador.artilheiroDoDia === true,
      luvaDeOuro: jogador.luvaDeOuro === true,
    })
  }
  return validos
}
