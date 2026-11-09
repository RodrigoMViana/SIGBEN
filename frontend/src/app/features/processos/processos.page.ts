import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MensagemService } from '../../core/mensagens';
import { MenuService } from '../../core/menu.service';
import { BeneficioCatalogo, ProcessoResumo, Setor, UsuarioResumo } from '../../core/models';
import { Selecao, StatusTagComponent, TabelaServidor, informarLote } from '../../shared/ui';

export const ROTULOS_STATUS: Record<string, string> = {
  EM_FORMALIZACAO: 'Em formalização (contribuinte)', RECEBIDO: 'Recebido no Atendimento', INFORMACAO_FISCAL: 'Aguardando Informação Fiscal',
  ANALISE_JURIDICA: 'Em análise jurídica', PARECER_ELABORACAO: 'Parecer em elaboração', ATO_ELABORACAO: 'Ato Declaratório em elaboração',
  HOMOLOGACAO: 'Aguardando homologação', PUBLICACAO: 'Aguardando publicação', CIENCIA_PENDENTE: 'Concedido · aguardando ciência',
  ARQUIVAMENTO_PENDENTE: 'Aguardando arquivamento', CONCEDIDO_ARQUIVADO: 'Concedido · arquivado', VIGENTE: 'Vigente',
  DILIGENCIA: 'Em diligência (contribuinte)', MANIFESTACAO: 'Aguardando manifestação de setor', INSTRUCAO_EXTERNA: 'Em instrução externa (Agência/CONDI)',
  TERMO_ACORDO: 'Aguardando termo de acordo', INDEFERIDO: 'Indeferido', RECURSO: 'Em recurso (Conselho)', SUSPENSO: 'Benefício suspenso',
  CASSADO: 'Benefício cassado', ARQUIVADO: 'Arquivado',
};
export const ESPECIES: Record<string, string> = { CONCESSAO: 'Concessão', PRORROGACAO: 'Prorrogação', ALTERACAO: 'Alteração', RENUNCIA: 'Renúncia' };

/** Caixa de trabalho (situações em que o perfil ativo age) e consulta geral de processos. */
@Component({
  selector: 'app-processos',
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, NzTableModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule,
    NzTagModule, NzTooltipModule, NzModalModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho">
        <div>
          <h1>{{ caixa() ? 'Minha caixa de trabalho' : 'Consulta de processos' }}</h1>
          <div class="subtitulo">{{ caixa()
            ? 'Processos nas situações em que o seu perfil age agora' + (distribui() ? ', incluindo a carteira da equipe para distribuição.' : '.')
            : 'Todos os processos de benefício, em qualquer situação e setor.' }}</div>
        </div>
        @if (caixa() && distribui()) {
          <button nz-button nzType="primary" [disabled]="sel.quantidade() === 0" (click)="abrirDistribuicao()">
            <nz-icon nzType="user-switch" />Distribuir{{ sel.quantidade() ? ' (' + sel.quantidade() + ')' : '' }}
          </button>
        }
      </div>

      <div class="cartao">
        <div class="cartao-corpo filtros">
          <nz-input-wrapper class="busca"><nz-icon nzInputPrefix nzType="search" /><input nz-input placeholder="Número do processo, razão social ou CNPJ" [(ngModel)]="texto" (keyup.enter)="t.reiniciar()" /></nz-input-wrapper>
          <nz-select nzMode="multiple" nzPlaceHolder="Situação" [(ngModel)]="status" (ngModelChange)="t.reiniciar()" nzAllowClear class="filtro-status">
            @for (s of situacoes; track s.v) { <nz-option [nzValue]="s.v" [nzLabel]="s.l" /> }
          </nz-select>
          <nz-select nzPlaceHolder="Benefício" [(ngModel)]="beneficioId" (ngModelChange)="t.reiniciar()" nzAllowClear nzShowSearch class="filtro">
            @for (b of beneficios(); track b.beneficio.id) { <nz-option [nzValue]="b.beneficio.id" [nzLabel]="b.beneficio.assunto" /> }
          </nz-select>
          @if (!caixa()) {
            <nz-select nzPlaceHolder="Setor" [(ngModel)]="setorId" (ngModelChange)="t.reiniciar()" nzAllowClear class="filtro-curto">
              @for (s of setores(); track s.id) { <nz-option [nzValue]="s.id" [nzLabel]="s.sigla" /> }
            </nz-select>
          }
          <button nz-button (click)="t.reiniciar()"><nz-icon nzType="reload" />Atualizar</button>
        </div>
        <nz-table [nzData]="t.itens()" [nzFrontPagination]="false" [nzTotal]="t.total()" [(nzPageIndex)]="t.pagina" [(nzPageSize)]="t.tamanho"
                  [nzLoading]="t.carregando()" [nzShowSizeChanger]="true" [nzPageSizeOptions]="[25, 50, 100]" [nzShowTotal]="totalTpl"
                  (nzQueryParams)="t.aoMudar($event)" [nzNoResult]="vazioTpl">
          <thead>
            <tr>
              @if (caixa() && distribui()) {
                <th nzWidth="44px" [nzChecked]="sel.todos(distribuiveis())" [nzIndeterminate]="sel.parcial(distribuiveis())" (nzCheckedChange)="sel.marcarTodos(distribuiveis(), $event)"></th>
              }
              <th nzColumnKey="numero" [nzSortFn]="true">Processo</th>
              <th class="col-nome">Interessado</th>
              <th>Benefício</th>
              <th>Situação</th>
              <th>Setor</th>
              <th>Responsável</th>
              <th nzColumnKey="diasNoSetor" [nzSortFn]="true" nzAlign="right">No setor</th>
              <th nzColumnKey="valorPretendido" [nzSortFn]="true" nzAlign="right">Renúncia estimada</th>
            </tr>
          </thead>
          <tbody>
            @for (p of t.itens(); track p.id) {
              <tr class="linha-clicavel" (click)="abrir(p)">
                @if (caixa() && distribui()) {
                  <td [nzChecked]="sel.tem(p)" [nzDisabled]="!ehCarteira(p)" (nzCheckedChange)="sel.alternar(p, $event)" (click)="$event.stopPropagation()"></td>
                }
                <td class="nowrap">
                  <a [routerLink]="['/processos', p.id]" (click)="$event.stopPropagation()" class="mono">{{ p.numero }}</a>
                  <div class="suave pequeno">{{ especies[p.especie] }} · {{ p.dataSolicitacao | date: 'dd/MM/yyyy' }}</div>
                </td>
                <td><div class="truncar">{{ p.razaoSocial }}</div><div class="suave pequeno">{{ p.cnpj }}</div></td>
                <td>
                  <div>{{ p.beneficio }}</div>
                  @if (p.divergenciaCnae) { <nz-tag nzColor="warning" nz-tooltip nzTooltipTitle="CNAE do interessado fora do alcance do benefício">divergência de CNAE</nz-tag> }
                </td>
                <td>
                  <bf-status [valor]="p.status" [rotulo]="p.statusRotulo" />
                  @if (p.prioridade !== 'NORMAL') { <bf-status [valor]="p.prioridade" [rotulo]="p.prioridade === 'URGENTE' ? 'urgente' : 'prioritário'" /> }
                </td>
                <td>{{ p.setor }}</td>
                <td>{{ p.responsavelNome ?? (ehCarteira(p) ? 'sem responsável' : '—') }}</td>
                <td class="direita num" [class.alerta]="p.parado">
                  {{ p.diasNoSetor }} {{ p.diasNoSetor === 1 ? 'dia' : 'dias' }}
                  @if (p.parado) { <nz-icon nzType="warning" nz-tooltip nzTooltipTitle="Processo parado no setor além do prazo de alerta" /> }
                </td>
                <td class="direita num">{{ p.valorPretendido ? (p.valorPretendido | currency: 'BRL') : '—' }}</td>
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #totalTpl let-total>{{ total }} processo(s)</ng-template>
        <ng-template #vazioTpl><div class="vazio"><nz-icon nzType="inbox" />{{ caixa() ? 'Nenhum processo aguardando a sua ação.' : 'Nenhum processo encontrado.' }}</div></ng-template>
      </div>
    </div>

    <nz-modal [nzVisible]="distribuindo()" nzTitle="Distribuir processos" (nzOnCancel)="distribuindo.set(false)" [nzFooter]="rodape" nzWidth="32rem">
      <ng-container *nzModalContent>
        <div class="corpo-modal">
          <span class="suave">{{ sel.quantidade() }} processo(s) selecionado(s).</span>
          <div class="campo"><label class="obrigatorio">Responsável</label>
            <nz-select [(ngModel)]="responsavelId" nzPlaceHolder="Selecione o auditor" nzShowSearch>
              @for (u of responsaveis(); track u.id) { <nz-option [nzValue]="u.id" [nzLabel]="u.nome + ' · ' + u.cargo" /> }
            </nz-select></div>
          <div class="campo"><label>Prioridade</label>
            <nz-select [(ngModel)]="prioridade" nzAllowClear nzPlaceHolder="Manter a atual">
              <nz-option nzValue="NORMAL" nzLabel="Normal" /><nz-option nzValue="PRIORITARIA" nzLabel="Prioritário" /><nz-option nzValue="URGENTE" nzLabel="Urgente" />
            </nz-select></div>
        </div>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="distribuindo.set(false)">Cancelar</button>
        <button nz-button nzType="primary" [disabled]="!responsavelId" (click)="distribuir()">Distribuir</button>
      </ng-template>
    </nz-modal>
  `,
  styles: `
    .filtros { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--bf-borda); }
    .busca { width: 340px; max-width: 100%; }
    .filtro-status { min-width: 240px; } .filtro { min-width: 220px; } .filtro-curto { min-width: 120px; }
    .pequeno { font-size: 12px; }
    .alerta { color: #b45309; font-weight: 600; }
    .corpo-modal { display: flex; flex-direction: column; gap: 14px; }
  `,
})
export class ProcessosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly msg = inject(MensagemService);
  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  readonly caixa = signal(this.rota.snapshot.data['modo'] === 'caixa');
  readonly distribui = computed(() => this.auth.pode('PROCESSO_DISTRIBUIR'));
  readonly especies = ESPECIES;
  readonly situacoes = Object.entries(ROTULOS_STATUS).map(([v, l]) => ({ v, l }));
  readonly beneficios = signal<BeneficioCatalogo[]>([]);
  readonly setores = signal<Setor[]>([]);
  readonly responsaveis = signal<UsuarioResumo[]>([]);
  readonly sel = new Selecao<ProcessoResumo>();
  readonly distribuindo = signal(false);

  texto = '';
  status: string[] = [];
  beneficioId: number | null = null;
  setorId: number | null = null;
  responsavelId: number | null = null;
  prioridade: string | null = null;

  readonly t = new TabelaServidor<ProcessoResumo>((c) => this.api.processos({
    ...c, caixa: this.caixa(), texto: this.texto, status: this.status, beneficioId: this.beneficioId, setorId: this.setorId,
  }));

  ngOnInit() {
    this.api.beneficios().subscribe((b) => this.beneficios.set(b.filter((x) => x.beneficio.geraParecer)));
    if (!this.caixa()) this.api.setores().subscribe((s) => this.setores.set(s.filter((x) => x.tipo === 'INTERNO')));
  }

  ehCarteira(p: ProcessoResumo) {
    return ['ANALISE_JURIDICA', 'PARECER_ELABORACAO', 'ATO_ELABORACAO'].includes(p.status);
  }

  distribuiveis() {
    return this.t.itens().filter((p) => this.ehCarteira(p));
  }

  abrir(p: ProcessoResumo) {
    this.router.navigate(['/processos', p.id]);
  }

  abrirDistribuicao() {
    this.responsavelId = null;
    this.prioridade = null;
    this.api.usuariosComPermissao('PARECER_ELABORAR').subscribe((u) => this.responsaveis.set(u));
    this.distribuindo.set(true);
  }

  distribuir() {
    this.api.distribuir(this.sel.ids(), this.responsavelId, this.prioridade).subscribe((r) => {
      informarLote(this.msg, 'Distribuição registrada', r);
      this.distribuindo.set(false);
      this.sel.limpar();
      this.t.recarregar();
      this.menu.atualizarContadores();
    });
  }
}
