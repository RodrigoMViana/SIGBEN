import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ApiService } from '../../core/api.service';
import { InteligenciaFiscal } from '../../core/models';
import { BarrasComponent, StatusTagComponent } from '../../shared/ui';
import { KpisComponent, RISCOS, fmtMoeda } from './comum';

/** Painel de Inteligência Fiscal: onde a gestão decide olhar primeiro (últimos 12 meses). */
@Component({
  selector: 'app-inteligencia',
  imports: [RouterLink, NzAlertModule, NzButtonModule, NzIconModule, BarrasComponent, StatusTagComponent, KpisComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Painel de Inteligência Fiscal</h1>
        <div class="subtitulo">Onde a gestão decide olhar primeiro. Período de referência: últimos 12 meses completos.</div></div></div>
      @if (d(); as d) {
        <bf-kpis [cards]="d.cards" />
        <div class="grade grade-2">
          <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="bar-chart" />Concentração da renúncia (R$)</span><span class="suave">ordenada por valor</span></div>
            <div class="cartao-corpo"><bf-barras [barras]="concentracao()" /></div>
            <div class="cartao-corpo rodape suave pequeno">A renúncia tende a concentrar-se em poucos beneficiários: os {{ d.topo }} maiores orientam onde a fiscalização produz maior efeito.</div></div>
          <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="apartment" />Renúncia por finalidade (R$)</span><span class="suave">classificador oficial do catálogo</span></div>
            <div class="cartao-corpo"><bf-barras [barras]="finalidade()" /></div></div>
        </div>
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="alert" />Beneficiários que exigem atenção</span>
            <span class="suave">risco alto ou médio, com os critérios acionados e a ação recomendada</span></div>
          <div class="lista">
            @for (x of d.atencao; track x.interessadoId) {
              <div class="item">
                <div class="texto"><strong>{{ x.razaoSocial }}</strong>
                  <span class="pequeno">Critérios acionados: {{ x.motivos.join(', ') }}. Renúncia de {{ m(x.renuncia) }} no período.</span>
                  <span class="acao"><nz-icon nzType="caret-right" />Ação recomendada: {{ x.acao }}</span></div>
                <bf-status [valor]="x.risco" [rotulo]="riscos[x.risco]" />
                <a nz-button nzSize="small" [routerLink]="['/beneficiarios', x.interessadoId]">Abrir ficha</a>
              </div>
            } @empty { <div class="vazio"><nz-icon nzType="check-circle" />Todos os beneficiários ativos estão em risco baixo no período.</div> }
          </div>
        </div>
      } @else { <div class="cartao vazio"><nz-icon nzType="loading" />Apurando…</div> }
    </div>
  `,
  styles: `
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .texto { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 3px; }
    .pequeno { font-size: 12px; } .acao { font-size: 12px; color: #b45309; font-weight: 500; } .rodape { border-top: 1px solid var(--bf-borda); }
  `,
})
export class InteligenciaPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly d = signal<InteligenciaFiscal | null>(null);
  readonly riscos = RISCOS;
  readonly m = fmtMoeda;
  readonly concentracao = computed(() => (this.d()?.concentracao ?? []).map((b) => ({ rotulo: `${b.rotulo} (${b.percentual}%)`, valor: Math.round(b.valor) })));
  readonly finalidade = computed(() => (this.d()?.porFinalidade ?? []).map((b) => ({ rotulo: `${b.rotulo} (${b.percentual}%)`, valor: Math.round(b.valor) })));

  ngOnInit() {
    this.api.inteligencia().subscribe((d) => this.d.set(d));
  }
}
