import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { ConfigService } from '../../core/config.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { ProcessoDetalhe } from '../../core/models';
import { isoData } from '../../shared/ui';

/** Homologação pelo Secretário: cadeia de assinaturas do parecer e do ato vinculado. */
@Component({
  selector: 'app-aba-homologacao',
  imports: [DatePipe, NzButtonModule, NzIconModule, NzAlertModule, NzTooltipModule],
  template: `
    <div class="coluna">
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="safety-certificate" />Cadeia de assinaturas</span></div>
        <div class="lista">
          @for (c of cadeia(); track c.inst) {
            <div class="item"><nz-icon [nzType]="c.quando ? 'check-circle' : 'clock-circle'" [class.ok]="!!c.quando" class="ic" />
              <div class="texto"><div>{{ c.inst }}</div><div class="suave pequeno">{{ c.quem }}</div></div>
              <span class="suave pequeno">{{ c.quando ? (c.quando | date: 'dd/MM/yyyy HH:mm') : 'aguardando' }}</span>
            </div>
          }
        </div>
      </div>
      @if (!d().beneficio.geraAto) {
        <nz-alert nzType="info" nzShowIcon nzMessage="Tipo de Concessão Parecer Fiscal" nzDescription="A homologação conclui a concessão: não há Ato Declaratório a expedir nem publicação no Diário Oficial. O processo segue direto para a ciência do contribuinte." />
      }
      @if (d().acoes['HOMOLOGAR']; as x) {
        <div class="barra-acoes"><span class="espaco"></span>
          <button nz-button nzType="primary" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="homologar()">
            <nz-icon nzType="safety-certificate" />Homologar {{ d().beneficio.geraAto ? 'parecer e Ato Declaratório' : 'parecer' }}</button>
        </div>
      }
    </div>
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--bf-borda); }
    .item:first-child { border-top: none; } .ic { font-size: 18px; color: #94a3b8; } .ic.ok { color: #16a34a; }
    .texto { flex: 1; } .pequeno { font-size: 12px; } .espaco { flex: 1; }
  `,
})
export class AbaHomologacaoComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly cfg = inject(ConfigService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  readonly cadeia = computed(() => {
    const d = this.d();
    const par = d.pecas.find((p) => p.tipo === 'PARECER');
    const ato = d.pecas.find((p) => p.tipo === 'ATO_DECLARATORIO');
    const c = [{ inst: 'Parecer nº ' + (par?.numero ?? '—'), quem: (par?.autorNome ?? '—') + ' · auditor parecerista', quando: par?.situacao === 'ASSINADA' ? par.assinadaEm : null }];
    if (d.beneficio.geraAto) c.push({ inst: 'Ato Declaratório nº ' + (ato?.numero ?? '—'), quem: (ato?.autorNome ?? '—') + ' · conclusão do ato', quando: ato?.situacao === 'ASSINADA' ? ato.assinadaEm : null });
    c.push({ inst: 'Homologação', quem: d.homologadoPor ?? this.cfg.cliente?.autoridadeHomologadora ?? 'Secretário de Estado da Fazenda', quando: d.homologadoEm });
    return c;
  });

  homologar() {
    this.confirmacao.confirm({
      header: 'Homologar',
      message: this.d().beneficio.geraAto ? 'Homologar o parecer e o Ato Declaratório vinculado e encaminhar a matéria para publicação?' : 'Homologar o parecer? A concessão é concluída e o contribuinte é comunicado para dar ciência.',
      acceptLabel: 'Homologar',
      accept: () => {
        this.ocupado.set(true);
        this.api.homologar(this.d().resumo.id).subscribe({
          next: (d) => { this.msg.add({ severity: 'success', summary: 'Homologado' }); this.atualizado.emit(d); },
          error: () => this.ocupado.set(false),
          complete: () => this.ocupado.set(false),
        });
      },
    });
  }
}

/** Publicação do Ato Declaratório no Diário Oficial, executada pelo Gabinete em quatro fases. */
@Component({
  selector: 'app-aba-publicacao',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzAlertModule, NzTooltipModule, NzDatePickerModule, NzInputModule],
  template: `
    @let a = d().acoes;
    @let p = d().publicacao;
    <div class="coluna">
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="global" />Situação da publicação</span><span class="suave">executada pelo Gabinete</span></div>
        <div class="lista">
          @for (f of fases(); track f.rotulo; let i = $index) {
            <div class="item"><nz-icon [nzType]="f.quando ? 'check-circle' : 'clock-circle'" [class.ok]="!!f.quando" class="ic" />
              <div class="texto">{{ i + 1 }}. {{ f.rotulo }}</div>
              <span class="suave pequeno">{{ f.quando ? (f.quando | date: 'dd/MM/yyyy HH:mm') : 'pendente' }}</span>
              @if (f.acao && a[f.acao]; as x) {
                @if (f.acao !== 'PUBLICACAO_REGISTRO') {
                  <button nz-button nzSize="small" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="fase(f.fase!)">Registrar</button>
                }
              }
            </div>
          }
        </div>
      </div>
      @if (p.publicadoEm) {
        <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="file-done" />Dados da publicação</span></div>
          <div class="cartao-corpo dados">
            <div><div class="rotulo">Edição</div><div class="valor">{{ p.edicao }}</div></div>
            <div><div class="rotulo">Data</div><div class="valor">{{ p.publicadoEm + 'T12:00:00' | date: 'dd/MM/yyyy' }}</div></div>
            <div><div class="rotulo">Página</div><div class="valor">{{ p.pagina ?? '—' }}</div></div>
            <div><div class="rotulo">Caderno</div><div class="valor">{{ diario }}</div></div>
          </div></div>
      } @else if (a['PUBLICACAO_REGISTRO']; as x) {
        <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="form" />Registrar a publicação</span></div>
          <div class="cartao-corpo campo-linha">
            <div class="campo"><label class="obrigatorio">Data da publicação</label><nz-date-picker [(ngModel)]="data" nzFormat="dd/MM/yyyy" [nzDisabled]="!x.habilitada" /></div>
            <div class="campo"><label class="obrigatorio">Edição</label><input nz-input [(ngModel)]="edicao" placeholder="nº 8.000" [disabled]="!x.habilitada" /></div>
            <div class="campo"><label>Página</label><input nz-input [(ngModel)]="pagina" [disabled]="!x.habilitada" class="curto" /></div>
            <button nz-button nzType="primary" [disabled]="!x.habilitada || !data || !edicao.trim()" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="publicar()">
              <nz-icon nzType="check" />Registrar publicação</button>
          </div></div>
        <nz-alert nzType="info" nzShowIcon nzMessage="Efeitos da publicação" nzDescription="A vigência começa a contar na data da publicação; o contribuinte recebe a comunicação oficial pelo canal eletrônico e o ato fica disponível no portal." />
      }
    </div>
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--bf-borda); }
    .item:first-child { border-top: none; } .ic { font-size: 18px; color: #94a3b8; } .ic.ok { color: #16a34a; }
    .texto { flex: 1; } .pequeno { font-size: 12px; } .curto { width: 90px; }
  `,
})
export class AbaPublicacaoComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly cfg = inject(ConfigService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  readonly diario = this.cfg.cliente?.diarioOficial ?? 'Diário Oficial do Estado';
  data: Date | null = new Date();
  edicao = '';
  pagina = '';
  readonly fases = computed(() => {
    const p = this.d().publicacao;
    return [
      { rotulo: 'Encaminhado para publicação', quando: p.encaminhadoEm, acao: null, fase: null },
      { rotulo: 'Matéria recebida pelo Gabinete', quando: p.recebidoEm, acao: 'PUBLICACAO_RECEBIMENTO', fase: 'RECEBIMENTO' as const },
      { rotulo: 'Matéria aprovada', quando: p.aprovadoEm, acao: 'PUBLICACAO_APROVACAO', fase: 'APROVACAO' as const },
      { rotulo: 'Publicado no Diário Oficial', quando: p.publicadoEm ? p.publicadoEm + 'T12:00:00' : null, acao: 'PUBLICACAO_REGISTRO', fase: 'PUBLICACAO' as const },
    ];
  });

  fase(f: 'RECEBIMENTO' | 'APROVACAO' | 'PUBLICACAO') {
    this.api.publicacao(this.d().resumo.id, f).subscribe((d) => this.atualizado.emit(d));
  }

  publicar() {
    this.ocupado.set(true);
    this.api.publicacao(this.d().resumo.id, 'PUBLICACAO', { data: isoData(this.data)!, edicao: this.edicao.trim(), pagina: this.pagina.trim() || undefined }).subscribe({
      next: (d) => {
        this.msg.add({ severity: 'success', summary: 'Publicação registrada', detail: 'A vigência começou a contar e o contribuinte foi comunicado.' });
        this.atualizado.emit(d);
      },
      error: () => this.ocupado.set(false),
      complete: () => this.ocupado.set(false),
    });
  }
}
