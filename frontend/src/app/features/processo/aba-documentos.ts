import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { MensagemService } from '../../core/mensagens';
import { Documento, ProcessoDetalhe } from '../../core/models';
import { StatusTagComponent, baixarBlob } from '../../shared/ui';

/** Documentos exigidos da espécie e conferência do Atendimento (aceitar, recusar com motivo, formalizar). */
@Component({
  selector: 'app-aba-documentos',
  imports: [FormsModule, DatePipe, CurrencyPipe, NzButtonModule, NzIconModule, NzAlertModule, NzCheckboxModule, NzInputModule, NzModalModule,
    NzTooltipModule, StatusTagComponent],
  template: `
    @let a = d().acoes;
    <div class="coluna">
      @if (d().resumo.status === 'RECEBIDO') {
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="audit" />Formalização no Atendimento</span></div>
          <div class="cartao-corpo coluna">
            <span>Confira o recolhimento da taxa e cada documento obrigatório. Recusar um documento devolve o processo ao contribuinte, com comunicação oficial e prazo para novo envio.</span>
            <label nz-checkbox [(ngModel)]="taxaConferida" [nzDisabled]="!a['FORMALIZAR']?.habilitada && !!a['FORMALIZAR']?.motivo?.includes('Atendimento')">
              Conferi o recolhimento da taxa de {{ d().taxaValor ? (d().taxaValor | currency: 'BRL') : 'R$ 0,00 (isenta)' }} — {{ d().taxaFaixa }}
            </label>
            <div class="barra-acoes">
              <button nz-button nzType="primary" [disabled]="!a['FORMALIZAR']?.habilitada || (d().taxaValor > 0 && !taxaConferida)" nz-tooltip
                [nzTooltipTitle]="a['FORMALIZAR']?.motivo ?? (d().taxaValor > 0 && !taxaConferida ? 'Confirme a conferência da taxa' : null)"
                [nzLoading]="ocupado()" (click)="formalizar()"><nz-icon nzType="check" />Formalizar e encaminhar à Fiscalização</button>
            </div>
          </div>
        </div>
      }
      @if (d().documentosPendentes.length) {
        <nz-alert nzType="warning" nzShowIcon nzMessage="Documentos obrigatórios pendentes" [nzDescription]="d().documentosPendentes.join(' · ')" />
      }
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Documentos exigidos</span>
          <span class="suave">{{ atendidos() }} de {{ obrigatorios() }} obrigatórios atendidos</span></div>
        <div class="lista">
          @for (i of d().documentosExigidos; track i.descricao + (i.atual?.id ?? 0)) {
            <div class="item">
              <nz-icon [nzType]="i.atual && i.atual.situacao !== 'RECUSADO' ? 'check-circle' : 'clock-circle'" [class.ok]="i.atual && i.atual.situacao !== 'RECUSADO'" class="ic" />
              <div class="texto">
                <div>{{ i.descricao }} @if (!i.obrigatorio) { <span class="suave">(opcional)</span> }</div>
                @if (i.atual; as doc) {
                  <div class="suave pequeno">{{ doc.nomeArquivo }} · {{ tamanho(doc.tamanho) }} · enviado em {{ doc.enviadoEm | date: 'dd/MM/yyyy HH:mm' }} pelo {{ doc.origem === 'PORTAL' ? 'portal' : 'Atendimento' }}</div>
                  @if (doc.motivoRecusa) { <div class="recusa">Recusado: {{ doc.motivoRecusa }}</div> }
                } @else { <div class="suave pequeno">Não enviado</div> }
              </div>
              @if (i.atual; as doc) {
                <bf-status [valor]="doc.situacao" [rotulo]="rotulos[doc.situacao]" />
                <button nz-button nzType="text" nz-tooltip nzTooltipTitle="Baixar arquivo" (click)="baixar(doc)"><nz-icon nzType="eye" /></button>
                @if (doc.situacao === 'ENVIADO' && a['ANALISAR_DOCUMENTOS']?.habilitada) {
                  <button nz-button nzSize="small" (click)="aceitar(doc)">Aceitar</button>
                  <button nz-button nzSize="small" nzDanger (click)="recusando.set(doc); motivo = ''">Recusar</button>
                }
              }
            </div>
          }
        </div>
      </div>
    </div>

    <nz-modal [nzVisible]="!!recusando()" nzTitle="Recusar documento" (nzOnCancel)="recusando.set(null)" [nzFooter]="rodape" nzWidth="34rem">
      <ng-container *nzModalContent>
        <div class="coluna">
          <span><strong>{{ recusando()?.descricao }}</strong></span>
          <span class="suave">O processo volta ao contribuinte, que recebe comunicação oficial com o motivo e o prazo para novo envio.</span>
          <div class="campo"><label class="obrigatorio">Motivo da recusa</label><textarea nz-input rows="3" [(ngModel)]="motivo" placeholder="Ex.: comprovante ilegível, documento vencido…"></textarea></div>
        </div>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="recusando.set(null)">Cancelar</button>
        <button nz-button nzType="primary" nzDanger [disabled]="!motivo.trim()" (click)="recusar()">Recusar e devolver ao contribuinte</button>
      </ng-template>
    </nz-modal>
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .ic { font-size: 18px; color: #b45309; } .ic.ok { color: #16a34a; }
    .texto { flex: 1; min-width: 220px; }
    .pequeno { font-size: 12px; }
    .recusa { font-size: 12px; color: #b91c1c; }
  `,
})
export class AbaDocumentosComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly recusando = signal<Documento | null>(null);
  readonly ocupado = signal(false);
  readonly rotulos: Record<string, string> = { ENVIADO: 'aguardando conferência', ACEITO: 'aceito', RECUSADO: 'recusado', SUBSTITUIDO: 'substituído' };
  taxaConferida = false;
  motivo = '';

  obrigatorios() {
    return this.d().documentosExigidos.filter((i) => i.obrigatorio).length;
  }
  atendidos() {
    return this.d().documentosExigidos.filter((i) => i.obrigatorio && i.atual && i.atual.situacao !== 'RECUSADO').length;
  }
  tamanho(b: number | null) {
    return b == null ? '—' : b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.round(b / 1024) + ' KB';
  }

  baixar(doc: Documento) {
    this.api.baixarArquivo(this.d().resumo.id, doc.id).subscribe((b) => baixarBlob(b, doc.nomeArquivo));
  }
  aceitar(doc: Documento) {
    this.api.aceitarDocumento(this.d().resumo.id, doc.id).subscribe((d) => this.atualizado.emit(d));
  }
  recusar() {
    const doc = this.recusando()!;
    this.api.recusarDocumento(this.d().resumo.id, doc.id, this.motivo.trim()).subscribe((d) => {
      this.recusando.set(null);
      this.msg.add({ severity: 'success', summary: 'Documento recusado', detail: 'O processo voltou ao contribuinte e a comunicação oficial foi enviada.' });
      this.atualizado.emit(d);
    });
  }
  formalizar() {
    this.ocupado.set(true);
    this.api.formalizar(this.d().resumo.id, this.taxaConferida).subscribe({
      next: (d) => {
        this.msg.add({ severity: 'success', summary: 'Processo formalizado', detail: 'Encaminhado à Fiscalização. O protocolo no sistema corporativo segue pela fila de integração.' });
        this.atualizado.emit(d);
      },
      error: () => this.ocupado.set(false),
      complete: () => this.ocupado.set(false),
    });
  }
}
