import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConfigService } from '../../core/config.service';
import { BeneficioPublico } from '../../core/models';
import { baixarBlob } from '../../shared/ui';

/** Consulta pública de beneficiários (transparência ativa), sem autenticação. */
@Component({
  selector: 'app-transparencia',
  imports: [FormsModule, DatePipe, RouterLink, NzTableModule, NzInputModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    <div class="topo">
      @if (cfg.cliente; as c) { <img [src]="c.tema.logoUrl" alt="" class="logo" /><div><strong>{{ c.nomeOrgao }}</strong><div class="suave">{{ c.nomeSistema }}</div></div> }
      <span class="espaco"></span><a routerLink="/login" nz-button>Entrar no sistema</a>
    </div>
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Consulta pública de beneficiários</h1>
        <div class="subtitulo">Relação dos beneficiários de incentivos fiscais vigentes no Estado, como transparência ativa. Acesso sem autenticação.</div></div>
        <button nz-button (click)="exportar()"><nz-icon nzType="download" />Exportar dados</button></div>
      <nz-alert nzType="info" nzShowIcon nzMessage="O que esta consulta divulga"
        nzDescription="Razão social, CNPJ, benefício, modalidade, fundamento legal, data de concessão e vigência. Não são divulgados documentos do processo, valores de renúncia individualizados nem dados de apuração fiscal. O conjunto exato depende da política de transparência do Estado." />
      <div class="cartao">
        <div class="cartao-corpo"><input nz-input [ngModel]="busca" (ngModelChange)="buscar($event)" placeholder="Buscar por razão social ou CNPJ" class="busca" /></div>
        <nz-table #t [nzData]="linhas()" [nzPageSize]="25" [nzShowPagination]="linhas().length > 25" nzSize="middle" [nzNoResult]="vazio">
          <thead><tr><th>Razão social</th><th>CNPJ</th><th>Benefício</th><th>Modalidade</th><th>Fundamento legal</th><th>Concessão</th><th>Vigência até</th></tr></thead>
          <tbody>
            @for (b of t.data; track $index) {
              <tr><td class="forte">{{ b.razaoSocial }}</td><td class="mono suave nowrap">{{ b.cnpj }}</td><td>{{ b.beneficio }}</td><td>{{ b.modalidades }}</td>
                <td class="suave">{{ b.fundamento }}</td><td class="nowrap">{{ b.concessao + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                <td class="nowrap">{{ b.vigenciaFim ? (b.vigenciaFim + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</td></tr>
            }
          </tbody>
        </nz-table>
        <ng-template #vazio><div class="vazio">Nenhum beneficiário corresponde à busca.</div></ng-template>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--bf-fundo, #f5f7fa); }
    .topo { display: flex; gap: 12px; align-items: center; padding: 12px 24px; background: #fff; border-bottom: 1px solid var(--bf-borda); }
    .logo { height: 36px; } .espaco { flex: 1; } .busca { max-width: 360px; } .forte { font-weight: 600; } .nowrap { white-space: nowrap; }
  `,
})
export class TransparenciaPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly cfg = inject(ConfigService);
  readonly linhas = signal<BeneficioPublico[]>([]);
  private readonly termos = new Subject<string>();
  busca = '';

  ngOnInit() {
    this.termos.pipe(debounceTime(300)).subscribe((q) => this.carregar(q));
    this.carregar('');
  }
  buscar(q: string) {
    this.busca = q;
    this.termos.next(q);
  }
  private carregar(q: string) {
    this.api.transparencia(q.trim() || undefined).subscribe((l) => this.linhas.set(l));
  }
  exportar() {
    const cab = 'Razão social;CNPJ;Benefício;Modalidade;Fundamento legal;Concessão;Vigência até\n';
    const corpo = this.linhas().map((b) => [b.razaoSocial, b.cnpj, b.beneficio, b.modalidades, b.fundamento, b.concessao, b.vigenciaFim ?? ''].join(';')).join('\n');
    baixarBlob(new Blob(['﻿' + cab + corpo], { type: 'text/csv;charset=utf-8' }), 'beneficiarios-incentivos-fiscais.csv');
  }
}
