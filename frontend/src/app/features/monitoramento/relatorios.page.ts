import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MensagemService } from '../../core/mensagens';
import { RelatorioMonitoramento } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { TIPO_SITUACAO } from './comum';

/** Relatórios: Relatório Trimestral de Monitoramento e recortes de benefícios por período. */
@Component({
  selector: 'app-relatorios',
  imports: [FormsModule, DatePipe, RouterLink, NzSelectModule, NzRadioModule, NzTableModule, NzButtonModule, NzIconModule, NzAlertModule, NzTooltipModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Relatórios</h1><div class="subtitulo">Produtos periódicos exigidos por norma e consultas por período, a partir do Cadastro Estadual de Beneficiários.</div></div></div>
      @if (r(); as r) {
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="file-text" />Relatório Trimestral de Monitoramento — {{ r.trimestreRotulo }}</span>
            <span class="acoes-titulo">
              <nz-select [ngModel]="r.trimestre" (ngModelChange)="carregar({ trimestre: $event })" class="sel">
                @for (t of r.trimestres; track t) { <nz-option [nzValue]="t" [nzLabel]="rotuloTri(t)" /> }
              </nz-select>
              <button nz-button nzType="primary" [disabled]="!emite || emitido(r)" nz-tooltip
                [nzTooltipTitle]="!emite ? 'O registro de emissão é feito pelo monitoramento ou pela Coordenação' : emitido(r) ? 'Já registrado como emitido' : null" (click)="emitir(r.trimestre)">
                <nz-icon nzType="check" />Registrar como emitido</button>
            </span></div>
          <div class="lista">
            @for (s of r.secoes; track s.titulo) { <div class="item"><strong>{{ s.titulo }}</strong><span>{{ s.texto }}</span></div> }
          </div>
          @if (r.emissoes.length) {
            <div class="cartao-corpo rodape suave pequeno">Emissões registradas:
              @for (e of r.emissoes; track e.periodo) { <span class="emissao">{{ rotuloTri(e.periodo) }} · {{ e.emitidoPor }} · {{ e.emitidoEm | date: 'dd/MM/yyyy HH:mm' }}</span> }</div>
          }
        </div>

        <nz-alert nzType="info" nzShowIcon nzMessage="Os dois recortes são diferentes"
          nzDescription="Um benefício concedido em anos anteriores pode continuar vigente e integrar o recorte de ativos sem integrar o de concedidos no ano. Solicitação em análise, indeferida ou arquivada não entra em nenhum dos dois, porque não houve concessão." />
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="table" />{{ r.linhas.length }} benefício(s) {{ r.recorte === 'ativos' ? 'em fruição' : 'concedido(s) em ' + r.ano }}</span>
            <span class="acoes-titulo">
              <nz-radio-group [ngModel]="r.recorte" (ngModelChange)="carregar({ trimestre: r.trimestre, recorte: $event, ano: r.ano })" nzButtonStyle="solid">
                <label nz-radio-button nzValue="ativos">Ativos no período</label><label nz-radio-button nzValue="concedidos">Concedidos no ano</label>
              </nz-radio-group>
              @if (r.recorte === 'concedidos') {
                <nz-select [ngModel]="r.ano" (ngModelChange)="carregar({ trimestre: r.trimestre, recorte: 'concedidos', ano: $event })" class="sel-ano">
                  @for (a of r.anos; track a) { <nz-option [nzValue]="a" [nzLabel]="a" /> }
                </nz-select>
              }
            </span></div>
          <nz-table #t [nzData]="r.linhas" [nzShowPagination]="false" nzSize="middle">
            <thead><tr><th>Beneficiário</th><th>Benefício</th><th>Tipo de Concessão</th><th>Concessão</th><th>Situação</th></tr></thead>
            <tbody>
              @for (l of t.data; track $index) {
                <tr><td><a [routerLink]="['/beneficiarios', l.interessadoId]" class="forte">{{ l.razaoSocial }}</a></td><td>{{ l.beneficio }}</td><td>{{ l.tipoConcessao }}</td>
                  <td>{{ l.concessao + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td><td><bf-status [valor]="tipo[l.situacaoTipo]" [rotulo]="l.situacao" /></td></tr>
              }
            </tbody>
          </nz-table>
        </div>
      } @else { <div class="cartao vazio"><nz-icon nzType="loading" />Apurando…</div> }
    </div>
  `,
  styles: `
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; border-top: 1px solid var(--bf-borda); }
    .item:first-child { border-top: none; }
    .acoes-titulo { display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; font-weight: 400; }
    .sel { min-width: 200px; } .sel-ano { min-width: 100px; }
    .forte { font-weight: 600; } .pequeno { font-size: 12px; } .rodape { border-top: 1px solid var(--bf-borda); }
    .emissao { margin-left: 12px; }
  `,
})
export class RelatoriosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  readonly emite = inject(AuthService).pode('RELATORIO_EMITIR');
  readonly r = signal<RelatorioMonitoramento | null>(null);
  readonly tipo = TIPO_SITUACAO;

  ngOnInit() {
    this.carregar({});
  }
  carregar(p: { trimestre?: string; recorte?: string; ano?: string }) {
    this.api.relatorioMonitoramento(p).subscribe((r) => this.r.set(r));
  }
  rotuloTri(t: string) {
    return `${t.slice(6)}º trimestre de ${t.slice(0, 4)}`;
  }
  emitido(r: RelatorioMonitoramento) {
    return r.emissoes.some((e) => e.periodo === r.trimestre);
  }
  emitir(t: string) {
    this.api.emitirRelatorio(t).subscribe((r) => {
      this.r.set(r);
      this.msg.add({ severity: 'success', summary: 'Relatório registrado', detail: `${r.trimestreRotulo} registrado como emitido.` });
    });
  }
}
