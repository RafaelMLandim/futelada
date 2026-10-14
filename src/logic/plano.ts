// Plano pago (PLANO.md, seção 14): 10 peladas grátis (por conta e por celular), Pelada Premium e
// Torneio avulso (o 1º torneio é grátis, até 8 times). Quem diz se a pessoa pagou é o servidor
// (`planos/{uid}`); o app só lê. A cobrança só vale depois de ligada (`config/cobranca.ativa`).

export const PELADAS_GRATIS = 10
/** Premium avulso: avisa para renovar quando faltar isso (dias). */
export const AVISO_DE_VENCIMENTO = 30
const DIA = 24 * 3600_000
export const TIMES_DO_TORNEIO_GRATIS = 8

/**
 * O que a pessoa comprou (gravado só pelo servidor). `assinatura`: o Premium renova sozinho (assinatura
 * da loja); false = Premium avulso de 12 meses (pago no Pix, por exemplo), que vence e não renova.
 */
export type Plano = { premiumAte: number | null; creditosTorneio: number; assinatura?: boolean }
/** Quanto a conta já usou (o app só consegue somar 1). */
export type Contadores = { peladas: number; torneios: number }
/** Liga/desliga a cobrança sem lançar versão nova do app. */
export type ConfigCobranca = { ativa: boolean }
/** O que vem da nuvem (null = ainda carregando ou sem internet). */
export type DadosDoPlano = {
  plano: Plano | null
  contadores: Contadores | null
  aparelho: number | null // peladas já feitas neste celular (qualquer conta)
  config: ConfigCobranca | null
}

export const PLANO_VAZIO: Plano = { premiumAte: null, creditosTorneio: 0 }
export const CONTADORES_ZERADOS: Contadores = { peladas: 0, torneios: 0 }

export type Situacao = {
  cobrancaAtiva: boolean
  premium: boolean
  premiumAte: number | null
  /** O Premium renova sozinho (assinatura); false = avulso de 12 meses. */
  renovaSozinho: boolean
  /** Premium avulso: dias até vencer (para avisar quem precisa renovar); null nos outros casos. */
  diasParaVencer: number | null
  /** Peladas grátis já usadas: o que for maior entre a conta e o celular. */
  peladasUsadas: number
  peladasGratisRestantes: number
  podeComecarPelada: boolean
  creditosTorneio: number
  /** O 1º torneio (até 8 times) ainda não foi usado. */
  torneioGratis: boolean
}

export function situacaoDoPlano(dados: DadosDoPlano, agora: number): Situacao {
  const plano = dados.plano ?? PLANO_VAZIO
  const contadores = dados.contadores ?? CONTADORES_ZERADOS
  // sem saber se a cobrança está ligada (carregando, sem internet), não trava ninguém
  const cobrancaAtiva = dados.config?.ativa === true
  const premium = !!plano.premiumAte && plano.premiumAte > agora
  const peladasUsadas = Math.max(contadores.peladas, dados.aparelho ?? 0)
  const peladasGratisRestantes = Math.max(0, PELADAS_GRATIS - peladasUsadas)
  const renovaSozinho = premium && plano.assinatura === true
  return {
    cobrancaAtiva,
    premium,
    premiumAte: plano.premiumAte,
    renovaSozinho,
    diasParaVencer: premium && !renovaSozinho ? Math.ceil((plano.premiumAte! - agora) / DIA) : null,
    peladasUsadas,
    peladasGratisRestantes,
    podeComecarPelada: !cobrancaAtiva || premium || peladasGratisRestantes > 0,
    creditosTorneio: plano.creditosTorneio,
    torneioGratis: contadores.torneios === 0,
  }
}

/** Como um torneio novo pode ser criado: liberado (cobrança desligada), o grátis, com crédito ou bloqueado. */
export type CriarTorneio = 'liberado' | 'gratis' | 'credito' | 'bloqueado'
export function comoCriarTorneio(s: Situacao): CriarTorneio {
  if (!s.cobrancaAtiva) return 'liberado'
  if (s.torneioGratis) return 'gratis'
  if (s.creditosTorneio > 0) return 'credito'
  return 'bloqueado'
}

/** Texto do contador no início ("Pelada 3 de 10 grátis"); null quando não se aplica. */
export function textoDasPeladasGratis(s: Situacao): string | null {
  if (!s.cobrancaAtiva || s.premium) return null
  if (s.peladasGratisRestantes === 0) return 'Peladas grátis usadas'
  return `Pelada ${s.peladasUsadas + 1} de ${PELADAS_GRATIS} grátis`
}
