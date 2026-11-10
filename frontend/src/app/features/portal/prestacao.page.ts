import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { ApiService } from '../../core/api.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { PrestacaoPortal } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { NATUREZAS, PERIODICIDADES, SIT_PRESTACAO, fmtMeta } from '../monitoramento/comum';

/** Prestação de contas das contrapartidas pelo contribuinte (devida ainda que não tenha havido fruição). */
@Component({
  selector: 'app-prestacao',
  imports: [FormsModule, DatePipe, RouterLink, NzAlertModule, NzButtonModule, NzCheckboxModule, NzIconModule, NzInputNumberModule, NzRadioModule, StatusTagComponent],
  template: `
    @if (p(); as p) {
      <div class="pagina">
        <div class="pagina-cabecalho"><div>
          <a [routerLink]="['/portal/processos', p.processoId]" class="voltar"><nz-icon nzType="arrow-left" /> Processo {{ p.numeroProcesso }}</a>
          <h1>Prestação de contas{{ p.pendente ? ' — ' + p.pendente.rotulo : '' }}</h1>
          <div class="subtitulo">{{ p.beneficio }}{{ p.pendente ? ' · prazo até ' + (p.pendente.prazo + 'T12:00:00' | date: 'dd/MM/yyyy') : '' }}
            {{ p.pendente?.atrasoDias ? ' · em atraso há ' + p.pendente?.atrasoDias + ' dias' : '' }}</div></div></div>

        @if (!p.exige) {
          <nz-alert nzType="info" nzShowIcon nzMessage="Não há prestação de contas devida" [nzDescription]="p.motivo ?? ''" />
        } @else if (!p.pendente) {
          <nz-alert nzType="success" nzShowIcon nzMessage="Nada aguarda você agora"
            [nzDescription]="p.proximo ? 'O próximo período (' + p.proximo.rotulo + ') pode ser prestado até ' + (p.proximo.prazo + 'T12:00:00' | date: 'dd/MM/yyyy') + ', depois do seu encerramento.' : 'Todas as prestações devidas foram enviadas.'" />
        } @else {
          <nz-alert [nzType]="p.pendente.atrasoDias ? 'error' : 'warning'" nzShowIcon nzMessage="A prestação é devida mesmo sem utilização do benefício"
            nzDescription="Sem fruição no período, declare a ausência de utilização e informe zero nas contrapartidas, se for o caso. A falta de prestação de contas pode fundamentar a suspensão do benefício." />
          <div class="cartao"><div class="cartao-titulo"><span>Houve utilização do benefício neste período?</span></div>
            <div class="cartao-corpo"><nz-radio-group [(ngModel)]="fruicao">
              <label nz-radio [nzValue]="true">Houve utilização</label><label nz-radio [nzValue]="false">Não houve utilização</label></nz-radio-group></div></div>
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="check-square" />Contrapartidas pactuadas</span><span class="suave">informe o realizado no período; a meta aparece para referência</span></div>
            <div class="lista">
              @for (c of p.contrapartidas; track c.id) {
                <div class="item"><div class="texto"><strong>{{ naturezas[c.natureza] ?? c.natureza }}</strong>
                  <span class="suave pequeno">Meta {{ meta(c.meta, c.unidade) }} · acumulado {{ meta(c.realizado, c.unidade) }} · comprovação {{ per[c.periodicidade] }}</span></div>
                  <div class="campo"><label>Realizado no período {{ c.unidade === 'MOEDA' ? '(R$)' : c.unidade === 'POSTOS' ? '(postos)' : '(1 = mantida)' }}</label>
                    <nz-input-number [(ngModel)]="valores[c.id]" [nzMin]="0" [nzPrecision]="c.unidade === 'MOEDA' ? 2 : 0" class="valor" /></div></div>
              }
            </div>
          </div>
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Documentos comprobatórios</span><span class="suave">PDF, PNG ou JPEG · até 20 MB</span></div>
            <div class="lista">
              @for (d of p.documentosExigidos; track d.chave) {
                <div class="item"><div class="texto">{{ d.descricao }}<span class="suave pequeno">{{ arquivos[d.chave]?.name ?? (d.obrigatorio ? 'obrigatório' : 'opcional') }}</span></div>
                  <bf-status [valor]="arquivos[d.chave] ? 'ACEITO' : d.obrigatorio ? 'ALERTA' : 'PENDENTE'" [rotulo]="arquivos[d.chave] ? 'anexado' : d.obrigatorio ? 'obrigatório' : 'opcional'" />
                  <label class="ant-btn ant-btn-default ant-btn-sm anexar"><nz-icon nzType="file-add" />{{ arquivos[d.chave] ? 'Trocar' : 'Anexar' }}
                    <input type="file" accept="application/pdf,image/png,image/jpeg" (change)="anexar(d.chave, $event)" hidden /></label></div>
              }
            </div>
          </div>
          <div class="cartao"><div class="cartao-corpo coluna">
            <label nz-checkbox [(ngModel)]="declaracao">Declaro, sob as penas da lei, que as informações prestadas são verdadeiras.</label>
            <div class="barra-acoes"><span class="espaco"></span>
              <button nz-button nzType="primary" [disabled]="!pronto(p)" [nzLoading]="ocupado()" (click)="enviar(p)"><nz-icon nzType="send" />Enviar prestação de contas</button></div>
          </div></div>
        }

        <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="history" />Prestações enviadas</span></div>
          <div class="lista">
            @for (h of p.historico; track h.id) {
              <div class="item"><div class="texto"><strong>{{ h.protocolo }} · {{ h.periodo }}</strong>
                <span class="suave pequeno">Enviada em {{ h.enviadaEm | date: 'dd/MM/yyyy HH:mm' }}{{ h.motivoRecusa ? ' · recusada: ' + h.motivoRecusa : '' }}</span></div>
                <bf-status [valor]="h.situacao" [rotulo]="sit[h.situacao]" /></div>
            } @empty { <div class="cartao-corpo suave">Nenhuma prestação de contas enviada.</div> }
          </div></div>
      </div>
    } @else { <div class="pagina"><div class="cartao vazio"><nz-icon nzType="loading" />Carregando…</div></div> }
  `,
  styles: `
    .voltar { font-size: 13px; display: inline-flex; gap: 4px; align-items: center; margin-bottom: 6px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .texto { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 3px; }
    .pequeno { font-size: 12px; } .valor { width: 200px; } .coluna { display: flex; flex-direction: column; gap: 12px; }
    .anexar { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  `,
})
export class PrestacaoPage {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly id = input.required<string>();
  readonly p = signal<PrestacaoPortal | null>(null);
  readonly ocupado = signal(false);
  readonly naturezas = NATUREZAS;
  readonly per = PERIODICIDADES;
  readonly sit = SIT_PRESTACAO;
  readonly meta = fmtMeta;
  fruicao = true;
  declaracao = false;
  valores: Record<number, number | null> = {};
  arquivos: Record<string, File | undefined> = {};

  constructor() {
    effect(() => this.api.prestacaoPortal(Number(this.id())).subscribe((p) => this.iniciar(p)));
  }
  private iniciar(p: PrestacaoPortal) {
    this.p.set(p);
    this.valores = Object.fromEntries(p.contrapartidas.map((c) => [c.id, null]));
    this.arquivos = {};
    this.declaracao = false;
    this.fruicao = true;
  }
  anexar(chave: string, ev: Event) {
    this.arquivos[chave] = (ev.target as HTMLInputElement).files?.[0];
    (ev.target as HTMLInputElement).value = '';
  }
  pronto(p: PrestacaoPortal) {
    return this.declaracao && p.contrapartidas.every((c) => this.valores[c.id] !== null && this.valores[c.id] !== undefined)
      && p.documentosExigidos.every((d) => !d.obrigatorio || !!this.arquivos[d.chave]);
  }
  enviar(p: PrestacaoPortal) {
    this.confirmacao.confirm({
      header: 'Enviar prestação de contas',
      message: `${p.pendente?.rotulo} — os valores e os documentos serão enviados à Secretaria para análise. Confirma?`,
      acceptLabel: 'Enviar',
      accept: () => {
        this.ocupado.set(true);
        const vals = Object.fromEntries(Object.entries(this.valores).map(([k, v]) => [k, v ?? 0])) as Record<number, number>;
        this.api.enviarPrestacao(p.processoId, this.fruicao, vals, this.declaracao, this.arquivos).subscribe({
          next: (r) => {
            const prot = r.historico[0]?.protocolo ?? '';
            this.iniciar(r);
            this.msg.add({ severity: 'success', summary: 'Prestação de contas enviada', detail: `Protocolo ${prot}. A Secretaria fará a análise.` });
          },
          error: () => this.ocupado.set(false),
          complete: () => this.ocupado.set(false),
        });
      },
    });
  }
}
