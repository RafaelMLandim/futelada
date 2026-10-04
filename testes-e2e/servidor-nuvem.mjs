// Servidor de teste que faz o papel do Firebase (só para testes no navegador).
// Guarda os torneios em memória e avisa quem está ouvindo (Server-Sent Events).
import http from 'node:http'

const torneios = new Map() // código -> { base, partidas, resultados }
const ouvintes = new Map() // código -> Set<res>
const vazio = () => ({ base: null, partidas: [], resultados: {} })

function aplicar(dados, ops) {
  let { base, partidas, resultados } = dados
  for (const op of ops) {
    if (op.tipo === 'base') base = op.base
    else if (op.tipo === 'partida') partidas = [...partidas.filter((p) => p.jogoId !== op.partida.jogoId), op.partida]
    else if (op.tipo === 'apagarPartida') partidas = partidas.filter((p) => p.jogoId !== op.jogoId)
    else if (op.tipo === 'resultado') resultados = { ...resultados, [op.jogoId]: op.resultado }
    else { const { [op.jogoId]: _x, ...resto } = resultados; resultados = resto }
  }
  return { base, partidas, resultados }
}
const avisar = (c) => { for (const res of ouvintes.get(c) ?? []) res.write(`data: ${JSON.stringify(torneios.get(c) ?? vazio())}\n\n`) }

const porta = Number(process.env.PORTA ?? 5299)
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const c = url.searchParams.get('c') ?? ''
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); return res.end() }
  if (url.pathname === '/ouvir') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const lista = ouvintes.get(c) ?? new Set(); lista.add(res); ouvintes.set(c, lista)
    res.write(`data: ${JSON.stringify(torneios.get(c) ?? vazio())}\n\n`)
    req.on('close', () => lista.delete(res))
    return
  }
  if (url.pathname === '/dados') return res.end(JSON.stringify(torneios.get(c) ?? vazio()))
  let corpo = ''
  req.on('data', (d) => (corpo += d))
  req.on('end', () => {
    if (url.pathname === '/gravar') torneios.set(c, aplicar(torneios.get(c) ?? vazio(), JSON.parse(corpo)))
    if (url.pathname === '/apagar') torneios.delete(c)
    avisar(c)
    res.end('ok')
  })
}).listen(porta, () => console.log(`servidor de teste da nuvem em http://localhost:${porta}`))
