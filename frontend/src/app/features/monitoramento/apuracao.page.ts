import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { ApuracaoBeneficio, ConcessaoApuracao } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { fmtMoeda } from './comum';

const SITUACAO_LINHA: Record<string, string> = { CONFORME: 'Conforme', TOLERAVEL: 'Diferença tolerável', DIVERGENTE: 'Divergência relevante' };

/** Apuração do benefício usufruído: confronto entre o cálculo do sistema e a apuração declarada na EFD. */
@Component({
  selector: 'app-apuracao',
  imports: [FormsModule, DatePipe, RouterLink, NzSelectModule, NzRadioModule, NzTableModule, NzButtonModule, NzIconModule, NzAlertModule, NzTooltipModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Apuração do benefício usufruído</h1>
        <div class="subtitulo">Confronto entre o cálculo do sistema e a apuração declarada pelo contribuinte na Escrituração Fiscal Digital.</div></div></div>
      <div class="cartao"><div class="cartao-corpo filtros">
        <div class="campo"><label>Benefício concedido</label>
          <nz-select [ngModel]="processoId()" (ngModelChange)="escolher($event)" class="sel-conc">
            @for (c of concessoes(); track c.processoId) { <nz-option [nzValue]="c.processoId" [nzLabel]="c.razaoSocial + ' · ' + c.beneficio + ' · ' + c.numeroProcesso" /> }
          </nz-select></div>
        @if (atual(); as c) {
          <div class="campo"><label>Período de apuração</label>
            <nz-radio-group [ngModel]="periodo()" (ngModelChange)="trocarPeriodo($event)" nzButtonStyle="solid">
              @for (p of c.periodos; track p.periodo) { <label nz-radio-button [nzValue]="p.periodo">{{ p.rotulo }}</label> }
            </nz-radio-group></div>
        }
      </div></div>
      <nz-alert nzType="warning" nzShowIcon nzMessage="Dependência da Escrituração Fiscal Digital"
        nzDescription="Em imposto não cumulativo é o contribuinte quem determina quais documentos compõem o crédito do período. O sistema parte do declarado e expurga os documentos com inconsistência: valida o declarado, não o substitui." />
      @if (a(); as a) {
        @if (a.situacao) {
          <nz-alert [nzType]="a.situacao === 'APROVADA' ? 'success' : 'info'" nzShowIcon
            [nzMessage]="a.situacao === 'APROVADA' ? 'Apuração aprovada' : 'Encaminhada para verificação fiscal'"
            [nzDescription]="'Registrada em ' + (a.registradaEm | date: 'dd/MM/yyyy HH:mm') + ' por ' + a.registradaPor + '.'" />
        }
        <div class="grade grade-2">
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="calculator" />Apuração calculada pelo sistema</span><span class="suave">{{ a.periodoRotulo }}</span></div>
            <nz-table [nzData]="[1]" [nzShowPagination]="false" nzSize="small">
              <thead><tr><th>Linha</th><th class="dir">Sem o benefício</th><th class="dir">Com o benefício</th></tr></thead>
              <tbody>
                <tr><td>Débito das saídas</td><td class="dir num">{{ m(a.debito) }}</td><td class="dir num">{{ m(a.debito) }}</td></tr>
                <tr><td>Crédito das entradas</td><td class="dir num">{{ m(a.creditoCalculado) }}</td><td class="dir num">{{ m(a.creditoCalculado) }}</td></tr>
                <tr><td>Ajustes decorrentes do benefício</td><td class="dir num">{{ m(0) }}</td><td class="dir num">− {{ m(a.ajusteCalculado) }}</td></tr>
                <tr class="forte"><td>Imposto apurado</td><td class="dir num">{{ m(a.impostoSemBeneficio) }}</td><td class="dir num">{{ m(a.impostoComBeneficio) }}</td></tr>
              </tbody>
            </nz-table>
            <div class="cartao-corpo renuncia">Renúncia no período: <strong>{{ m(a.renunciaPeriodo) }}</strong> — a diferença entre as duas colunas.</div>
          </div>
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="audit" />Confronto linha a linha</span>
              <bf-status [valor]="a.divergente ? 'DIVERGENTE' : 'CONFORME'" [rotulo]="a.divergente ? 'Divergência relevante' : 'Sem divergência relevante'" /></div>
            <nz-table [nzData]="a.confronto" [nzShowPagination]="false" nzSize="small">
              <thead><tr><th>Linha</th><th class="dir">Calculado</th><th class="dir">Declarado</th><th class="dir">Diferença</th><th>Situação</th></tr></thead>
              <tbody>
                @for (l of a.confronto; track l.linha) {
                  <tr><td>{{ l.linha }}</td><td class="dir num suave">{{ m(l.calculado) }}</td><td class="dir num suave">{{ m(l.declarado) }}</td>
                    <td class="dir num forte nowrap" [class.ruim]="l.situacao === 'DIVERGENTE'">{{ l.diferenca >= 0 ? '+' : '−' }} {{ m(abs(l.diferenca)) }} <span class="suave pequeno">({{ l.percentual }}%)</span></td>
                    <td><bf-status [valor]="l.situacao" [rotulo]="sitLinha[l.situacao]" /></td></tr>
                }
              </tbody>
            </nz-table>
          </div>
        </div>
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="warning" />Inconsistências identificadas</span>
            <span class="suave">{{ a.inconsistencias.length ? a.inconsistencias.length + ' documento(s) fiscal(is) no período' : 'cruzamento com a NF-e sem irregularidades' }}</span></div>
          <div class="lista">
            @for (i of a.inconsistencias; track i.documento) {
              <div class="item"><div class="texto"><strong>{{ i.tipo }}</strong><span class="suave pequeno">{{ i.descricao }}</span></div>
                <span class="mono ruim">{{ i.documento }} · {{ m(i.valor) }}</span>
                @if (i.ocorrenciaRegistrada) { <bf-status valor="CONCLUIDA" rotulo="ocorrência registrada" /> }
                @else { <button nz-button nzSize="small" [disabled]="!analisa" (click)="ocorrencia(i.documento)"><nz-icon nzType="file-add" />Registrar ocorrência</button> }
              </div>
            } @empty { <div class="vazio">Nenhuma inconsistência: as verificações de documento cancelado, destinatário divergente e natureza de operação não apontaram irregularidade.</div> }
          </div>
        </div>
        @if (!a.situacao) {
          <div class="barra-acoes">
            <a [routerLink]="['/beneficiarios', a.interessadoId]">Ficha do beneficiário</a>
            <span class="espaco"></span>
            <button nz-button [disabled]="!analisa" nz-tooltip [nzTooltipTitle]="analisa ? null : 'A análise da apuração é feita pelo monitoramento'" (click)="verificacao()">
              <nz-icon nzType="audit" />Encaminhar para verificação fiscal</button>
            <button nz-button nzType="primary" [disabled]="!analisa || a.divergente" nz-tooltip
              [nzTooltipTitle]="!analisa ? 'A análise da apuração é feita pelo monitoramento' : a.divergente ? 'Com divergência relevante, encaminhe para verificação fiscal' : null" (click)="aprovar()">
              <nz-icon nzType="check" />Aprovar a apuração do período</button>
          </div>
        }
      } @else if (concessoes().length === 0 && carregado()) {
        <div class="cartao vazio">Nenhum benefício em fruição com mês completo para apurar.</div>
      }
    </div>
  `,
  styles: `
    .filtros { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .sel-conc { min-width: 420px; max-width: 100%; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .texto { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 3px; }
    .forte { font-weight: 600; } .pequeno { font-size: 12px; } .dir { text-align: right; } .nowrap { white-space: nowrap; } .ruim { color: #b91c1c; }
    .renuncia { border-top: 1px solid var(--bf-borda); }
  `,
})
export class ApuracaoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly analisa = inject(AuthService).pode('APURACAO_ANALISAR');
  readonly concessoes = signal<ConcessaoApuracao[]>([]);
  readonly carregado = signal(false);
  readonly processoId = signal<number | null>(null);
  readonly periodo = signal<string | null>(null);
  readonly a = signal<ApuracaoBeneficio | null>(null);
  readonly atual = computed(() => this.concessoes().find((c) => c.processoId === this.processoId()) ?? null);
  readonly sitLinha = SITUACAO_LINHA;
  readonly m = fmtMoeda;
  readonly abs = Math.abs;

  ngOnInit() {
    this.api.concessoesApuracao().subscribe((l) => {
      this.concessoes.set(l);
      this.carregado.set(true);
      if (l.length) this.escolher(l[0].processoId);
    });
  }
  escolher(id: number) {
    this.processoId.set(id);
    this.trocarPeriodo(this.atual()?.periodos[0]?.periodo ?? null);
  }
  trocarPeriodo(p: string | null) {
    this.periodo.set(p);
    this.a.set(null);
    this.api.apuracao(this.processoId()!, p ?? undefined).subscribe((a) => this.a.set(a));
  }
  private executar(obs: Observable<ApuracaoBeneficio>, titulo: string, detalhe: string) {
    obs.subscribe((a) => { this.a.set(a); this.msg.add({ severity: 'success', summary: titulo, detail: detalhe }); });
  }
  ocorrencia(doc: string) {
    const a = this.a()!;
    this.executar(this.api.ocorrenciaApuracao(a.processoId, a.periodo, doc), 'Ocorrência registrada', `${doc} · consta na ficha do beneficiário e no processo.`);
  }
  verificacao() {
    const a = this.a()!;
    this.confirmacao.confirm({
      header: 'Encaminhar para verificação fiscal',
      message: `A apuração de ${a.periodoRotulo} será registrada como em verificação e a Fiscalização será notificada, com as inconsistências anexadas.`,
      acceptLabel: 'Encaminhar',
      accept: () => this.executar(this.api.verificacaoApuracao(a.processoId, a.periodo), 'Encaminhado à Fiscalização', 'Ocorrência de verificação fiscal registrada.'),
    });
  }
  aprovar() {
    const a = this.a()!;
    this.executar(this.api.aprovarApuracao(a.processoId, a.periodo), 'Apuração aprovada', `${a.razaoSocial} · ${a.periodoRotulo} · renúncia de ${fmtMoeda(a.renunciaPeriodo)} consolidada.`);
  }
}
