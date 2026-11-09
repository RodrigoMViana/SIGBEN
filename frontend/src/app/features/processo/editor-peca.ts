import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { EditorPeca, TagPeca } from '../../core/models';

/**
 * Editor de peça a partir de texto padrão com tags. As tags resolvidas vêm do processo; as de escolha
 * e de preenchimento são informadas aqui. Cada valor aplicado é gravado na hora (nova versão da peça).
 */
@Component({
  selector: 'app-editor-peca',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule, NzTooltipModule],
  template: `
    @if (e(); as e) {
      <div class="cartao">
        <div class="cartao-titulo">
          <span><nz-icon nzType="form" />{{ titulo() }} nº {{ e.numero }}</span>
          <span class="suave">{{ e.situacao === 'ASSINADA' ? 'assinado em ' + (e.assinadaEm | date: 'dd/MM/yyyy HH:mm') + ' · ' + e.autorNome + ' · modo leitura' : 'texto padrão ' + e.textoPadraoNome + ' · versão ' + e.versaoTexto }}</span>
        </div>
        @if (e.situacao === 'RASCUNHO') {
          <div class="cartao-corpo barra">
            @if (e.modelos.length > 1) {
              <nz-select [ngModel]="e.textoPadraoId" (ngModelChange)="trocarModelo($event)" [nzDisabled]="!editavel()" class="modelo">
                @for (m of e.modelos; track m.id) { <nz-option [nzValue]="m.id" [nzLabel]="m.nome + ' · v' + m.versao" /> }
              </nz-select>
            }
            <span class="espaco"></span>
            @if (e.pendentes) { <nz-tag nzColor="error">{{ e.pendentes }} tag(s) pendente(s)</nz-tag> } @else { <nz-tag nzColor="success">Nenhuma tag pendente</nz-tag> }
            <span class="legenda"><span class="t resolvida">resolvida</span><span class="t unica">informada</span><span class="t pendente">pendente</span></span>
          </div>
        }
        <div class="cartao-corpo documento">
          @for (p of e.paragrafos; track $index) {
            <!-- segmentos em uma única linha: quebras de linha no template viram espaços antes da pontuação -->
            <p>@for (s of p.segmentos; track $index) {@if (s.tag) {<span class="t" [class.resolvida]="mapa()[s.tag]?.natureza === 'RESOLVIDA'" [class.unica]="mapa()[s.tag] && mapa()[s.tag].natureza !== 'RESOLVIDA' && !mapa()[s.tag].pendente" [class.pendente]="!mapa()[s.tag] || mapa()[s.tag].pendente" [class.ativa]="selecionada()?.chave === s.tag" [class.clicavel]="mapa()[s.tag]?.editavel && editavel()" nz-tooltip [nzTooltipTitle]="(mapa()[s.tag]?.descricao ?? s.tag) + ' · ' + (mapa()[s.tag]?.origem ?? '')" (click)="selecionar(mapa()[s.tag])">{{ s.texto ?? '[' + (mapa()[s.tag]?.descricao ?? s.tag) + ']' }}</span>} @else {<ng-container>{{ s.texto }}</ng-container>}}</p>
          }
        </div>
        @if (e.situacao === 'RASCUNHO') {
          @if (selecionada(); as t) {
            <div class="cartao-corpo edicao">
              <div class="campo"><label>{{ t.descricao }} <span class="suave">· {{ t.origem }}</span></label>
                @if (t.opcoes.length) {
                  <nz-select [(ngModel)]="valor" nzPlaceHolder="Escolha uma opção" [nzDisabled]="!editavel()">
                    @for (o of t.opcoes; track o) { <nz-option [nzValue]="o" [nzLabel]="o" /> }
                  </nz-select>
                } @else {
                  <textarea nz-input rows="3" [(ngModel)]="valor" [disabled]="!editavel()"></textarea>
                }
              </div>
              <div class="barra-acoes">
                <button nz-button (click)="selecionada.set(null)">Fechar</button>
                <button nz-button nzType="primary" [disabled]="!editavel() || !valor.trim()" [nzLoading]="salvando()" (click)="aplicar(t)">Aplicar no texto</button>
              </div>
            </div>
          } @else if (editavel()) {
            <div class="cartao-corpo pendentes">
              @for (t of e.tags; track t.chave) {
                @if (t.editavel) {
                  <button nz-button nzSize="small" [nzDanger]="t.pendente" (click)="selecionar(t)"><nz-icon [nzType]="t.pendente ? 'edit' : 'check'" />{{ t.descricao }}</button>
                }
              }
            </div>
          }
        }
      </div>
    }
  `,
  styles: `
    .barra { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--bf-borda); }
    .modelo { min-width: 280px; } .espaco { flex: 1; }
    .legenda { display: inline-flex; gap: 6px; font-size: 12px; }
    .documento p { font-size: 14px; line-height: 1.9; text-align: justify; margin: 0 0 12px; }
    .t { border-radius: 3px; padding: 0 3px; }
    .t.resolvida { font-weight: 600; border-bottom: 2px solid #cbd5e1; padding: 0; }
    .t.unica { background: rgba(28,142,148,.12); border: 1px solid rgba(28,142,148,.45); color: #12666b; font-weight: 600; }
    .t.pendente { border: 1px dashed #dc2626; color: #64748b; background: rgba(220,38,38,.04); }
    .t.clicavel { cursor: pointer; } .t.ativa { outline: 2px solid var(--bf-primaria); }
    .edicao { border-top: 1px solid var(--bf-borda); display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }
    .pendentes { border-top: 1px solid var(--bf-borda); display: flex; flex-wrap: wrap; gap: 6px; }
  `,
})
export class EditorPecaComponent {
  private readonly api = inject(ApiService);
  readonly processoId = input.required<number>();
  readonly tipo = input.required<'parecer' | 'ato'>();
  readonly editavel = input(false);
  /** Muda quando o processo é atualizado (ex.: contrapartida incluída) para recarregar as tags resolvidas. */
  readonly versao = input<unknown>(null);
  readonly carregado = output<EditorPeca>();
  readonly e = signal<EditorPeca | null>(null);
  readonly selecionada = signal<TagPeca | null>(null);
  readonly salvando = signal(false);
  readonly mapa = computed(() => Object.fromEntries((this.e()?.tags ?? []).map((t) => [t.chave, t])) as Record<string, TagPeca>);
  readonly titulo = computed(() => (this.tipo() === 'ato' ? 'Ato Declaratório' : 'Parecer técnico'));
  valor = '';

  constructor() {
    effect(() => {
      this.versao();
      this.api.peca(this.processoId(), this.tipo()).subscribe((e) => this.definir(e));
    });
  }

  private definir(e: EditorPeca) {
    this.e.set(e);
    this.carregado.emit(e);
    const sel = this.selecionada();
    if (sel) this.selecionada.set(null);
  }

  selecionar(t: TagPeca | undefined) {
    if (!t || !t.editavel || !this.editavel()) return;
    this.valor = t.valor ?? '';
    this.selecionada.set(t);
  }

  aplicar(t: TagPeca) {
    this.salvando.set(true);
    this.api.salvarPeca(this.processoId(), this.tipo(), null, { [t.chave]: this.valor }).subscribe({
      next: (e) => this.definir(e),
      error: () => this.salvando.set(false),
      complete: () => this.salvando.set(false),
    });
  }

  trocarModelo(id: number) {
    this.api.salvarPeca(this.processoId(), this.tipo(), id, {}).subscribe((e) => this.definir(e));
  }
}
