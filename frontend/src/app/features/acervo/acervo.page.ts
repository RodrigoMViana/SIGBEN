import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApiService } from '../../core/api.service';
import { MensagemService } from '../../core/mensagens';
import { AcervoLegado, Beneficio } from '../../core/models';
import { StatusTagComponent, fmtMoeda as fmtM, isoData, lerMoeda } from '../../shared/ui';
import { ESPECIES } from '../processos/processos.page';

const INGRESSOS = [
  { v: 'INFORMACAO_FISCAL', l: 'Aguardando Informação Fiscal', concedido: false },
  { v: 'ANALISE_JURIDICA', l: 'Em análise jurídica (Coordenação distribui)', concedido: false },
  { v: 'VIGENTE', l: 'Vigente — concedido por Ato Declaratório no sistema anterior', concedido: true },
  { v: 'CONCEDIDO_ARQUIVADO', l: 'Concedido e arquivado — Parecer Fiscal no sistema anterior', concedido: true },
];

/** Migração do acervo: processos do sistema anterior, sem benefício e espécie estruturados, entram no fluxo novo. */
@Component({
  selector: 'app-acervo',
  imports: [FormsModule, DatePipe, RouterLink, NzTableModule, NzButtonModule, NzIconModule, NzModalModule, NzSelectModule, NzInputModule,
    NzInputNumberModule, NzDatePickerModule, NzAlertModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Migração do acervo</h1>
        <div class="subtitulo">Processos abertos no sistema anterior, sem benefício e espécie estruturados. Disponível ao gestor da área.</div></div></div>
      <nz-alert nzType="info" nzShowIcon nzMessage="O número do processo é preservado"
        nzDescription="Na migração o gestor informa o benefício, a espécie e a situação de ingresso no fluxo novo. Os documentos permanecem no sistema anterior e o histórico registra a situação no legado e a justificativa." />
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="history" />Acervo do sistema anterior</span><span class="suave">{{ pendentes() }} aguardando migração</span></div>
        <nz-table #t [nzData]="itens()" [nzShowPagination]="false" nzSize="middle">
          <thead><tr><th>Processo</th><th>Interessado</th><th>Assunto no sistema anterior</th><th>Situação no legado</th><th>Abertura</th><th>Docs</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            @for (a of t.data; track a.id) {
              <tr>
                <td class="mono">{{ a.numero }}</td>
                <td>{{ a.razaoSocial }}<div class="suave pequeno">{{ a.cnpj }}</div></td>
                <td>{{ a.assunto }}@if (a.observacoes) { <div class="suave pequeno">{{ a.observacoes }}</div> }</td>
                <td>{{ a.situacaoLegado }}<div class="suave pequeno">{{ a.setorLegado }}</div></td>
                <td class="nowrap">{{ a.dataAbertura + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                <td class="num">{{ a.documentos }}</td>
                <td>@if (a.migradoEm) { <bf-status valor="CONCLUIDA" rotulo="migrado" /><div class="suave pequeno">{{ a.migradoEm | date: 'dd/MM/yyyy' }} · {{ a.migradoPor }}</div> }
                  @else { <bf-status valor="PENDENTE" rotulo="não migrado" /> }</td>
                <td class="dir">@if (a.processoId) { <a nz-button nzSize="small" [routerLink]="['/processos', a.processoId]">Abrir</a> }
                  @else { <button nz-button nzType="primary" nzSize="small" (click)="abrir(a)">Migrar</button> }</td>
              </tr>
            }
          </tbody>
        </nz-table>
      </div>
    </div>

    <nz-modal [nzVisible]="!!alvo()" [nzTitle]="'Migrar ' + (alvo()?.numero ?? '')" (nzOnCancel)="alvo.set(null)" [nzFooter]="rodape" nzWidth="40rem">
      <ng-container *nzModalContent>
        <div class="coluna">
          <span class="suave">{{ alvo()?.razaoSocial }} · {{ alvo()?.assunto }}</span>
          <div class="campo"><label class="obrigatorio">Benefício</label>
            <nz-select [(ngModel)]="beneficioId" nzShowSearch nzPlaceHolder="Benefício do catálogo">
              @for (b of beneficios(); track b.id) { <nz-option [nzValue]="b.id" [nzLabel]="b.codigo + ' · ' + b.assunto + ' (' + b.tipoConcessaoRotulo + ')'" /> }
            </nz-select></div>
          <div class="campo-linha">
            <div class="campo"><label class="obrigatorio">Espécie</label>
              <nz-select [(ngModel)]="especie" class="sel">@for (e of especies; track e.v) { <nz-option [nzValue]="e.v" [nzLabel]="e.l" /> }</nz-select></div>
            <div class="campo largo"><label class="obrigatorio">Situação de ingresso</label>
              <nz-select [(ngModel)]="situacao">@for (s of ingressos; track s.v) { <nz-option [nzValue]="s.v" [nzLabel]="s.l" /> }</nz-select></div>
          </div>
          <div class="campo-linha">
            @if (concedido()) {
              <div class="campo"><label class="obrigatorio">Início da vigência</label><nz-date-picker [(ngModel)]="vigencia" nzFormat="dd/MM/yyyy" /></div>
            }
            <div class="campo"><label>Renúncia anual estimada</label>
              <nz-input-number [(ngModel)]="valor" [nzMin]="0" [nzFormatter]="fmtM" [nzParser]="lerM" class="valor" /></div>
          </div>
          <div class="campo"><label class="obrigatorio">Justificativa</label><textarea nz-input rows="2" [(ngModel)]="justificativa"></textarea></div>
        </div>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="alvo.set(null)">Cancelar</button>
        <button nz-button nzType="primary" [disabled]="!beneficioId || !especie || !situacao || !justificativa.trim() || (concedido() && !vigencia)" (click)="migrar()">Migrar para o fluxo novo</button>
      </ng-template>
    </nz-modal>
  `,
  styles: `.pequeno { font-size: 12px; } .nowrap { white-space: nowrap; } .dir { text-align: right; }
    .coluna { display: flex; flex-direction: column; gap: 12px; } .sel { min-width: 160px; } .largo { flex: 1; min-width: 260px; } .valor { width: 220px; }`,
})
export class AcervoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly router = inject(Router);
  readonly itens = signal<AcervoLegado[]>([]);
  readonly beneficios = signal<Beneficio[]>([]);
  readonly alvo = signal<AcervoLegado | null>(null);
  readonly pendentes = computed(() => this.itens().filter((a) => !a.migradoEm).length);
  readonly ingressos = INGRESSOS;
  readonly especies = Object.entries(ESPECIES).map(([v, l]) => ({ v, l }));
  readonly fmtM = fmtM;
  readonly lerM = lerMoeda;
  readonly sit = signal<string | null>(null);
  readonly concedido = computed(() => INGRESSOS.find((i) => i.v === this.sit())?.concedido ?? false);
  beneficioId: number | null = null;
  especie = 'CONCESSAO';
  get situacao() {
    return this.sit();
  }
  set situacao(v: string | null) {
    this.sit.set(v);
  }
  vigencia: Date | null = null;
  valor: number | null = null;
  justificativa = '';

  ngOnInit() {
    this.api.acervo().subscribe((l) => this.itens.set(l));
    this.api.beneficios().subscribe((l) => this.beneficios.set(l.map((x) => x.beneficio).filter((b) => b.tipoConcessao === 'ATO_DECLARATORIO' || b.tipoConcessao === 'PARECER_FISCAL')));
  }
  abrir(a: AcervoLegado) {
    this.beneficioId = null;
    this.especie = 'CONCESSAO';
    this.situacao = null;
    this.vigencia = null;
    this.valor = null;
    this.justificativa = '';
    this.alvo.set(a);
  }
  migrar() {
    const a = this.alvo()!;
    this.api.migrarAcervo(a.id, { beneficioId: this.beneficioId!, especie: this.especie, situacao: this.situacao!, vigenciaInicio: this.concedido() ? isoData(this.vigencia) : null,
      valorPretendido: this.valor, justificativa: this.justificativa.trim() }).subscribe((r) => {
      this.itens.set(r.acervo);
      this.alvo.set(null);
      this.msg.add({ severity: 'success', summary: 'Processo migrado', detail: `${r.numero} entrou no fluxo novo.` });
      this.router.navigate(['/processos', r.processoId]);
    });
  }
}
