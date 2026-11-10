import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApiService } from '../../core/api.service';
import { CadastroBeneficiarios, LinhaCadastro } from '../../core/models';
import { StatusTagComponent, baixarBlob } from '../../shared/ui';
import { KpisComponent, RISCOS, SIT_CONTRAPARTIDA, TIPO_SITUACAO, fmtMoeda } from './comum';

/** Cadastro Estadual de Beneficiários: uma linha por benefício concedido, com renúncia, contrapartidas e risco. */
@Component({
  selector: 'app-beneficiarios',
  imports: [FormsModule, DatePipe, NzTableModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, StatusTagComponent, KpisComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho">
        <div><h1>Cadastro Estadual de Beneficiários</h1>
          <div class="subtitulo">Todos os contribuintes que usufruem de incentivo fiscal no Estado, com a renúncia apurada nos últimos 12 meses.</div></div>
        <button nz-button (click)="exportar()"><nz-icon nzType="download" />Exportar CSV</button>
      </div>
      @if (d(); as d) {
        <bf-kpis [cards]="d.cards" />
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="idcard" />Beneficiários</span>
            <span class="suave">uma linha por benefício concedido — empresa com mais de um aparece uma vez por benefício</span></div>
          <div class="cartao-corpo filtros">
            <input nz-input [ngModel]="texto()" (ngModelChange)="texto.set($event)" placeholder="Razão social, CNPJ ou processo" class="busca" />
            <nz-select [ngModel]="risco()" (ngModelChange)="risco.set($event)" nzAllowClear nzPlaceHolder="Risco" class="sel">
              @for (r of riscos; track r.v) { <nz-option [nzValue]="r.v" [nzLabel]="r.l" /> }
            </nz-select>
            <nz-select [ngModel]="cp()" (ngModelChange)="cp.set($event)" nzAllowClear nzPlaceHolder="Contrapartidas" class="sel">
              @for (r of cps; track r.v) { <nz-option [nzValue]="r.v" [nzLabel]="r.l" /> }
            </nz-select>
          </div>
          <nz-table #t [nzData]="filtradas()" [nzPageSize]="25" [nzShowPagination]="filtradas().length > 25" nzSize="middle">
            <thead><tr><th>Beneficiário</th><th>CNPJ</th><th>Benefício</th><th>Concessão</th><th>Situação</th><th class="dir">Renúncia 12 meses</th><th>Contrapartidas</th><th>Risco</th></tr></thead>
            <tbody>
              @for (l of t.data; track l.processoId) {
                <tr class="clicavel" (click)="abrir(l)">
                  <td class="forte">{{ l.razaoSocial }}</td><td class="mono suave nowrap">{{ l.cnpj }}</td>
                  <td>{{ l.beneficio }}<div class="suave pequeno">{{ l.numeroProcesso }} · {{ l.tipoConcessao }}</div></td>
                  <td class="nowrap">{{ l.concessao + 'T12:00:00' | date: 'dd/MM/yyyy' }}</td>
                  <td><bf-status [valor]="tipo[l.situacaoTipo]" [rotulo]="l.situacao + (l.encerradoEm ? ' em ' + (l.encerradoEm + 'T12:00:00' | date: 'dd/MM/yyyy') : '')" /></td>
                  <td class="dir num forte">{{ l.situacao === 'Cassado' ? '—' : moeda(l.renuncia) }}</td>
                  <td><bf-status [valor]="l.contrapartidas" [rotulo]="sitCp[l.contrapartidas]" /></td>
                  <td><bf-status [valor]="l.risco" [rotulo]="rotRisco[l.risco]" /></td>
                </tr>
              }
            </tbody>
          </nz-table>
        </div>
      } @else { <div class="cartao vazio"><nz-icon nzType="loading" />Apurando o cadastro…</div> }
    </div>
  `,
  styles: `
    .filtros { display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--bf-borda); }
    .busca { max-width: 320px; } .sel { min-width: 180px; }
    .clicavel { cursor: pointer; } .forte { font-weight: 600; } .pequeno { font-size: 12px; } .dir { text-align: right; } .nowrap { white-space: nowrap; }
  `,
})
export class BeneficiariosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly d = signal<CadastroBeneficiarios | null>(null);
  readonly sitCp = SIT_CONTRAPARTIDA;
  readonly rotRisco = RISCOS;
  readonly tipo = TIPO_SITUACAO;
  readonly moeda = fmtMoeda;
  readonly riscos = Object.entries(RISCOS).map(([v, l]) => ({ v, l }));
  readonly cps = ['EM_DIA', 'ATENCAO', 'ATRASO', 'SEM_CONTRAPARTIDA', 'NAO_SE_APLICA'].map((v) => ({ v, l: SIT_CONTRAPARTIDA[v] }));
  readonly texto = signal('');
  readonly risco = signal<string | null>(null);
  readonly cp = signal<string | null>(null);
  readonly filtradas = computed(() => {
    const q = this.texto().trim().toLowerCase();
    return (this.d()?.linhas ?? []).filter((l) => (!q || (l.razaoSocial + ' ' + l.cnpj + ' ' + l.numeroProcesso).toLowerCase().includes(q))
      && (!this.risco() || l.risco === this.risco()) && (!this.cp() || l.contrapartidas === this.cp()));
  });

  ngOnInit() {
    this.api.cadastroBeneficiarios().subscribe((d) => this.d.set(d));
  }
  abrir(l: LinhaCadastro) {
    this.router.navigate(['/beneficiarios', l.interessadoId]);
  }
  exportar() {
    this.api.exportarCadastro().subscribe((b) => baixarBlob(b, 'cadastro-estadual-beneficiarios.csv'));
  }
}
