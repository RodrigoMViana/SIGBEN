import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { EditorPeca, ProcessoDetalhe } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { EditorPecaComponent } from './editor-peca';

/** Análise jurídica: elegibilidade e enquadramento, parecer com a Informação Fiscal como subsídio. */
@Component({
  selector: 'app-aba-parecer',
  imports: [DatePipe, FormsModule, NzModalModule, NzSelectModule, NzButtonModule, NzIconModule, NzAlertModule, NzTooltipModule, StatusTagComponent, EditorPecaComponent],
  template: `
    @let a = d().acoes;
    <div class="coluna">
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="check-square" />Elegibilidade e enquadramento</span>
          @if (d().elegibilidadeEm) { <span class="suave">relatório de {{ d().elegibilidadeEm | date: 'dd/MM/yyyy HH:mm' }}</span> }</div>
        @if (d().elegibilidade.length) {
          <div class="lista">
            @for (i of d().elegibilidade; track i.item) {
              <div class="item"><bf-status [valor]="i.resultado" [rotulo]="rotulos[i.resultado]" /><div class="texto"><div>{{ i.item }}</div><div class="suave pequeno">{{ i.detalhe }}</div></div></div>
            }
          </div>
        } @else {
          <div class="cartao-corpo suave">A verificação confere o benefício, o CNAE do interessado, a taxa, a regularidade fiscal (consulta ao sistema corporativo) e a conclusão da Informação Fiscal.</div>
        }
        <div class="cartao-corpo barra-acoes rodape">
          @if (!d().resumo.responsavelNome && a['DISTRIBUIR']) { <span class="suave">Processo ainda não distribuído{{ a['DISTRIBUIR'].habilitada ? ': ao verificar, você assume o processo.' : '.' }}</span> }
          <span class="espaco"></span>
          @if (a['ELEGIBILIDADE']; as x) {
            <button nz-button [nzType]="d().elegibilidade.length ? 'default' : 'primary'" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo"
              [nzLoading]="ocupado()" (click)="verificar()"><nz-icon nzType="play-circle" />{{ d().elegibilidade.length ? 'Verificar novamente' : 'Verificar elegibilidade' }}</button>
          }
        </div>
      </div>

      @if (temParecer()) {
        @if (!ifEmitida()) {
          <nz-alert nzType="warning" nzShowIcon nzMessage="Informação Fiscal pendente bloqueia a finalização" nzDescription="A análise jurídica se apoia na Informação Fiscal, fase obrigatória e anterior. Enquanto ela não for emitida, o parecer não pode ser assinado." />
        }
        <app-editor-peca [processoId]="d().resumo.id" tipo="parecer" [editavel]="!!a['EDITAR_PARECER']?.habilitada" [versao]="d()" (carregado)="editor.set($event)" />
        @if (desfavoravel() && a['ASSINAR_PARECER']) {
          <nz-alert nzType="error" nzShowIcon nzMessage="Parecer desfavorável"
            nzDescription="Ao assinar, informe o motivo estruturado do indeferimento. Homologado pelo Secretário, a solicitação é indeferida e o contribuinte é comunicado, com prazo recursal de 30 dias da ciência." />
        }
        @if (a['ASSINAR_PARECER']; as x) {
          <div class="barra-acoes">
            <span class="suave">Após a assinatura o parecer não pode ser alterado; correções exigem novo parecer.{{ d().beneficio.geraAto ? ' O Ato Declaratório é gerado vinculado ao parecer.' : ' O parecer segue para homologação do Secretário.' }}</span>
            <span class="espaco"></span>
            <button nz-button nzType="primary" [disabled]="!x.habilitada || (editor()?.pendentes ?? 1) > 0" nz-tooltip
              [nzTooltipTitle]="x.motivo ?? ((editor()?.pendentes ?? 0) > 0 ? 'Há ' + editor()?.pendentes + ' tag(s) pendente(s)' : null)"
              [nzLoading]="ocupado()" (click)="desfavoravel() ? abrirMotivo() : assinar()"><nz-icon nzType="edit" />Assinar parecer{{ desfavoravel() ? ' desfavorável' : '' }}</button>
          </div>
        }
      }
    </div>

    <nz-modal [nzVisible]="pedindoMotivo()" nzTitle="Motivo do indeferimento" (nzOnCancel)="pedindoMotivo.set(false)" [nzFooter]="rodape" nzWidth="34rem">
      <ng-container *nzModalContent>
        <div class="campo"><label class="obrigatorio">Motivo estruturado</label>
          <nz-select [(ngModel)]="motivo" nzPlaceHolder="Selecione">@for (m of motivos(); track m) { <nz-option [nzValue]="m" [nzLabel]="m" /> }</nz-select></div>
        <p class="suave pequeno">O motivo compõe a comunicação de indeferimento e os relatórios gerenciais. Após a assinatura o parecer não pode ser alterado.</p>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="pedindoMotivo.set(false)">Cancelar</button>
        <button nz-button nzType="primary" nzDanger [disabled]="!motivo" [nzLoading]="ocupado()" (click)="executarAssinatura(motivo)">Assinar parecer desfavorável</button>
      </ng-template>
    </nz-modal>
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 16px; border-top: 1px solid var(--bf-borda); }
    .item:first-child { border-top: none; } .item bf-status { min-width: 110px; }
    .texto { flex: 1; } .pequeno { font-size: 12px; } .espaco { flex: 1; }
    .rodape { border-top: 1px solid var(--bf-borda); }
  `,
})
export class AbaParecerComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly editor = signal<EditorPeca | null>(null);
  readonly ocupado = signal(false);
  readonly rotulos: Record<string, string> = { OK: 'atendido', ALERTA: 'alerta', FALHA: 'não atendido', NAO_VERIFICADO: 'não verificado' };
  readonly temParecer = computed(() => this.d().pecas.some((p) => p.tipo === 'PARECER'));
  readonly desfavoravel = computed(() => this.editor()?.textoPadraoTipo === 'PARECER_DESFAVORAVEL');
  readonly pedindoMotivo = signal(false);
  readonly motivos = signal<string[]>([]);
  motivo = '';
  readonly ifEmitida = computed(() => this.d().pecas.some((p) => p.tipo === 'INFORMACAO_FISCAL' && p.situacao === 'ASSINADA'));

  verificar() {
    this.ocupado.set(true);
    this.api.elegibilidade(this.d().resumo.id).subscribe({
      next: (d) => {
        this.msg.add({ severity: 'success', summary: 'Relatório de elegibilidade gerado', detail: 'Registro de auditoria com data, hora e responsável.' });
        this.atualizado.emit(d);
      },
      error: () => this.ocupado.set(false),
      complete: () => this.ocupado.set(false),
    });
  }

  abrirMotivo() {
    this.motivo = '';
    this.api.listas().subscribe((l) => this.motivos.set(l.motivosIndeferimento));
    this.pedindoMotivo.set(true);
  }

  assinar() {
    this.confirmacao.confirm({
      header: 'Assinar parecer',
      message: 'O parecer será assinado e não poderá mais ser alterado. Confirma?',
      acceptLabel: 'Assinar',
      accept: () => this.executarAssinatura(),
    });
  }

  executarAssinatura(motivo?: string) {
    this.ocupado.set(true);
    this.api.assinarParecer(this.d().resumo.id, motivo).subscribe({
      next: (d) => {
        this.pedindoMotivo.set(false);
        this.msg.add({ severity: 'success', summary: 'Parecer assinado', detail: motivo ? 'Encaminhado à homologação do Secretário; homologado, a solicitação é indeferida.'
          : d.beneficio.geraAto ? 'Ato Declaratório gerado vinculado ao parecer.' : 'Encaminhado à homologação do Secretário.' });
        this.atualizado.emit(d);
      },
      error: () => this.ocupado.set(false),
      complete: () => this.ocupado.set(false),
    });
  }
}
