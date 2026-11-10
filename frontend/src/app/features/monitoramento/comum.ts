import { Component, input } from '@angular/core';
import { CardMonitoramento } from '../../core/models';

/** Rótulos do monitoramento (fase 3). */
export const NATUREZAS: Record<string, string> = { INVESTIMENTO: 'Investimento', EMPREGO: 'Geração de emprego', MANUTENCAO_ATIVIDADE: 'Manutenção de atividade' };
export const SIT_CONTRAPARTIDA: Record<string, string> = {
  DIA: 'Em dia', EM_DIA: 'Em dia', ATENCAO: 'Em atenção', ATRASO: 'Em atraso', CUMPRIDA: 'Cumprida', ENCERRADA: 'Encerrada',
  SEM_CONTRAPARTIDA: 'Sem contrapartida', NAO_SE_APLICA: 'Não se aplica',
};
export const RISCOS: Record<string, string> = { ALTO: 'Risco alto', MEDIO: 'Risco médio', BAIXO: 'Risco baixo' };
export const SIT_PRESTACAO: Record<string, string> = { AGUARDANDO_ANALISE: 'Aguardando análise', VALIDADA: 'Validada', RECUSADA: 'Recusada' };
export const PERIODICIDADES: Record<string, string> = { UNICA: 'única', SEMESTRAL: 'semestral', ANUAL: 'anual' };
export const TIPOS_OCORRENCIA: Record<string, string> = {
  VERIFICACAO_FISCAL: 'Verificação fiscal', INCONSISTENCIA: 'Inconsistência de apuração', NOTIFICACAO_PRESTACAO: 'Notificação de prestação pendente',
  VERIFICACAO_CONTRAPARTIDA: 'Verificação de contrapartida',
};
/** Cor da etiqueta para a situação textual da concessão (ok | acao | ruim). */
export const TIPO_SITUACAO: Record<string, string> = { ok: 'VIGENTE', acao: 'ATENCAO', ruim: 'ATRASO' };

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Meta ou realizado conforme a unidade da contrapartida. */
export function fmtMeta(v: number, unidade: string): string {
  if (unidade === 'MOEDA') return moeda(v);
  if (unidade === 'POSTOS') return `${Math.round(v)} postos`;
  return v >= 1 ? 'atividade mantida' : 'não mantida';
}

export function fmtMoeda(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : moeda(v);
}

/** Linha de indicadores calculados pelo servidor. */
@Component({
  selector: 'bf-kpis',
  template: `
    <div class="grade" [class.grade-3]="cards().length === 3 || cards().length === 5" [class.grade-4]="cards().length === 4">
      @for (c of cards(); track c.rotulo) {
        <div class="cartao kpi"><span class="rotulo">{{ c.rotulo }}</span><span class="valor" [class.alerta]="c.alerta">{{ c.valor }}</span><span class="detalhe">{{ c.detalhe }}</span></div>
      }
    </div>
  `,
  styles: `.alerta { color: #b45309; } .kpi .valor { font-size: 20px; }`,
})
export class KpisComponent {
  readonly cards = input<CardMonitoramento[]>([]);
}
