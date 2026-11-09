import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { Documento, ItemDocumental, ProcessoPortal } from '../../core/models';
import { baixarBlob } from '../../shared/ui';
import { ESPECIES } from '../processos/processos.page';

/** Acompanhamento do processo pelo contribuinte: documentos, envio, etapas, ato publicado e ciência. */
@Component({
  selector: 'app-portal-processo',
  imports: [RouterLink, DatePipe, CurrencyPipe, NzButtonModule, NzIconModule, NzStepsModule, NzTagModule, NzAlertModule, NzTooltipModule],
  template: `
    @if (p(); as p) {
      <div class="pagina">
        <div class="pagina-cabecalho">
          <div><a routerLink="/portal" class="voltar"><nz-icon nzType="arrow-left" /> Voltar</a>
            <h1><span class="mono">{{ p.resumo.numero }}</span> · {{ p.beneficio.assunto }}</h1>
            <div class="subtitulo">{{ p.resumo.razaoSocial }} · {{ especies[p.resumo.especie] }} · taxa {{ p.taxaValor ? (p.taxaValor | currency: 'BRL') : 'isenta' }}</div></div>
          <nz-tag [nzColor]="p.resumo.familia === 'CONTRIBUINTE' ? 'warning' : p.resumo.familia === 'CONCLUIDO' ? 'success' : 'blue'">{{ p.resumo.statusPortal }}</nz-tag>
        </div>

        <div class="cartao"><div class="cartao-corpo">
          <nz-steps [nzCurrent]="atual(p)" nzSize="small" class="etapas">
            @for (e of p.etapas; track e.rotulo) { <nz-step [nzTitle]="e.rotulo" [nzDescription]="e.quando ? (e.quando | date: 'dd/MM/yyyy') ?? '' : ''" /> }
          </nz-steps>
        </div></div>

        @if (p.resumo.status === 'CIENCIA_PENDENTE') {
          <nz-alert nzType="info" nzShowIcon [nzMessage]="p.beneficio.geraAto ? 'Ato Declaratório publicado — registre a ciência' : 'Parecer homologado — registre a ciência'"
            nzDescription="É da ciência que correm os prazos. Sem registro, a ciência é considerada tácita após o prazo do canal eletrônico." [nzAction]="acaoCiencia" />
          <ng-template #acaoCiencia><button nz-button nzType="primary" [nzLoading]="ocupado()" (click)="ciencia()">Registrar ciência</button></ng-template>
        }

        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Documentos</span>
            @if (p.podeEditar) { <span class="suave">PDF, PNG ou JPEG · até 20 MB</span> }</div>
          <div class="lista">
            @for (i of p.documentos; track i.descricao + (i.atual?.id ?? 0)) {
              <div class="item">
                <nz-icon [nzType]="ok(i) ? 'check-circle' : 'clock-circle'" [class.ok]="ok(i)" class="ic" />
                <div class="texto"><div>{{ i.descricao }} @if (!i.obrigatorio) { <span class="suave">(opcional)</span> }</div>
                  @if (i.atual; as d) {
                    <div class="suave pequeno">{{ d.nomeArquivo }} · {{ d.enviadoEm | date: 'dd/MM/yyyy HH:mm' }}</div>
                    @if (d.situacao === 'RECUSADO') { <div class="recusa">Recusado pelo Atendimento: {{ d.motivoRecusa }}</div> }
                  }
                </div>
                @if (i.atual; as d) {
                  <nz-tag [nzColor]="d.situacao === 'RECUSADO' ? 'error' : d.situacao === 'ACEITO' ? 'success' : 'blue'">{{ rotulos[d.situacao] }}</nz-tag>
                  <button nz-button nzType="text" (click)="baixar(d)" nz-tooltip nzTooltipTitle="Baixar"><nz-icon nzType="eye" /></button>
                  @if (p.podeEditar && d.situacao === 'ENVIADO') { <button nz-button nzType="text" nzDanger (click)="remover(d)" nz-tooltip nzTooltipTitle="Remover"><nz-icon nzType="delete" /></button> }
                }
                @if (p.podeEditar && (!i.atual || i.atual.situacao === 'RECUSADO')) {
                  <label class="ant-btn ant-btn-default ant-btn-sm anexar">
                    <nz-icon [nzType]="enviando() === i.documentoExigidoId ? 'loading' : 'file-add'" />{{ i.atual ? 'Enviar novo' : 'Anexar' }}
                    <input type="file" accept="application/pdf,image/png,image/jpeg" (change)="anexar(i, $event)" hidden />
                  </label>
                }
              </div>
            }
          </div>
          @if (p.podeEditar) {
            <div class="cartao-corpo rodape">
              @if (p.documentosPendentes.length) { <span class="suave">Faltam {{ p.documentosPendentes.length }} documento(s) obrigatório(s).</span> }
              <span class="espaco"></span>
              <button nz-button nzType="primary" [disabled]="p.documentosPendentes.length > 0" [nzLoading]="ocupado()" (click)="enviar()"><nz-icon nzType="send" />Enviar para formalização</button>
            </div>
          }
        </div>

        @if (p.atoTexto) {
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="safety-certificate" />Ato Declaratório nº {{ p.atoNumero }}</span>
              <span class="suave">publicado em {{ p.publicadoEm + 'T12:00:00' | date: 'dd/MM/yyyy' }} · edição {{ p.edicao }}</span></div>
            <div class="cartao-corpo"><pre class="ato">{{ p.atoTexto }}</pre></div>
          </div>
        }
        @if (p.vigenciaInicio) {
          <div class="cartao"><div class="cartao-corpo dados">
            <div><div class="rotulo">Vigência</div><div class="valor">{{ p.vigenciaInicio + 'T12:00:00' | date: 'dd/MM/yyyy' }} a {{ p.vigenciaFim ? (p.vigenciaFim + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</div></div>
            <div><div class="rotulo">Ciência</div><div class="valor">{{ p.cienciaEm ? (p.cienciaEm | date: 'dd/MM/yyyy HH:mm') : 'pendente' }}</div></div>
          </div></div>
        }

        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="message" />Comunicações deste processo</span></div>
          <div class="lista">
            @for (c of p.comunicacoes; track c.id) {
              <div class="item com"><div class="texto"><div><strong>{{ c.assunto }}</strong></div>
                <div class="suave pequeno">{{ c.enviadaEm | date: 'dd/MM/yyyy HH:mm' }}{{ c.prazo ? ' · prazo ' + (c.prazo + 'T12:00:00' | date: 'dd/MM/yyyy') : '' }}</div>
                <pre class="texto-com">{{ c.texto }}</pre></div></div>
            } @empty { <div class="vazio">Nenhuma comunicação.</div> }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .voltar { font-size: 13px; display: inline-flex; gap: 4px; align-items: center; margin-bottom: 6px; }
    .etapas { overflow-x: auto; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; } .com { align-items: flex-start; }
    .ic { font-size: 18px; color: #b45309; } .ic.ok { color: #16a34a; }
    .texto { flex: 1; min-width: 220px; } .pequeno { font-size: 12px; } .espaco { flex: 1; }
    .recusa { font-size: 12px; color: #b91c1c; }
    .anexar { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
    .rodape { border-top: 1px solid var(--bf-borda); display: flex; align-items: center; gap: 10px; }
    .ato, .texto-com { white-space: pre-wrap; font-family: inherit; font-size: 13px; margin: 6px 0 0; background: #f8fafc; padding: 12px; border-radius: 4px; }
  `,
})
export class PortalProcessoPage {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly id = input.required<string>();
  readonly p = signal<ProcessoPortal | null>(null);
  readonly ocupado = signal(false);
  readonly enviando = signal<number | null>(null);
  readonly especies = ESPECIES;
  readonly rotulos: Record<string, string> = { ENVIADO: 'enviado', ACEITO: 'aceito', RECUSADO: 'recusado', SUBSTITUIDO: 'substituído' };

  constructor() {
    effect(() => this.api.processoPortal(Number(this.id())).subscribe((p) => this.p.set(p)));
  }

  atual(p: ProcessoPortal) {
    const i = p.etapas.findIndex((e) => e.atual);
    return i < 0 ? p.etapas.length : i;
  }

  ok(i: ItemDocumental) {
    return !!i.atual && i.atual.situacao !== 'RECUSADO';
  }

  anexar(i: ItemDocumental, ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    (ev.target as HTMLInputElement).value = '';
    if (!f) return;
    this.enviando.set(i.documentoExigidoId);
    this.api.anexarPortal(this.p()!.resumo.id, f, i.documentoExigidoId, i.documentoExigidoId ? null : i.descricao).subscribe({
      next: (p) => this.p.set(p),
      error: () => this.enviando.set(null),
      complete: () => this.enviando.set(null),
    });
  }

  remover(d: Documento) {
    this.api.removerDocumentoPortal(this.p()!.resumo.id, d.id).subscribe((p) => this.p.set(p));
  }

  baixar(d: Documento) {
    this.api.baixarArquivo(this.p()!.resumo.id, d.id, true).subscribe((b) => baixarBlob(b, d.nomeArquivo));
  }

  enviar() {
    this.confirmacao.confirm({
      header: 'Enviar para formalização',
      message: 'A solicitação e os documentos serão enviados ao Atendimento para conferência. Confirma?',
      acceptLabel: 'Enviar',
      accept: () => {
        this.ocupado.set(true);
        this.api.enviarSolicitacao(this.p()!.resumo.id).subscribe({
          next: (p) => { this.p.set(p); this.msg.add({ severity: 'success', summary: 'Solicitação enviada', detail: 'O Atendimento fará a conferência da taxa e dos documentos.' }); },
          error: () => this.ocupado.set(false),
          complete: () => this.ocupado.set(false),
        });
      },
    });
  }

  ciencia() {
    this.ocupado.set(true);
    this.api.cienciaPortal(this.p()!.resumo.id).subscribe({
      next: (p) => { this.p.set(p); this.msg.add({ severity: 'success', summary: 'Ciência registrada', detail: 'A partir de agora correm os prazos.' }); },
      error: () => this.ocupado.set(false),
      complete: () => this.ocupado.set(false),
    });
  }
}
