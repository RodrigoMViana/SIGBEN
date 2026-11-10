import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { PainelPrestacao, PrestacaoContas } from '../../core/models';
import { StatusTagComponent, baixarBlob } from '../../shared/ui';
import { NATUREZAS, SIT_PRESTACAO, fmtMeta } from './comum';

/** Prestação de contas — recebimento: análise dos informes enviados e controle de quem não entregou. */
@Component({
  selector: 'app-prestacoes',
  imports: [FormsModule, DatePipe, RouterLink, NzTableModule, NzButtonModule, NzIconModule, NzAlertModule, NzModalModule, NzSelectModule, NzTooltipModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Prestação de contas — recebimento</h1>
        <div class="subtitulo">Análise dos informes enviados pelos beneficiários ativos e controle de quem não entregou.</div></div></div>
      <nz-alert nzType="info" nzShowIcon nzMessage="O informe é devido mesmo sem fruição"
        nzDescription="Sem utilização do benefício no período, a empresa declara ausência de fruição, mas a obrigação de prestar contas permanece. Benefício cassado deixa de gerar obrigação a partir da cassação." />
      @if (d(); as d) {
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Informes recebidos</span><span class="suave">{{ aguardando() }} aguardando análise</span></div>
          <div class="lista">
            @for (p of d.recebidas; track p.id) {
              <div class="item">
                <div class="texto">
                  <div><a [routerLink]="['/beneficiarios', p.interessadoId]" class="forte">{{ p.razaoSocial }}</a> <span class="suave">· {{ p.protocolo }} · processo {{ p.numeroProcesso }}</span></div>
                  <span class="pequeno">{{ p.periodo }} · prazo {{ p.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }} · enviado em {{ p.enviadaEm | date: 'dd/MM/yyyy HH:mm' }} · {{ p.houveFruicao ? 'houve fruição' : 'não houve fruição no período' }}</span>
                  <span class="pequeno">@for (i of p.itens; track i.contrapartidaId) { <span class="valor">{{ naturezas[i.natureza] ?? i.natureza }}: <strong>{{ meta(i.realizado, i.unidade) }}</strong></span> }</span>
                  @if (p.documentos.length) {
                    <span class="pequeno">@for (doc of p.documentos; track doc.id) { <a (click)="baixar(p, doc.id, doc.nomeArquivo)" class="doc"><nz-icon nzType="eye" />{{ doc.nomeArquivo }}</a> }</span>
                  }
                  @if (p.analisadaEm) { <span class="suave pequeno">Analisada em {{ p.analisadaEm | date: 'dd/MM/yyyy HH:mm' }} por {{ p.analisadaPor }}{{ p.motivoRecusa ? ' · ' + p.motivoRecusa : '' }}</span> }
                </div>
                <bf-status [valor]="p.situacao" [rotulo]="sit[p.situacao]" />
                @if (p.situacao === 'AGUARDANDO_ANALISE') {
                  <button nz-button nzType="primary" nzSize="small" [disabled]="!analisa" nz-tooltip [nzTooltipTitle]="analisa ? null : 'A análise é feita pelo monitoramento'" (click)="validar(p)">
                    <nz-icon nzType="check" />Validar</button>
                  <button nz-button nzDanger nzSize="small" [disabled]="!analisa" (click)="recusando.set(p); motivo = null">Recusar</button>
                }
              </div>
            } @empty { <div class="vazio">Nenhum informe recebido. Os informes enviados pelo portal aparecem aqui para análise.</div> }
          </div>
        </div>

        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="warning" />Controle de entrega — não apresentaram no período</span>
            <span class="suave">beneficiários em fruição com obrigação vencida</span></div>
          <nz-table #t [nzData]="d.semEntrega" [nzShowPagination]="false" nzSize="middle" [nzNoResult]="nada">
            <thead><tr><th>Beneficiário</th><th>Concessão</th><th>Período devido</th><th>Prazo</th><th class="dir">Atraso</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              @for (s of t.data; track s.processoId) {
                <tr>
                  <td><a [routerLink]="['/beneficiarios', s.interessadoId]" class="forte">{{ s.razaoSocial }}</a><div class="suave pequeno">{{ s.beneficio }} · {{ s.numeroProcesso }}</div></td>
                  <td class="nowrap">{{ s.concessao + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ s.periodo }}</td>
                  <td class="nowrap">{{ s.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                  <td class="dir num forte" [class.ruim]="s.critico">{{ s.atrasoDias }} dias</td>
                  <td><bf-status [valor]="s.critico ? 'ATRASO' : 'ATENCAO'" [rotulo]="s.critico ? 'Atraso crítico' : 'Não apresentado'" /></td>
                  <td class="dir">
                    @if (s.notificadaEm) { <span class="suave pequeno">notificado em {{ s.notificadaEm | date: 'dd/MM/yyyy' }}</span> }
                    @else { <button nz-button nzSize="small" [disabled]="!analisa" (click)="notificar(s.processoId)"><nz-icon nzType="send" />Notificar</button> }
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
          <ng-template #nada><div class="vazio">Todos os beneficiários entregaram no período.</div></ng-template>
        </div>

        @for (g of grupos(d); track g.titulo) {
          @if (g.itens.length) {
            <div class="cartao"><div class="cartao-titulo"><span>{{ g.titulo }}</span><span class="suave">{{ g.sub }}</span></div>
              <div class="lista">
                @for (x of g.itens; track x.processoId) {
                  <div class="item"><div class="texto"><a [routerLink]="['/beneficiarios', x.interessadoId]" class="forte">{{ x.razaoSocial }}</a><span class="suave pequeno">{{ x.detalhe }}</span></div>
                    <bf-status [valor]="g.valor" [rotulo]="g.rotulo" /></div>
                }
              </div></div>
          }
        }
      } @else { <div class="cartao vazio"><nz-icon nzType="loading" />Carregando…</div> }
    </div>

    <nz-modal [nzVisible]="!!recusando()" nzTitle="Recusar a prestação de contas" (nzOnCancel)="recusando.set(null)" [nzFooter]="rodape" nzWidth="34rem">
      <ng-container *nzModalContent>
        <div class="campo"><label class="obrigatorio">Motivo estruturado</label>
          <nz-select [(ngModel)]="motivo" nzPlaceHolder="Selecione">@for (m of d()?.motivosRecusa ?? []; track m) { <nz-option [nzValue]="m" [nzLabel]="m" /> }</nz-select></div>
        <p class="suave pequeno">A empresa é comunicada com o motivo e o prazo para enviar nova prestação; o período volta a constar como pendente.</p>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="recusando.set(null)">Cancelar</button>
        <button nz-button nzType="primary" nzDanger [disabled]="!motivo" (click)="recusar()">Recusar e comunicar</button>
      </ng-template>
    </nz-modal>
  `,
  styles: `
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .texto { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 3px; }
    .forte { font-weight: 600; } .pequeno { font-size: 12px; } .dir { text-align: right; } .nowrap { white-space: nowrap; } .ruim { color: #b91c1c; }
    .valor { margin-right: 14px; } .doc { margin-right: 12px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
  `,
})
export class PrestacoesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly analisa = inject(AuthService).pode('PRESTACAO_ANALISAR');
  readonly d = signal<PainelPrestacao | null>(null);
  readonly recusando = signal<PrestacaoContas | null>(null);
  readonly sit = SIT_PRESTACAO;
  readonly naturezas = NATUREZAS;
  readonly meta = fmtMeta;
  motivo: string | null = null;

  ngOnInit() {
    this.api.painelPrestacoes().subscribe((d) => this.d.set(d));
  }
  aguardando() {
    return this.d()?.recebidas.filter((p) => p.situacao === 'AGUARDANDO_ANALISE').length ?? 0;
  }
  grupos(d: PainelPrestacao) {
    return [
      { titulo: 'Benefícios sem contrapartida a comprovar', sub: 'Tipo de Concessão que não gera Ato Declaratório', itens: d.semContrapartida, valor: 'NAO_SE_APLICA', rotulo: 'Não se aplica' },
      { titulo: 'Primeira prestação de contas ainda não devida', sub: 'a obrigação nasce com o fim do primeiro período', itens: d.naoDevidas, valor: 'PENDENTE', rotulo: 'Não vencida' },
      { titulo: 'Benefícios encerrados', sub: 'sem obrigação de prestar contas', itens: d.encerrados, valor: 'ATRASO', rotulo: 'Cassado' },
    ];
  }
  private executar(obs: Observable<PainelPrestacao>, titulo: string, detalhe: string) {
    obs.subscribe((d) => { this.d.set(d); this.msg.add({ severity: 'success', summary: titulo, detail: detalhe }); });
  }
  validar(p: PrestacaoContas) {
    this.confirmacao.confirm({
      header: 'Validar a prestação de contas',
      message: `${p.protocolo} — ${p.razaoSocial}. O realizado informado é somado às contrapartidas e o percentual de cumprimento é recalculado.`,
      acceptLabel: 'Validar',
      accept: () => this.executar(this.api.validarPrestacao(p.id), 'Informe validado', `${p.razaoSocial} · contrapartidas atualizadas.`),
    });
  }
  recusar() {
    const p = this.recusando()!;
    this.executar(this.api.recusarPrestacao(p.id, this.motivo!), 'Informe recusado', 'Motivo registrado e comunicado à empresa.');
    this.recusando.set(null);
  }
  notificar(processoId: number) {
    this.executar(this.api.notificarPrestacao(processoId), 'Notificação enviada', 'Comunicação oficial com novo prazo e ocorrência registrada.');
  }
  baixar(p: PrestacaoContas, docId: number, nome: string) {
    this.api.baixarArquivo(p.processoId, docId).subscribe((b) => baixarBlob(b, nome));
  }
}
