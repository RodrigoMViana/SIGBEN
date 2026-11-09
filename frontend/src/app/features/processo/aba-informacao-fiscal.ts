import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { MensagemService } from '../../core/mensagens';
import { ProcessoDetalhe } from '../../core/models';

/** Informação Fiscal: análise de viabilidade operacional, fase obrigatória anterior à análise jurídica. */
@Component({
  selector: 'app-aba-informacao-fiscal',
  imports: [FormsModule, DatePipe, CurrencyPipe, NzButtonModule, NzIconModule, NzAlertModule, NzInputModule, NzRadioModule, NzTooltipModule],
  template: `
    @if (inf(); as i) {
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Informação Fiscal nº {{ i.numero }}</span><span class="suave">análise de viabilidade operacional</span></div>
        <div class="cartao-corpo dados">
          <div><div class="rotulo">Conclusão</div><div class="valor" [class]="'conclusao ' + i.conclusao">{{ i.conclusaoRotulo }}</div></div>
          <div><div class="rotulo">Responsável</div><div class="valor">{{ i.autorNome }}</div></div>
          <div><div class="rotulo">Emitida em</div><div class="valor">{{ i.assinadaEm | date: 'dd/MM/yyyy HH:mm' }}</div></div>
        </div>
        <div class="cartao-corpo texto"><div class="rotulo suave">Fundamentação técnica</div>{{ i.fundamentacao }}</div>
        @if (i.observacoes) { <div class="cartao-corpo texto"><div class="rotulo suave">Observações</div>{{ i.observacoes }}</div> }
      </div>
      <nz-alert nzType="info" nzShowIcon nzMessage="Subsídio ao parecer" [nzDescription]="'A IF nº ' + i.numero + ' é referenciada no parecer pela tag numeroInformacaoFiscal.'" />
    } @else {
      @let acao = d().acoes['EMITIR_IF'];
      <div class="coluna">
        <nz-alert nzType="warning" nzShowIcon nzMessage="Aguardando análise de viabilidade operacional"
          nzDescription="O processo aguarda a Informação Fiscal antes de seguir para a análise jurídica. Enquanto ela não for emitida, o parecer não pode ser finalizado." />
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="form" />Emissão da Informação Fiscal</span></div>
          <div class="cartao-corpo coluna">
            <div class="dados">
              <div><div class="rotulo">Interessado</div><div class="valor">{{ d().interessado.razaoSocial }}</div></div>
              <div><div class="rotulo">Atividade</div><div class="valor">{{ d().interessado.atividade }}</div></div>
              <div><div class="rotulo">Benefício</div><div class="valor">{{ d().beneficio.assunto }}</div></div>
              <div><div class="rotulo">Renúncia estimada</div><div class="valor">{{ d().resumo.valorPretendido | currency: 'BRL' }}</div></div>
            </div>
            <div class="campo"><label class="obrigatorio">Conclusão sobre a viabilidade</label>
              <nz-radio-group [(ngModel)]="conclusao" [nzDisabled]="!acao?.habilitada">
                <label nz-radio nzValue="VIAVEL">Viável</label>
                <label nz-radio nzValue="VIAVEL_RESSALVAS">Viável com ressalvas</label>
                <label nz-radio nzValue="INVIAVEL">Inviável</label>
              </nz-radio-group></div>
            <div class="campo"><label class="obrigatorio">Fundamentação técnica</label>
              <textarea nz-input rows="4" [(ngModel)]="fundamentacao" [disabled]="!acao?.habilitada" placeholder="Estrutura operacional, ação fiscal em curso, óbices à fruição…"></textarea></div>
            <div class="campo"><label>Observações</label>
              <textarea nz-input rows="2" [(ngModel)]="observacoes" [disabled]="!acao?.habilitada" placeholder="Ressalvas a condicionar no ato, se houver"></textarea></div>
            <div class="barra-acoes">
              <button nz-button nzType="primary" [disabled]="!acao?.habilitada || !conclusao || !fundamentacao.trim()" nz-tooltip [nzTooltipTitle]="acao?.motivo"
                [nzLoading]="ocupado()" (click)="emitir()"><nz-icon nzType="file-done" />Emitir Informação Fiscal</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .texto { border-top: 1px solid var(--bf-borda); white-space: pre-wrap; }
    .conclusao.VIAVEL { color: #15803d; } .conclusao.VIAVEL_RESSALVAS { color: #a16207; } .conclusao.INVIAVEL { color: #b91c1c; }
  `,
})
export class AbaInformacaoFiscalComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly inf = computed(() => this.d().pecas.find((p) => p.tipo === 'INFORMACAO_FISCAL' && p.situacao === 'ASSINADA') ?? null);
  readonly ocupado = signal(false);
  conclusao = '';
  fundamentacao = '';
  observacoes = '';

  emitir() {
    this.ocupado.set(true);
    this.api.emitirInformacaoFiscal(this.d().resumo.id, { conclusao: this.conclusao, fundamentacao: this.fundamentacao.trim(), observacoes: this.observacoes.trim() || undefined })
      .subscribe({
        next: (d) => {
          this.msg.add({ severity: 'success', summary: 'Informação Fiscal emitida', detail: 'O processo seguiu para a análise jurídica.' });
          this.atualizado.emit(d);
        },
        error: () => this.ocupado.set(false),
        complete: () => this.ocupado.set(false),
      });
  }
}
