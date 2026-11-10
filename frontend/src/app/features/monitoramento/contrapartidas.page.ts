import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApiService } from '../../core/api.service';
import { PainelContrapartidas } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { KpisComponent, NATUREZAS, PERIODICIDADES, SIT_CONTRAPARTIDA, fmtMeta } from './comum';

/** Painel consolidado de contrapartidas: o que o Estado recebeu em troca da renúncia, pactuado contra realizado. */
@Component({
  selector: 'app-contrapartidas',
  imports: [DatePipe, NzTableModule, NzIconModule, StatusTagComponent, KpisComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Painel consolidado de contrapartidas</h1>
        <div class="subtitulo">O que o Estado recebeu em troca da renúncia — pactuado contra realizado, em todos os beneficiários ativos.</div></div></div>
      @if (d(); as d) {
        <bf-kpis [cards]="d.cards" />
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="check-square" />Contrapartidas monitoradas</span></div>
          <nz-table #t [nzData]="d.linhas" [nzShowPagination]="false" nzSize="middle">
            <thead><tr><th>Beneficiário</th><th>Contrapartida</th><th class="dir">Meta</th><th class="dir">Realizado</th><th class="dir">Cumprimento</th><th>Prazo</th><th>Periodicidade</th><th>Próxima comprovação</th><th>Situação</th></tr></thead>
            <tbody>
              @for (l of t.data; track l.contrapartida.id) {
                <tr class="clicavel" (click)="abrir(l.interessadoId)">
                  <td class="forte">{{ l.razaoSocial }}<div class="suave pequeno">{{ l.numeroProcesso }}</div></td>
                  <td>{{ naturezas[l.contrapartida.natureza] }}</td>
                  <td class="dir num suave">{{ meta(l.contrapartida.meta, l.contrapartida.unidade) }}</td>
                  <td class="dir num forte">{{ meta(l.contrapartida.realizado, l.contrapartida.unidade) }}</td>
                  <td class="dir num forte" [class.ok]="l.contrapartida.percentual >= 100" [class.ruim]="l.contrapartida.percentual < 60">{{ l.contrapartida.percentual }}%</td>
                  <td class="nowrap">{{ l.contrapartida.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ per[l.contrapartida.periodicidade] }}</td>
                  <td class="nowrap" [class.ruim]="l.contrapartida.proximaVencida">{{ l.contrapartida.proximaComprovacao ? (l.contrapartida.proximaVencida ? 'vencida em ' : '') + (l.contrapartida.proximaComprovacao + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</td>
                  <td><bf-status [valor]="l.contrapartida.situacao" [rotulo]="sit[l.contrapartida.situacao]" /></td>
                </tr>
              }
            </tbody>
          </nz-table>
        </div>
      } @else { <div class="cartao vazio"><nz-icon nzType="loading" />Carregando…</div> }
    </div>
  `,
  styles: `.clicavel { cursor: pointer; } .forte { font-weight: 600; } .pequeno { font-size: 12px; } .dir { text-align: right; } .nowrap { white-space: nowrap; }
    .ok { color: #0f766e; } .ruim { color: #b91c1c; }`,
})
export class ContrapartidasPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly d = signal<PainelContrapartidas | null>(null);
  readonly naturezas = NATUREZAS;
  readonly per = PERIODICIDADES;
  readonly sit = SIT_CONTRAPARTIDA;
  readonly meta = fmtMeta;

  ngOnInit() {
    this.api.painelContrapartidas().subscribe((d) => this.d.set(d));
  }
  abrir(id: number) {
    this.router.navigate(['/beneficiarios', id]);
  }
}
