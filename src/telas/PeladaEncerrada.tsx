import { useMemo } from 'react'
import type { PeladaCompartilhada } from '../nuvem/tipos'
import { peladaSoParaVer } from '../store/peladaAoVivo'
import { dataDo } from '../utils/formatar'
import { SomenteLeitura } from '../utils/somenteLeitura'
import { Faixa } from './PeladaAoVivo'
import { Tabela } from './Tabela'

/**
 * Pelada compartilhada que acabou (PLANO.md, seção 16): quem acompanhou ou ajudou vê a tabela final do dia
 * (resultados, classificação, artilharia, seleção, compartilhar o resumo), só para ver. `aoFechar`: só o dono.
 */
export function PeladaEncerrada({ dados, aviso, aoFechar }: { dados: PeladaCompartilhada; aviso?: string; aoFechar?: () => void }) {
  const pelada = useMemo(() => peladaSoParaVer(dados), [dados])
  return (
    <SomenteLeitura.Provider value={true}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
        <Faixa cor="var(--navy)">🏁 Pelada encerrada{dados.nomeDoDono ? ` · pelada de ${dados.nomeDoDono}` : ''}{aviso ? ` · ${aviso}` : ''}</Faixa>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabela pelada={pelada} data={dataDo(dados.atualizadaEm)} />
        </div>
        {aoFechar && (
          <div className="pb" style={{ background: 'var(--navy)' }}>
            <button className="btn" onClick={aoFechar}>Fechar</button>
          </div>
        )}
      </div>
    </SomenteLeitura.Provider>
  )
}
