import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { EditorPeca, ProcessoDetalhe } from '../../core/models';
import { isoData } from '../../shared/ui';
import { EditorPecaComponent } from './editor-peca';

/** Ato Declaratório vinculado ao parecer: cláusulas (tags) e contrapartidas estruturadas. */
@Component({
  selector: 'app-aba-ato',
  imports: [FormsModule, NzButtonModule, NzIconModule, NzAlertModule, NzSelectModule, NzInputNumberModule, NzDatePickerModule, NzTooltipModule, EditorPecaComponent],
  template: `
    @let a = d().acoes;
    @let ato = d().pecas.find((p) => p.tipo === 'ATO_DECLARATORIO');
    <div class="coluna">
      <nz-alert nzType="info" nzShowIcon nzMessage="Ato vinculado ao parecer"
        [nzDescription]="'Gerado na assinatura do parecer ' + (parecer() ?? '') + ', herda os dados do parecer e do enquadramento. As cláusulas próprias do ato e as contrapartidas são preenchidas aqui.'" />
      <app-editor-peca [processoId]="d().resumo.id" tipo="ato" [editavel]="!!a['EDITAR_ATO']?.habilitada" [versao]="d()" (carregado)="editor.set($event)" />

      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="ordered-list" />Contrapartidas</span><span class="suave">cada uma é registro estruturado, não texto livre</span></div>
        <div class="lista">
          @for (c of d().contrapartidas; track c.id) {
            <div class="item"><nz-icon [nzType]="c.natureza === 'INVESTIMENTO' ? 'bank' : c.natureza === 'EMPREGO' ? 'team' : 'apartment'" class="ic" />
              <div class="texto"><div>{{ naturezas[c.natureza] }}</div><div class="suave pequeno">{{ c.descricao }}</div></div>
              @if (a['EDITAR_ATO']?.habilitada) { <button nz-button nzType="text" nzDanger (click)="excluir(c.id)"><nz-icon nzType="delete" /></button> }
            </div>
          } @empty { <div class="cartao-corpo suave">Nenhuma contrapartida registrada. Sem contrapartida estruturada não há o que monitorar depois da concessão; nesse caso, informe o texto da tag no ato.</div> }
        </div>
        @if (a['EDITAR_ATO']?.habilitada && ato?.situacao === 'RASCUNHO') {
          <div class="cartao-corpo nova">
            <nz-select [(ngModel)]="nova.natureza" (ngModelChange)="ajustarUnidade()" nzPlaceHolder="Natureza" class="sel">
              <nz-option nzValue="INVESTIMENTO" nzLabel="Investimento" /><nz-option nzValue="EMPREGO" nzLabel="Geração de emprego" /><nz-option nzValue="MANUTENCAO_ATIVIDADE" nzLabel="Manutenção de atividade" />
            </nz-select>
            <nz-input-number [(ngModel)]="nova.meta" [nzMin]="1" [nzPlaceHolder]="nova.unidade === 'MOEDA' ? 'Valor (R$)' : nova.unidade === 'POSTOS' ? 'Postos' : '1'" class="meta" />
            <nz-date-picker [(ngModel)]="nova.prazo" nzFormat="dd/MM/yyyy" nzPlaceHolder="Prazo" />
            <nz-select [(ngModel)]="nova.periodicidade" nzPlaceHolder="Comprovação" class="sel">
              <nz-option nzValue="SEMESTRAL" nzLabel="Semestral" /><nz-option nzValue="ANUAL" nzLabel="Anual" /><nz-option nzValue="UNICA" nzLabel="Única" />
            </nz-select>
            <button nz-button [disabled]="!nova.natureza || !nova.meta || !nova.prazo || !nova.periodicidade" (click)="incluir()"><nz-icon nzType="plus" />Incluir</button>
          </div>
        }
      </div>

      @if (a['CONCLUIR_ATO']; as x) {
        <div class="barra-acoes">
          <span class="suave">O ato só é concluído com o conteúdo mínimo e todas as cláusulas preenchidas. Segue, com o parecer, para homologação do Secretário.</span>
          <span class="espaco"></span>
          <button nz-button nzType="primary" [disabled]="!x.habilitada || (editor()?.pendentes ?? 1) > 0" nz-tooltip
            [nzTooltipTitle]="x.motivo ?? ((editor()?.pendentes ?? 0) > 0 ? 'Falta concluir ' + editor()?.pendentes + ' tag(s)' : null)" [nzLoading]="ocupado()" (click)="concluir()">
            <nz-icon nzType="send" />Concluir Ato Declaratório e encaminhar à homologação</button>
        </div>
      }
    </div>
  `,
  styles: `
    .coluna { display: flex; flex-direction: column; gap: 12px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--bf-borda); }
    .item:first-child { border-top: none; } .ic { font-size: 18px; color: var(--bf-primaria); }
    .texto { flex: 1; } .pequeno { font-size: 12px; } .espaco { flex: 1; }
    .nova { border-top: 1px solid var(--bf-borda); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; background: #f8fafc; }
    .sel { min-width: 180px; } .meta { width: 170px; }
  `,
})
export class AbaAtoComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly editor = signal<EditorPeca | null>(null);
  readonly ocupado = signal(false);
  readonly naturezas: Record<string, string> = { INVESTIMENTO: 'Investimento', EMPREGO: 'Geração de emprego', MANUTENCAO_ATIVIDADE: 'Manutenção de atividade' };
  nova: { natureza: string | null; meta: number | null; unidade: string; prazo: Date | null; periodicidade: string | null } = this.vazia();

  parecer() {
    return this.d().pecas.find((p) => p.tipo === 'PARECER')?.numero;
  }

  private vazia() {
    return { natureza: null, meta: null, unidade: 'MOEDA', prazo: null, periodicidade: null };
  }

  ajustarUnidade() {
    this.nova.unidade = this.nova.natureza === 'EMPREGO' ? 'POSTOS' : this.nova.natureza === 'MANUTENCAO_ATIVIDADE' ? 'ATIVIDADE' : 'MOEDA';
    if (this.nova.unidade === 'ATIVIDADE') this.nova.meta = 1;
  }

  incluir() {
    const n = this.nova;
    this.api.incluirContrapartida(this.d().resumo.id, { natureza: n.natureza!, meta: n.meta!, unidade: n.unidade, prazo: isoData(n.prazo)!, periodicidade: n.periodicidade! })
      .subscribe((d) => {
        this.nova = this.vazia();
        this.atualizado.emit(d);
      });
  }

  excluir(id: number) {
    this.api.excluirContrapartida(this.d().resumo.id, id).subscribe((d) => this.atualizado.emit(d));
  }

  concluir() {
    this.confirmacao.confirm({
      header: 'Concluir Ato Declaratório',
      message: 'O ato será concluído e encaminhado, com o parecer, à homologação do Secretário. Confirma?',
      acceptLabel: 'Concluir e encaminhar',
      accept: () => {
        this.ocupado.set(true);
        this.api.concluirAto(this.d().resumo.id).subscribe({
          next: (d) => {
            this.msg.add({ severity: 'success', summary: 'Ato Declaratório concluído', detail: 'Encaminhado ao Gabinete para homologação.' });
            this.atualizado.emit(d);
          },
          error: () => this.ocupado.set(false),
          complete: () => this.ocupado.set(false),
        });
      },
    });
  }
}
