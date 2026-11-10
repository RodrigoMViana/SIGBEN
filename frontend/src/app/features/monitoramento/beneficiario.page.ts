import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { ApiService } from '../../core/api.service';
import { FichaBeneficiario } from '../../core/models';
import { BarrasComponent, StatusTagComponent } from '../../shared/ui';
import { KpisComponent, NATUREZAS, PERIODICIDADES, RISCOS, SIT_CONTRAPARTIDA, SIT_PRESTACAO, TIPOS_OCORRENCIA, TIPO_SITUACAO, fmtMeta, fmtMoeda } from './comum';

/** Ficha do beneficiário no Cadastro Estadual: concessões, risco, contrapartidas, renúncia e histórico de acompanhamento. */
@Component({
  selector: 'app-beneficiario',
  imports: [RouterLink, DatePipe, NzTabsModule, NzButtonModule, NzIconModule, NzAlertModule, NzProgressModule, StatusTagComponent, BarrasComponent, KpisComponent],
  template: `
    @if (erro()) {
      <div class="pagina">
        <a routerLink="/beneficiarios" class="voltar"><nz-icon nzType="arrow-left" /> Cadastro Estadual</a>
        <nz-alert nzType="warning" nzShowIcon nzMessage="Empresa sem benefício no Cadastro Estadual"
          nzDescription="Nenhum benefício foi concedido a esta empresa: não há renúncia, contrapartidas nem classificação de risco a monitorar. Consulte os processos dela na consulta de processos." />
      </div>
    } @else if (f(); as f) {
      <div class="pagina">
        <div class="pagina-cabecalho">
          <div><a routerLink="/beneficiarios" class="voltar"><nz-icon nzType="arrow-left" /> Cadastro Estadual</a>
            <h1>{{ f.razaoSocial }}</h1>
            <div class="subtitulo">CNPJ {{ f.cnpj }} · IE {{ f.inscricaoEstadual }} · {{ f.municipio }} · porte {{ f.porte }}</div></div>
          <bf-status [valor]="f.risco" [rotulo]="riscos[f.risco]" />
        </div>
        @if (!f.ativo) {
          <nz-alert nzType="error" nzShowIcon nzMessage="Benefício cassado"
            [nzDescription]="'O benefício foi cassado' + (f.encerradoEm ? ' em ' + (f.encerradoEm + 'T12:00:00' | date: 'dd/MM/yyyy') : '') + '. O beneficiário permanece no Cadastro Estadual para histórico, fora dos totais de renúncia corrente e sem contrapartidas em acompanhamento.'" />
        }
        <nz-tabs [nzSelectedIndex]="aba()" (nzSelectedIndexChange)="aba.set($event)">
          <nz-tab nzTitle="Visão geral e risco" /><nz-tab nzTitle="Contrapartidas" /><nz-tab nzTitle="Renúncia" /><nz-tab nzTitle="Prestações e ocorrências" />
        </nz-tabs>

        @switch (aba()) {
          @case (0) {
            <bf-kpis [cards]="f.cards" />
            @if (f.processoAcaoId) {
              <nz-alert nzType="info" nzShowIcon nzMessage="Procedimentos da Secretaria"
                nzDescription="Identificado descumprimento, a suspensão ou a cassação é iniciada no benefício concedido, com notificação prévia ao contribuinte." [nzAction]="acaoProc" />
              <ng-template #acaoProc><a nz-button [routerLink]="['/processos', f.processoAcaoId]">Abrir o processo de origem</a></ng-template>
            }
            <div class="cartao">
              <div class="cartao-titulo"><span><nz-icon nzType="safety-certificate" />{{ f.concessoes.length === 1 ? 'Benefício concedido' : f.concessoes.length + ' benefícios concedidos' }}</span>
                <span class="suave">cada concessão tem vigência e situação próprias</span></div>
              <div class="lista">
                @for (c of f.concessoes; track c.processoId) {
                  <div class="item">
                    <div class="texto"><strong>{{ c.beneficio }}</strong>
                      <span class="suave pequeno">Processo {{ c.numeroProcesso }} · {{ c.tipoConcessao }} · concessão em {{ c.concessao + 'T12:00:00' | date: 'dd/MM/yyyy' }}
                        {{ c.vigenciaFim ? ' · vigência até ' + (c.vigenciaFim + 'T12:00:00' | date: 'dd/MM/yyyy') : '' }} · renúncia de {{ moeda(c.renuncia12) }} em {{ c.mesesApurados }} mês(es) apurado(s)</span></div>
                    <bf-status [valor]="tipo[c.situacaoTipo]" [rotulo]="c.situacao" />
                    <a nz-button nzSize="small" [routerLink]="['/processos', c.processoId]">Abrir processo</a>
                  </div>
                }
              </div>
            </div>
            <div class="cartao">
              <div class="cartao-titulo"><span><nz-icon nzType="alert" />Critérios que compõem a classificação de risco</span>
                <span class="suave">{{ contagem().altos }} em nível alto e {{ contagem().medios }} em médio compõem a nota {{ riscos[f.risco].toLowerCase() }}</span></div>
              <div class="lista">
                @for (c of f.criterios; track c.nome) {
                  <div class="item"><div class="texto"><strong>{{ c.nome }}</strong><span class="suave pequeno">{{ c.detalhe }}</span>
                    @if (c.acao) { <span class="acao"><nz-icon nzType="caret-right" />{{ c.acao }}</span> }</div>
                    <bf-status [valor]="c.nivel" [rotulo]="riscos[c.nivel]" /></div>
                }
              </div>
              <div class="cartao-corpo suave pequeno rodape">A composição da nota e as faixas de corte são parametrizadas e devem ser validadas com a Secretaria.</div>
            </div>
          }
          @case (1) {
            @for (c of f.contrapartidas; track c.id) {
              <div class="cartao">
                <div class="cartao-titulo"><span>{{ naturezas[c.natureza] ?? c.natureza }}</span><bf-status [valor]="c.situacao" [rotulo]="sitCp[c.situacao]" /></div>
                <div class="cartao-corpo coluna">
                  <span class="suave">Meta {{ meta(c.meta, c.unidade) }} até {{ c.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }} · comprovação {{ per[c.periodicidade] }}</span>
                  <nz-progress [nzPercent]="c.percentual > 100 ? 100 : c.percentual" [nzStatus]="c.situacao === 'ATRASO' ? 'exception' : c.situacao === 'CUMPRIDA' ? 'success' : 'normal'"
                    [nzFormat]="fmtPct(c.percentual)" />
                  <span class="pequeno">Realizado {{ meta(c.realizado, c.unidade) }} · última comprovação {{ c.ultimaComprovacao ? (c.ultimaComprovacao + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}
                    · próxima {{ c.proximaComprovacao ? (c.proximaVencida ? 'vencida em ' : '') + (c.proximaComprovacao + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</span>
                </div>
              </div>
            } @empty {
              <nz-alert nzType="info" nzShowIcon [nzMessage]="f.ativo ? 'Benefício sem contrapartida estruturada' : 'Acompanhamento encerrado'"
                [nzDescription]="f.ativo ? 'O Tipo de Concessão deste benefício não gera Ato Declaratório nem termo de acordo: não há contrapartida a acompanhar. A fruição é verificada pela apuração do imposto.' : 'Com a cassação, as contrapartidas deixaram de ser exigíveis.'" />
            }
            <nz-alert nzType="info" nzShowIcon nzMessage="Só é monitorável o que foi estruturado"
              nzDescription="Cada contrapartida acompanhada aqui foi registrada como campo estruturado no Ato Declaratório. Contrapartidas descritas apenas no texto do documento não aparecem neste acompanhamento." />
          }
          @case (2) {
            <nz-alert nzType="warning" nzShowIcon nzMessage="Dependência da Escrituração Fiscal Digital"
              nzDescription="A renúncia é apurada da escrituração declarada pelo contribuinte (EFD). A disponibilidade desse insumo em base estruturada é condição para o funcionamento desta funcionalidade." />
            <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="bar-chart" />Renúncia mensal nos últimos 12 meses</span>
              <span class="suave">diferença entre o imposto devido sem o benefício e o apurado (R$)</span></div>
              <div class="cartao-corpo"><bf-barras [barras]="barras()" /></div></div>
          }
          @case (3) {
            <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="file-done" />Prestações de contas</span></div>
              <div class="lista">
                @for (p of f.prestacoes; track p.id) {
                  <div class="item"><div class="texto"><strong>{{ p.protocolo }} · {{ p.periodo }}</strong>
                    <span class="suave pequeno">Enviada em {{ p.enviadaEm | date: 'dd/MM/yyyy HH:mm' }} por {{ p.enviadaPor }} · {{ p.houveFruicao ? 'houve fruição' : 'sem fruição no período' }}
                      {{ p.analisadaEm ? ' · analisada em ' + (p.analisadaEm | date: 'dd/MM/yyyy') + ' por ' + p.analisadaPor : '' }}{{ p.motivoRecusa ? ' · ' + p.motivoRecusa : '' }}</span></div>
                    <bf-status [valor]="p.situacao" [rotulo]="sitPc[p.situacao]" /></div>
                } @empty { <div class="cartao-corpo suave">Nenhuma prestação de contas enviada.</div> }
              </div></div>
            <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="audit" />Ocorrências de monitoramento</span></div>
              <div class="lista">
                @for (o of f.ocorrencias; track o.id) {
                  <div class="item"><div class="texto"><strong>{{ tiposOc[o.tipo] ?? o.tipo }}</strong><span class="pequeno">{{ o.descricao }}</span>
                    <span class="suave pequeno">{{ o.registradaEm | date: 'dd/MM/yyyy HH:mm' }} · {{ o.registradaPor }}</span></div>
                    @if (o.resultado) { <bf-status [valor]="o.resultado === 'Regular' ? 'CUMPRIDA' : 'ATRASO'" [rotulo]="o.resultado" /> }</div>
                } @empty { <div class="cartao-corpo suave">Nenhuma ocorrência registrada.</div> }
              </div></div>
          }
        }
      </div>
    } @else { <div class="pagina"><div class="cartao vazio"><nz-icon nzType="loading" />Carregando a ficha…</div></div> }
  `,
  styles: `
    .voltar { font-size: 13px; display: inline-flex; gap: 4px; align-items: center; margin-bottom: 6px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .texto { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 3px; }
    .pequeno { font-size: 12px; } .coluna { display: flex; flex-direction: column; gap: 8px; }
    .acao { font-size: 12px; color: #b45309; font-weight: 500; }
    .rodape { border-top: 1px solid var(--bf-borda); }
  `,
})
export class BeneficiarioPage {
  private readonly api = inject(ApiService);
  readonly id = input.required<string>();
  readonly f = signal<FichaBeneficiario | null>(null);
  readonly erro = signal(false);
  readonly aba = signal(0);
  readonly riscos = RISCOS;
  readonly sitCp = SIT_CONTRAPARTIDA;
  readonly sitPc = SIT_PRESTACAO;
  readonly naturezas = NATUREZAS;
  readonly per = PERIODICIDADES;
  readonly tiposOc = TIPOS_OCORRENCIA;
  readonly tipo = TIPO_SITUACAO;
  readonly moeda = fmtMoeda;
  readonly meta = fmtMeta;
  readonly contagem = computed(() => ({
    altos: this.f()?.criterios.filter((c) => c.nivel === 'ALTO').length ?? 0,
    medios: this.f()?.criterios.filter((c) => c.nivel === 'MEDIO').length ?? 0,
  }));
  readonly barras = computed(() => (this.f()?.renunciaMensal ?? []).map((m) => ({ rotulo: m.rotulo, valor: Math.round(m.renuncia) })));

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.erro.set(false);
      this.f.set(null);
      this.api.fichaBeneficiario(id).subscribe({ next: (f) => this.f.set(f), error: () => this.erro.set(true) });
    });
  }

  fmtPct(p: number) {
    return () => `${p}%`;
  }
}
