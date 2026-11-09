import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ApiService } from '../../core/api.service';
import { Dashboard } from '../../core/models';
import { BarrasComponent } from '../../shared/ui';

/** Painel gerencial: volume por situação e por setor, processos parados e aguardando o contribuinte. */
@Component({
  selector: 'app-painel',
  imports: [RouterLink, NzIconModule, BarrasComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Painel gerencial</h1><div class="subtitulo">Situação dos processos de benefício fiscal.</div></div></div>
      @if (d(); as d) {
        <div class="grade grade-4">
          <div class="cartao kpi"><span class="rotulo">Em andamento na Secretaria</span><span class="valor">{{ d.emAndamento }}</span><span class="detalhe">da formalização à publicação</span></div>
          <div class="cartao kpi"><span class="rotulo">Parados no setor</span><span class="valor alerta">{{ d.parados }}</span><span class="detalhe">há {{ d.diasAlerta }} dias ou mais</span></div>
          <div class="cartao kpi"><span class="rotulo">Aguardando o contribuinte</span><span class="valor">{{ d.aguardandoContribuinte }}</span><span class="detalhe">documentos ou envio</span></div>
          <div class="cartao kpi"><span class="rotulo">Benefícios concedidos</span><span class="valor">{{ d.concedidos }}</span><span class="detalhe">vigentes, arquivados ou aguardando ciência</span></div>
        </div>
        <div class="grade grade-2">
          <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="bar-chart" />Processos por situação</span></div>
            <div class="cartao-corpo"><bf-barras [barras]="porSituacao()" /></div></div>
          <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="apartment" />Em andamento por setor</span></div>
            <div class="cartao-corpo"><bf-barras [barras]="porSetor()" /></div>
            <div class="cartao-corpo"><a routerLink="/processos">Abrir a consulta de processos</a></div></div>
        </div>
      }
    </div>
  `,
  styles: `.alerta { color: #b45309; }`,
})
export class PainelPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly d = signal<Dashboard | null>(null);
  readonly porSituacao = computed(() => (this.d()?.porSituacao ?? []).filter((s) => s.quantidade > 0).map((s) => ({ rotulo: s.rotulo, valor: s.quantidade })));
  readonly porSetor = computed(() => Object.entries(this.d()?.porSetor ?? {}).map(([rotulo, valor]) => ({ rotulo, valor })));

  ngOnInit() {
    this.api.dashboard().subscribe((d) => this.d.set(d));
  }
}
