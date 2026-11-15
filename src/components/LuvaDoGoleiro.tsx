// Luva de goleiro padrão do app, nas cores do time (o desenho está em utils/luva.ts).

import { desenhoDaLuva } from '../utils/luva'

/** `rotulo`: quando a luva está no lugar de um texto ("goleiro"), para o leitor de tela. */
export function LuvaDoGoleiro({ cor, segunda, tamanho = 24, rotulo }: { cor?: string; segunda?: string; tamanho?: number; rotulo?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: (rotulo ? `<title>${rotulo}</title>` : '') + desenhoDaLuva({ cor, segunda }) }} />
  )
}
