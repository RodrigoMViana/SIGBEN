import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { MenuService } from '../../core/menu.service';
import { Comunicacao, Evento, ProcessoDetalhe } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';
import { ESPECIES } from '../processos/processos.page';
import { AbaAtoComponent } from './aba-ato';
import { AbaDocumentosComponent } from './aba-documentos';
import { AbaHomologacaoComponent, AbaPublicacaoComponent } from './aba-gabinete';
import { AbaInformacaoFiscalComponent } from './aba-informacao-fiscal';
import { AbaParecerComponent } from './aba-parecer';
import { AbaDiligenciasComponent, AbaRecursosComponent, AbaTermoComponent, ProcedimentosComponent } from './aba-desvios';

/** O que acontece agora no processo: texto da próxima ação e a aba onde ela é executada. */
const PROXIMA: Record<string, { texto: string; aba: string }> = {
  EM_FORMALIZACAO: { texto: 'Aguardando o contribuinte completar os documentos obrigatórios e enviar a solicitação pelo portal.', aba: 'documentos' },
  RECEBIDO: { texto: 'Atendimento: conferir a taxa e os documentos e formalizar o processo (ou recusar documento).', aba: 'documentos' },
  INFORMACAO_FISCAL: { texto: 'Fiscalização: analisar a viabilidade operacional e emitir a Informação Fiscal.', aba: 'informacaoFiscal' },
  ANALISE_JURIDICA: { texto: 'Tributação: distribuir o processo e verificar a elegibilidade e o enquadramento.', aba: 'parecer' },
  PARECER_ELABORACAO: { texto: 'Tributação: redigir e assinar o parecer, com a Informação Fiscal como subsídio.', aba: 'parecer' },
  ATO_ELABORACAO: { texto: 'Tributação: preencher as cláusulas e as contrapartidas do Ato Declaratório e concluí-lo.', aba: 'ato' },
  HOMOLOGACAO: { texto: 'Gabinete: o Secretário homologa o parecer (e o ato vinculado).', aba: 'homologacao' },
  PUBLICACAO: { texto: 'Gabinete: registrar as fases da publicação do Ato Declaratório no Diário Oficial.', aba: 'publicacao' },
  CIENCIA_PENDENTE: { texto: 'Aguardando a ciência do contribuinte (portal, canal eletrônico ou presencial no Atendimento).', aba: 'vigencia' },
  ARQUIVAMENTO_PENDENTE: { texto: 'Coordenação: arquivar o processo concluído.', aba: 'vigencia' },
  CONCEDIDO_ARQUIVADO: { texto: 'Benefício concedido. Processo arquivado e em acompanhamento pelo monitoramento.', aba: 'vigencia' },
  VIGENTE: { texto: 'Benefício vigente e incluído no Cadastro Estadual de Beneficiários.', aba: 'vigencia' },
  DILIGENCIA: { texto: 'Aguardando o contribuinte responder a diligência no portal. A análise retoma com a resposta.', aba: 'diligencias' },
  MANIFESTACAO: { texto: 'Aguardando a manifestação complementar de outro setor; o parecer só é finalizado sem pendência.', aba: 'diligencias' },
  INSTRUCAO_EXTERNA: { texto: 'Aguardando a deliberação da Agência de Desenvolvimento e do CONDI; registrar o retorno ao chegar.', aba: 'diligencias' },
  TERMO_ACORDO: { texto: 'Aguardando a empresa devolver o termo de acordo assinado; só então o Ato Declaratório é concluído.', aba: 'termo' },
  INDEFERIDO: { texto: 'Solicitação indeferida. Corre o prazo recursal de 30 dias da ciência; vencido sem recurso, arquivar.', aba: 'recursos' },
  RECURSO: { texto: 'Recurso em apreciação no Conselho de Recursos Fiscais (sem efeito suspensivo). Registrar o acórdão.', aba: 'recursos' },
  SUSPENSO: { texto: 'Benefício suspenso. Restabelecer quando a irregularidade for sanada; cabe recurso em 30 dias da ciência.', aba: 'vigencia' },
  CASSADO: { texto: 'Benefício cassado (irreversível). Cabe recurso ao Conselho em 30 dias da ciência.', aba: 'recursos' },
  ARQUIVADO: { texto: 'Processo encerrado e arquivado.', aba: 'historico' },
};

@Component({
  selector: 'app-processo',
  imports: [RouterLink, DatePipe, CurrencyPipe, NzTabsModule, NzTagModule, NzButtonModule, NzIconModule, NzTooltipModule, NzAlertModule,
    NzBadgeModule, NzTimelineModule, StatusTagComponent, AbaDocumentosComponent, AbaInformacaoFiscalComponent, AbaParecerComponent,
    AbaAtoComponent, AbaHomologacaoComponent, AbaPublicacaoComponent, AbaDiligenciasComponent, AbaTermoComponent, AbaRecursosComponent,
    ProcedimentosComponent],
  template: `
    @if (d(); as d) {
      <div class="pagina">
        <div class="pagina-cabecalho">
          <div>
            <a routerLink="/caixa" class="voltar"><nz-icon nzType="arrow-left" /> Voltar</a>
            <h1><span class="mono">{{ d.resumo.numero }}</span> · {{ d.beneficio.assunto }}</h1>
            <div class="subtitulo">{{ d.interessado.razaoSocial }} · CNPJ {{ d.interessado.cnpj }} · {{ especies[d.resumo.especie] }}</div>
          </div>
          <div class="selos">
            <bf-status [valor]="d.resumo.status" [rotulo]="d.resumo.statusRotulo" />
            <bf-status [valor]="d.beneficio.tipoConcessao" [rotulo]="d.beneficio.tipoConcessaoRotulo" />
            @if (d.resumo.prioridade !== 'NORMAL') { <bf-status [valor]="d.resumo.prioridade" [rotulo]="d.resumo.prioridade === 'URGENTE' ? 'urgente' : 'prioritário'" /> }
          </div>
        </div>

        <div class="cartao proxima">
          <div class="cartao-corpo linha">
            <nz-icon nzType="flag" class="icone" />
            <div class="texto">
              <strong>Próxima ação</strong>
              <span>{{ proxima().texto }}</span>
              <span class="suave">Setor {{ d.resumo.setor }} há {{ d.resumo.diasNoSetor }} dia(s){{ d.resumo.responsavelNome ? ' · responsável ' + d.resumo.responsavelNome : '' }} · {{ d.resumo.diasTotal }} dia(s) desde a solicitação</span>
            </div>
            @if (abaAtual() !== proxima().aba && habilitada(proxima().aba)) {
              <button nz-button nzType="primary" (click)="irPara(proxima().aba)">Ir para a etapa<nz-icon nzType="caret-right" /></button>
            }
          </div>
        </div>

        <nz-tabs [nzSelectedIndex]="indice()" (nzSelectedIndexChange)="selecionar($event)" class="abas">
          @for (a of d.abas; track a.id) {
            <nz-tab [nzTitle]="tituloTpl" [nzDisabled]="!a.habilitada">
              <ng-template #tituloTpl>
                <span nz-tooltip [nzTooltipTitle]="a.habilitada ? null : a.motivo">{{ a.rotulo }}@if (a.pendente) { <nz-badge nzStatus="warning" class="ponto" /> }</span>
              </ng-template>
            </nz-tab>
          }
        </nz-tabs>

        @switch (abaAtual()) {
          @case ('dados') {
            <div class="grade grade-2">
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="idcard" />Interessado</span></div>
                <div class="cartao-corpo dados">
                  <div><div class="rotulo">Razão social</div><div class="valor">{{ d.interessado.razaoSocial }}</div></div>
                  <div><div class="rotulo">CNPJ</div><div class="valor">{{ d.interessado.cnpj }}</div></div>
                  <div><div class="rotulo">Inscrição estadual</div><div class="valor">{{ d.interessado.inscricaoEstadual }}</div></div>
                  <div><div class="rotulo">Porte</div><div class="valor">{{ d.interessado.porte }}</div></div>
                  <div><div class="rotulo">Atividade (CNAE)</div><div class="valor">{{ d.interessado.cnaes.join(', ') }} · {{ d.interessado.atividade }}</div></div>
                  <div><div class="rotulo">Município</div><div class="valor">{{ d.interessado.municipio }}</div></div>
                </div></div>
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="solution" />Solicitação</span></div>
                <div class="cartao-corpo dados">
                  <div><div class="rotulo">Espécie</div><div class="valor">{{ especies[d.resumo.especie] }}</div></div>
                  <div><div class="rotulo">Renúncia estimada</div><div class="valor">{{ d.resumo.valorPretendido ? (d.resumo.valorPretendido | currency: 'BRL') : '—' }}</div></div>
                  <div><div class="rotulo">Taxa de serviço</div><div class="valor">{{ d.taxaValor ? (d.taxaValor | currency: 'BRL') : 'isenta' }}</div><div class="suave pequeno">{{ d.taxaFaixa }}</div></div>
                  <div><div class="rotulo">Taxa conferida</div><div class="valor">{{ d.taxaConferidaEm ? (d.taxaConferidaEm | date: 'dd/MM/yyyy HH:mm') : 'não' }}</div></div>
                  <div><div class="rotulo">Solicitado em</div><div class="valor">{{ d.resumo.dataSolicitacao | date: 'dd/MM/yyyy HH:mm' }}</div></div>
                  <div><div class="rotulo">Formalizado em</div><div class="valor">{{ d.dataFormalizacao ? (d.dataFormalizacao | date: 'dd/MM/yyyy HH:mm') : '—' }}</div></div>
                  <div><div class="rotulo">Protocolo no {{ legado }}</div><div class="valor mono">{{ d.protocoloLegado ?? (d.dataFormalizacao ? 'em processamento' : '—') }}</div></div>
                  <div><div class="rotulo">Solicitante</div><div class="valor">{{ d.solicitante }}</div></div>
                </div>
                @if (d.requerimento) { <div class="cartao-corpo requerimento"><div class="rotulo suave">Requerimento</div>{{ d.requerimento }}</div> }
              </div>
            </div>
          }
          @case ('enquadramento') {
            <div class="grade grade-2">
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="bank" />Benefício e modalidade</span></div>
                <div class="cartao-corpo dados">
                  <div><div class="rotulo">Benefício</div><div class="valor">{{ d.beneficio.codigo }} · {{ d.beneficio.assunto }}</div></div>
                  <div><div class="rotulo">Modalidades</div><div class="valor">{{ d.beneficio.modalidades.join(' · ') || 'não se aplica' }}</div></div>
                  <div><div class="rotulo">Convênio ICMS</div><div class="valor">{{ d.beneficio.convenio }} · {{ d.beneficio.tipoConvenio }}</div></div>
                  <div><div class="rotulo">Norma</div><div class="valor">{{ d.beneficio.norma }} · {{ d.beneficio.statusNorma }}</div></div>
                  <div><div class="rotulo">Convalidação no CONFAZ</div><div class="valor">{{ d.beneficio.convalidacao }}</div></div>
                  <div><div class="rotulo">Prazo de fruição</div><div class="valor">{{ d.beneficio.prazoMeses ? d.beneficio.prazoMeses + ' meses' : '—' }}</div></div>
                </div></div>
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="apartment" />Alcance e efeitos</span></div>
                <div class="cartao-corpo coluna">
                  @for (a of d.beneficio.alcance; track a.rotulo) { <div><nz-tag>{{ a.rotulo }}</nz-tag> {{ a.descricao }}</div> } @empty { <span class="suave">Alcance livre (sem restrição de CNAE).</span> }
                  @if (d.resumo.divergenciaCnae) {
                    <nz-alert nzType="warning" nzShowIcon nzMessage="Divergência de CNAE" [nzDescription]="'A atividade do interessado (' + d.interessado.cnaes.join(', ') + ') não está no alcance do benefício. Avalie na análise jurídica.'" />
                  }
                  <nz-alert nzType="info" nzShowIcon [nzMessage]="'Tipo de Concessão ' + d.beneficio.tipoConcessaoRotulo"
                    [nzDescription]="d.beneficio.geraAto ? 'O processo gera parecer, Ato Declaratório vinculado e publicação no Diário Oficial; a vigência começa na publicação.' : 'O processo gera parecer homologado pelo Secretário, sem Ato Declaratório nem publicação; a vigência começa na homologação.'" />
                </div></div>
            </div>
          }
          @case ('documentos') { <app-aba-documentos [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('informacaoFiscal') { <app-aba-informacao-fiscal [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('parecer') { <app-aba-parecer [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('diligencias') { <app-aba-diligencias [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('ato') { <app-aba-ato [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('termo') { <app-aba-termo [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('recursos') { <app-aba-recursos [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('homologacao') { <app-aba-homologacao [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('publicacao') { <app-aba-publicacao [d]="d" (atualizado)="atualizar($event)" /> }
          @case ('vigencia') {
            <div class="grade grade-2">
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="check-circle" />Ciência do contribuinte</span></div>
                <div class="cartao-corpo coluna">
                  @if (d.cienciaEm) {
                    <div class="dados">
                      <div><div class="rotulo">Registrada em</div><div class="valor">{{ d.cienciaEm | date: 'dd/MM/yyyy HH:mm' }}</div></div>
                      <div><div class="rotulo">Forma</div><div class="valor">{{ formasCiencia[d.cienciaTipo ?? ''] ?? d.cienciaTipo }}</div></div>
                      <div><div class="rotulo">Por</div><div class="valor">{{ d.cienciaPor }}</div></div>
                    </div>
                  } @else {
                    <span>A ciência ainda não foi registrada. Enquanto isso, os prazos do contribuinte não começam a correr.</span>
                    <span class="suave">Pode ser registrada pelo contribuinte no portal, pelo canal eletrônico (expressa ou tácita) ou presencialmente no Atendimento.</span>
                  }
                  <div class="barra-acoes">
                    @if (!d.desvios.decisaoEm && d.acoes['REGISTRAR_CIENCIA']; as a) {
                      <button nz-button nzType="primary" [disabled]="!a.habilitada" nz-tooltip [nzTooltipTitle]="a.motivo" (click)="cienciaPresencial()" [nzLoading]="ocupado()">
                        <nz-icon nzType="check" />Registrar ciência presencial</button>
                    }
                    @if (d.resumo.status !== 'INDEFERIDO' && d.acoes['ARQUIVAR']; as a) {
                      <button nz-button nzType="primary" [disabled]="!a.habilitada" nz-tooltip [nzTooltipTitle]="a.motivo" (click)="arquivar()" [nzLoading]="ocupado()">
                        <nz-icon nzType="inbox" />Arquivar processo</button>
                    }
                  </div>
                </div></div>
              <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="calendar" />Vigência</span></div>
                <div class="cartao-corpo dados">
                  <div><div class="rotulo">Início</div><div class="valor">{{ d.vigenciaInicio ? (d.vigenciaInicio + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</div>
                    <div class="suave pequeno">{{ d.beneficio.geraAto ? 'publicação do Ato Declaratório' : 'homologação do parecer' }}</div></div>
                  <div><div class="rotulo">Término</div><div class="valor">{{ d.vigenciaFim ? (d.vigenciaFim + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</div></div>
                  <div><div class="rotulo">Prazo de fruição</div><div class="valor">{{ d.beneficio.prazoMeses ? d.beneficio.prazoMeses + ' meses' : '—' }}</div></div>
                  <div><div class="rotulo">Contrapartidas</div><div class="valor">{{ d.contrapartidas.length || 'nenhuma' }}</div></div>
                </div>
                @if (d.contrapartidas.length) {
                  <div class="cartao-corpo coluna">@for (c of d.contrapartidas; track c.id) { <div><nz-icon nzType="check-square" /> {{ c.descricao }}</div> }</div>
                }
              </div>
            </div>
            @if (d.desvios.procedimentos.length || d.acoes['ABRIR_SUSPENSAO'] || d.acoes['ABRIR_CASSACAO'] || d.acoes['RESTABELECER']) {
              <app-procedimentos [d]="d" (atualizado)="atualizar($event)" />
            }
          }
          @case ('comunicacoes') {
            <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="message" />Comunicações oficiais ao contribuinte</span><span class="suave">entregues pelo {{ canal }}</span></div>
              <div class="cartao-corpo coluna">
                @for (c of comunicacoes(); track c.id) {
                  <div class="comunicacao">
                    <div class="linha-com"><strong>{{ c.assunto }}</strong><span class="espaco"></span>
                      @if (c.cienciaEm) { <nz-tag nzColor="success">ciência {{ c.cienciaEm | date: 'dd/MM/yyyy' }}</nz-tag> } @else { <nz-tag nzColor="warning">sem ciência</nz-tag> }</div>
                    <div class="suave pequeno">Enviada em {{ c.enviadaEm | date: 'dd/MM/yyyy HH:mm' }} · {{ c.numeroDte ? canal + ' nº ' + c.numeroDte : 'entrega em processamento' }}{{ c.prazo ? ' · prazo ' + (c.prazo + 'T12:00:00' | date: 'dd/MM/yyyy') : '' }}</div>
                    <pre class="texto-com">{{ c.texto }}</pre>
                  </div>
                } @empty { <div class="vazio"><nz-icon nzType="message" />Nenhuma comunicação enviada.</div> }
              </div></div>
          }
          @case ('historico') {
            <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="field-time" />Histórico e tramitação</span></div>
              <div class="cartao-corpo">
                <nz-timeline>
                  @for (e of eventos(); track e.id) {
                    <nz-timeline-item [nzColor]="e.setorDestino ? 'blue' : e.tipo === 'INTEGRACAO_ERRO' ? 'red' : 'gray'">
                      <div class="timeline-evento">
                        <span class="quando">{{ e.dataHora | date: 'dd/MM/yyyy HH:mm' }} · {{ e.usuarioNome }}
                          @if (e.setorDestino) { · <nz-tag nzColor="blue">{{ e.setorOrigem ?? '—' }} → {{ e.setorDestino }}</nz-tag> }</span>
                        <span>{{ e.descricao }}</span>
                      </div>
                    </nz-timeline-item>
                  }
                </nz-timeline>
              </div></div>
          }
        }
      </div>
    } @else {
      <div class="pagina"><div class="cartao vazio"><nz-icon nzType="loading" />Carregando processo…</div></div>
    }
  `,
  styles: `
    .voltar { font-size: 13px; display: inline-flex; gap: 4px; align-items: center; margin-bottom: 6px; }
    .selos { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .proxima { border-left: 4px solid var(--bf-primaria); }
    .linha { display: flex; gap: 14px; align-items: center; }
    .icone { font-size: 22px; color: var(--bf-primaria); }
    .texto { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .abas { margin-bottom: -8px; }
    .ponto { margin-left: 6px; }
    .coluna { display: flex; flex-direction: column; gap: 10px; }
    .pequeno { font-size: 12px; }
    .requerimento { border-top: 1px solid var(--bf-borda); white-space: pre-wrap; }
    .comunicacao { border: 1px solid var(--bf-borda); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
    .linha-com { display: flex; gap: 8px; align-items: center; } .espaco { flex: 1; }
    .texto-com { white-space: pre-wrap; font-family: inherit; font-size: 13px; margin: 6px 0 0; background: #f8fafc; padding: 10px; border-radius: 4px; }
    @media (max-width: 700px) { .linha { flex-direction: column; align-items: flex-start; } }
  `,
})
export class ProcessoPage {
  private readonly api = inject(ApiService);
  private readonly menu = inject(MenuService);

  readonly id = input.required<string>();
  readonly d = signal<ProcessoDetalhe | null>(null);
  readonly eventos = signal<Evento[]>([]);
  readonly comunicacoes = signal<Comunicacao[]>([]);
  readonly abaAtual = signal('dados');
  readonly ocupado = signal(false);
  readonly especies = ESPECIES;
  readonly legado = 'sistema corporativo';
  readonly canal = 'canal eletrônico';
  readonly formasCiencia: Record<string, string> = { PORTAL: 'Pelo contribuinte no portal', PRESENCIAL: 'Presencial no Atendimento', DTE: 'Canal eletrônico (expressa)', TACITA: 'Tácita (decurso de prazo)' };

  readonly proxima = computed(() => PROXIMA[this.d()?.resumo.status ?? ''] ?? { texto: '', aba: 'dados' });
  readonly indice = computed(() => Math.max(0, this.d()?.abas.findIndex((a) => a.id === this.abaAtual()) ?? 0));

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api.processo(id).subscribe((d) => {
        this.d.set(d);
        const alvo = PROXIMA[d.resumo.status]?.aba;
        this.abaAtual.set(alvo && d.abas.find((a) => a.id === alvo)?.habilitada ? alvo : 'dados');
      });
    });
  }

  habilitada(aba: string) {
    return !!this.d()?.abas.find((a) => a.id === aba)?.habilitada;
  }

  selecionar(i: number) {
    const a = this.d()?.abas[i];
    if (a) this.irPara(a.id);
  }

  irPara(aba: string) {
    this.abaAtual.set(aba);
    const id = this.d()!.resumo.id;
    if (aba === 'historico') this.api.historico(id).subscribe((e) => this.eventos.set(e));
    if (aba === 'comunicacoes') this.api.comunicacoesProcesso(id).subscribe((c) => this.comunicacoes.set(c));
  }

  atualizar(d: ProcessoDetalhe) {
    const anterior = this.d()?.resumo.status;
    this.d.set(d);
    this.menu.atualizarContadores();
    if (anterior !== d.resumo.status) {
      const alvo = PROXIMA[d.resumo.status]?.aba;
      if (alvo && this.habilitada(alvo)) this.abaAtual.set(alvo);
    }
  }

  cienciaPresencial() {
    this.ocupado.set(true);
    this.api.cienciaPresencial(this.d()!.resumo.id).subscribe({ next: (d) => this.atualizar(d), complete: () => this.ocupado.set(false), error: () => this.ocupado.set(false) });
  }

  arquivar() {
    this.ocupado.set(true);
    this.api.arquivar(this.d()!.resumo.id).subscribe({ next: (d) => this.atualizar(d), complete: () => this.ocupado.set(false), error: () => this.ocupado.set(false) });
  }
}
