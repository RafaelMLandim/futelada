// O torneio pode ficar só no celular (como a pelada) ou compartilhado na nuvem
// (PLANO.md, seção 10): aí vários celulares — organizador e mesários — veem e marcam
// ao mesmo tempo. Dura até ser apagado: serve para um dia ou para semanas.

import { useEffect, useMemo, useRef, useState } from 'react'
import { campeao, converterGoleirosAntigos, diferencas, juntar, novoCodigo, regrasPadrao, separar } from '../logic/torneio'
import { nuvemDisponivel, obterNuvem, type Nuvem } from '../nuvem'
import type { MesarioNoCampo } from '../nuvem/tipos'
import type { PartidaTorneio, Torneio } from '../types/torneio'

const CHAVE = 'torneio:v1'
const CHAVE_ATIVO = 'torneio:ativo'

/** Torneio compartilhado que este celular está acompanhando. */
export type Ativo = { codigo: string; campo: number | null; nome?: string; campeao?: string }

/**
 * Completa torneios salvos por versões antigas (antes dos jogos simultâneos, dos tempos, da prorrogação
 * e do goleiro como jogador do time).
 */
export function completar(t: Torneio): Torneio {
  const antigo = t.emAndamento as unknown
  const emAndamento: PartidaTorneio[] = Array.isArray(antigo)
    ? antigo
    : antigo ? [{ ...(antigo as PartidaTorneio), campo: 1 }] : []
  return converterGoleirosAntigos({ ...t, regras: { ...regrasPadrao, ...t.regras }, emAndamento })
}

const ler = <T,>(chave: string): T | null => {
  try {
    const salvo = localStorage.getItem(chave)
    return salvo ? (JSON.parse(salvo) as T) : null
  } catch {
    return null
  }
}
const escrever = (chave: string, valor: unknown) => {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // armazenamento cheio ou bloqueado: segue só em memória
  }
}

const carregarLocal = () => {
  const t = ler<Torneio>(CHAVE)
  return t ? completar(t) : null
}

/** Para a tela inicial: o torneio local ou o compartilhado que está sendo acompanhado. */
/** Nome do time campeão (null enquanto o torneio não acabou). */
const nomeDoCampeao = (t: Torneio) => {
  const id = campeao(t)
  return id ? t.times.find((x) => x.id === id)?.nome ?? null : null
}

export function torneioSalvo(): { nome: string; codigo?: string; campeao?: string } | null {
  const ativo = ler<Ativo>(CHAVE_ATIVO)
  if (ativo) return { nome: ativo.nome ?? 'Torneio compartilhado', codigo: ativo.codigo, campeao: ativo.campeao }
  const local = carregarLocal()
  return local ? { nome: local.nome, campeao: nomeDoCampeao(local) ?? undefined } : null
}

export type StatusNuvem = 'carregando' | 'ok' | 'nao-encontrado' | 'erro'

export function useTorneio() {
  const [ativo, setAtivoEstado] = useState<Ativo | null>(() => ler<Ativo>(CHAVE_ATIVO))
  const [torneio, setTorneio] = useState<Torneio | null>(() => (ativo ? null : carregarLocal()))
  const [status, setStatus] = useState<StatusNuvem>(ativo ? 'carregando' : 'ok')
  const [usuario, setUsuario] = useState<string | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  // quem está em cada campo (null = ainda carregando)
  const [campos, setCampos] = useState<Record<number, MesarioNoCampo> | null>(null)
  // Valor mais recente, para calcular e salvar na hora (mesmo que a tela feche em seguida)
  const atual = useRef(torneio)
  const nuvem = useRef<Nuvem | null>(null)
  const codigo = useRef(ativo?.codigo ?? null)

  const setAtivo = (a: Ativo | null) => {
    escrever(CHAVE_ATIVO, a)
    codigo.current = a?.codigo ?? null
    setAtivoEstado(a)
  }

  // Internet: só para mostrar o aviso (a nuvem guarda e sobe sozinha quando voltar)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Acompanha o torneio compartilhado em tempo real
  useEffect(() => {
    if (!ativo) return
    let parar = () => {}
    let vivo = true
    obterNuvem().then(async (n) => {
      if (!vivo) return
      if (!n) { setStatus('erro'); return }
      nuvem.current = n
      setUsuario(await n.usuario().catch(() => null))
      parar = n.ouvir(ativo.codigo, (dados) => {
        const junto = juntar(dados)
        const t = junto && completar(junto) // regras de versões antigas ganham os valores padrão
        atual.current = t
        setTorneio(t)
        setStatus(t ? 'ok' : 'nao-encontrado')
        // para a tela inicial: nome e campeão (sem precisar carregar o torneio da nuvem)
        const salvo = ler<Ativo>(CHAVE_ATIVO)
        const ganhou = t ? nomeDoCampeao(t) ?? undefined : undefined
        if (t && salvo && (t.nome !== salvo.nome || ganhou !== salvo.campeao)) escrever(CHAVE_ATIVO, { ...salvo, nome: t.nome, campeao: ganhou })
      }, () => setStatus('erro'))
    })
    return () => { vivo = false; parar() }
  }, [ativo])

  // Campos travados pelos mesários (refaz só quando muda o torneio, não o campo)
  const codigoAtivo = ativo?.codigo ?? null
  useEffect(() => {
    if (!codigoAtivo) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((n) => { if (n && vivo) parar = n.ouvirCampos(codigoAtivo, setCampos) })
    return () => { vivo = false; parar(); setCampos(null) }
  }, [codigoAtivo])

  const acoes = useMemo(() => {
    /** Muda o torneio: local salva no celular; compartilhado grava só o que mudou na nuvem. */
    const mudar = (fn: (t: Torneio | null) => Torneio | null) => {
      const antes = atual.current
      const novo = fn(antes)
      atual.current = novo
      setTorneio(novo)
      if (codigo.current && nuvem.current && antes && novo) {
        void nuvem.current.gravar(codigo.current, diferencas(antes, novo))
      } else if (!codigo.current) {
        escrever(CHAVE, novo)
      }
    }
    return {
      criar: (t: Torneio) => mudar(() => t),
      aplicar: (fn: (t: Torneio) => Torneio) => mudar((t) => (t ? fn(t) : t)),
    }
  }, [])

  // ---- Compartilhar / entrar / sair ----
  const compartilhar = async (): Promise<string | null> => {
    const n = await obterNuvem()
    const t = atual.current
    if (!n || !t) return null
    const uid = await n.usuario()
    let cod = novoCodigo()
    while (await n.existe(cod)) cod = novoCodigo()
    const compartilhado: Torneio = { ...t, nuvem: { codigo: cod, organizador: uid } }
    const partes = separar(compartilhado)
    await n.gravar(cod, [
      { tipo: 'base', base: partes.base! },
      ...partes.partidas.map((partida) => ({ tipo: 'partida' as const, partida })),
      ...Object.entries(partes.resultados).map(([jogoId, resultado]) => ({ tipo: 'resultado' as const, jogoId, resultado })),
    ])
    nuvem.current = n
    escrever(CHAVE, null) // agora ele vive na nuvem
    setStatus('carregando')
    setAtivo({ codigo: cod, campo: null, nome: t.nome })
    return cod
  }

  const entrar = async (cod: string): Promise<boolean> => {
    const n = await obterNuvem()
    const limpo = cod.trim().toUpperCase()
    if (!n || !(await n.existe(limpo))) return false
    setStatus('carregando')
    setAtivo({ codigo: limpo, campo: null })
    return true
  }

  /** Para de acompanhar o torneio compartilhado neste celular (ele continua na nuvem). */
  const sair = () => {
    const a = ler<Ativo>(CHAVE_ATIVO)
    if (a?.campo != null) void nuvem.current?.soltarCampo(a.codigo, a.campo)
    atual.current = carregarLocal()
    setTorneio(atual.current)
    setStatus('ok')
    setAtivo(null)
  }

  /** Apaga: local some do celular; compartilhado só o organizador apaga (para todos). */
  const apagar = async () => {
    if (ativo && nuvem.current) await nuvem.current.apagar(ativo.codigo)
    if (!ativo) escrever(CHAVE, null)
    atual.current = null
    setTorneio(null)
    setAtivo(null)
  }

  /** Mesário pega um campo (trava para os outros) e solta o anterior. false = o campo já tem mesário. */
  const definirCampo = async (campo: number | null): Promise<boolean> => {
    const a = ler<Ativo>(CHAVE_ATIVO)
    const n = await obterNuvem()
    if (!a || !n) return false
    if (campo !== null && !(await n.pegarCampo(a.codigo, campo))) return false
    if (a.campo != null && a.campo !== campo) void n.soltarCampo(a.codigo, a.campo)
    setAtivo({ ...a, campo })
    return true
  }
  /** Organizador libera um campo (ex.: o mesário foi embora sem soltar). */
  const liberarCampo = (campo: number) => { if (ativo) void nuvem.current?.soltarCampo(ativo.codigo, campo) }

  const souOrganizador = !torneio?.nuvem || torneio.nuvem.organizador === usuario

  return {
    torneio, ...acoes, apagar,
    compartilhado: ativo ? { codigo: ativo.codigo, status, online } : null,
    podeCompartilhar: nuvemDisponivel(),
    compartilhar, entrar, sair,
    /** Organizador faz tudo; mesário só marca os jogos do campo dele. */
    souOrganizador,
    /** O campo deste mesário (só vale enquanto a trava na nuvem for dele). */
    meuCampo: ativo?.campo != null && (campos === null || campos[ativo.campo]?.uid === usuario) ? ativo.campo : null,
    campos: campos ?? {},
    usuario,
    definirCampo, liberarCampo,
  }
}

export type TorneioHook = ReturnType<typeof useTorneio>
