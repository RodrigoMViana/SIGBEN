import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConfirmacaoService, MensagemService } from '../../core/mensagens';
import { Listas, ProcessoDetalhe, Setor } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';

const ESTILOS = `
  .coluna { display: flex; flex-direction: column; gap: 12px; }
  .lista { display: flex; flex-direction: column; }
  .item { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-top: 1px solid var(--bf-borda); flex-wrap: wrap; }
  .item:first-child { border-top: none; }
  .texto { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 3px; }
  .pequeno { font-size: 12px; } .espaco { flex: 1; }
  .resposta { background: #f8fafc; border-radius: 4px; padding: 8px 10px; font-size: 13px; white-space: pre-wrap; }
  .form { border-top: 1px solid var(--bf-borda); display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }
  .linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
  .texto-doc { white-space: pre-wrap; font-family: inherit; font-size: 13px; margin: 0; background: #f8fafc; padding: 12px; border-radius: 4px; }
  .sel { min-width: 220px; }
`;

/** Executa um comando que devolve o detalhe atualizado, com aviso de sucesso. */
function executar(msg: MensagemService, ocupado: { set(v: boolean): void }, obs: Observable<ProcessoDetalhe>,
                  titulo: string, fim: (d: ProcessoDetalhe) => void) {
  ocupado.set(true);
  obs.subscribe({
    next: (d) => { msg.add({ severity: 'success', summary: titulo }); fim(d); },
    error: () => ocupado.set(false),
    complete: () => ocupado.set(false),
  });
}

/** Diligências ao contribuinte, manifestações complementares de outros setores e instrução externa. */
@Component({
  selector: 'app-aba-diligencias',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzRadioModule, NzAlertModule, NzTooltipModule, StatusTagComponent],
  template: `
    @let a = d().acoes;
    @let dv = d().desvios;
    <div class="coluna">
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="solution" />Diligências ao contribuinte</span><span class="suave">solicitação e comunicação oficial na mesma ação</span></div>
        <div class="lista">
          @for (x of dv.diligencias; track x.id) {
            <div class="item">
              <div class="texto">
                <div><strong>{{ x.descricao }}</strong> <span class="suave">· {{ x.tipo === 'DOCUMENTO' ? 'documento' : 'esclarecimento' }}</span></div>
                <span class="suave pequeno">Aberta em {{ x.abertaEm | date: 'dd/MM/yyyy HH:mm' }} por {{ x.abertaPor }} · prazo {{ x.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }}</span>
                @if (x.resposta) { <div class="resposta">{{ x.resposta }}{{ x.respondidaEm ? ' — ' + (x.respondidaPor ?? '') + ', ' + (x.respondidaEm | date: 'dd/MM/yyyy HH:mm') : '' }}</div> }
              </div>
              <bf-status [valor]="x.situacao" [rotulo]="rotulos[x.situacao]" />
              @if (x.situacao === 'ABERTA' && a['CANCELAR_DILIGENCIA']; as c) {
                <button nz-button nzSize="small" [disabled]="!c.habilitada" nz-tooltip [nzTooltipTitle]="c.motivo" (click)="cancelar(x.id)">Cancelar</button>
              }
            </div>
          } @empty { <div class="cartao-corpo suave">Nenhuma diligência aberta neste processo.</div> }
        </div>
        @if (a['ABRIR_DILIGENCIA']; as x) {
          <div class="cartao-corpo form">
            <nz-radio-group [(ngModel)]="tipo" [nzDisabled]="!x.habilitada">
              <label nz-radio nzValue="DOCUMENTO">Solicitar documento</label><label nz-radio nzValue="ESCLARECIMENTO">Solicitar esclarecimento</label>
            </nz-radio-group>
            <div class="linha">
              <input nz-input [(ngModel)]="descricao" [disabled]="!x.habilitada" placeholder="O que o contribuinte deve apresentar" class="espaco" />
              <button nz-button nzType="primary" [disabled]="!x.habilitada || !descricao.trim()" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="abrir()">
                <nz-icon nzType="send" />Abrir diligência</button>
            </div>
            <span class="suave pequeno">O processo passa a aguardar o contribuinte, que recebe comunicação com prazo. Sem resposta no prazo, a solicitação pode ser indeferida.</span>
          </div>
        }
      </div>

      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="team" />Manifestações complementares</span><span class="suave">o parecer só é finalizado sem manifestação pendente</span></div>
        <div class="lista">
          @for (x of dv.manifestacoes; track x.id) {
            <div class="item">
              <div class="texto">
                <div><strong>{{ x.setor }}</strong> · {{ x.pergunta }}</div>
                <span class="suave pequeno">Solicitada em {{ x.solicitadaEm | date: 'dd/MM/yyyy' }} por {{ x.solicitadaPor }} · prazo {{ x.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }}</span>
                @if (x.resposta) { <div class="resposta">{{ x.resposta }} — {{ x.respondidaPor }}, {{ x.respondidaEm | date: 'dd/MM/yyyy HH:mm' }}</div> }
                @if (x.situacao === 'PENDENTE' && a['RESPONDER_MANIFESTACAO']?.habilitada && respondendo() === x.id) {
                  <textarea nz-input rows="3" [(ngModel)]="resposta" placeholder="Manifestação do setor"></textarea>
                  <div class="linha"><button nz-button (click)="respondendo.set(null)">Cancelar</button>
                    <button nz-button nzType="primary" [disabled]="!resposta.trim()" [nzLoading]="ocupado()" (click)="responder(x.id)">Registrar manifestação</button></div>
                }
              </div>
              <bf-status [valor]="x.situacao" [rotulo]="x.situacao === 'PENDENTE' ? 'aguardando' : 'respondida'" />
              @if (x.situacao === 'PENDENTE' && a['RESPONDER_MANIFESTACAO']?.habilitada && respondendo() !== x.id) {
                <button nz-button nzType="primary" nzSize="small" (click)="respondendo.set(x.id); resposta = ''">Responder</button>
              }
            </div>
          } @empty { <div class="cartao-corpo suave">Nenhuma manifestação solicitada. A análise correu com a Informação Fiscal como único subsídio de outro setor.</div> }
        </div>
        @if (a['SOLICITAR_MANIFESTACAO']; as x) {
          <div class="cartao-corpo form">
            <div class="linha">
              <nz-select [(ngModel)]="setorId" nzPlaceHolder="Setor" [nzDisabled]="!x.habilitada" class="sel">
                @for (s of setores(); track s.id) { <nz-option [nzValue]="s.id" [nzLabel]="s.sigla + ' — ' + s.nome" /> }
              </nz-select>
              <input nz-input [(ngModel)]="pergunta" [disabled]="!x.habilitada" placeholder="O que o setor deve esclarecer" class="espaco" />
              <button nz-button [disabled]="!x.habilitada || !setorId || !pergunta.trim()" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="solicitar()">
                <nz-icon nzType="plus" />Solicitar manifestação</button>
            </div>
          </div>
        }
      </div>

      @if (d().beneficio.exigeInstrucaoExterna || dv.instrucaoEnviadaEm) {
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="global" />Instrução externa (Agência de Desenvolvimento e CONDI)</span><span class="suave">o sistema acompanha, não executa</span></div>
          <div class="cartao-corpo coluna">
            <div class="dados">
              <div><div class="rotulo">Encaminhado em</div><div class="valor">{{ dv.instrucaoEnviadaEm ? (dv.instrucaoEnviadaEm | date: 'dd/MM/yyyy HH:mm') : '—' }}</div></div>
              <div><div class="rotulo">Deliberação</div><div class="valor">{{ dv.instrucaoResultado ? (dv.instrucaoResultado === 'FAVORAVEL' ? 'favorável' : 'desfavorável') : 'pendente' }}</div></div>
              <div><div class="rotulo">Detalhe</div><div class="valor">{{ dv.instrucaoDetalhe ?? '—' }}</div></div>
            </div>
            @if (a['ENCAMINHAR_INSTRUCAO']; as x) {
              <div class="linha"><button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="encaminhar()">
                <nz-icon nzType="send" />Encaminhar para instrução externa</button></div>
            }
            @if (a['REGISTRAR_INSTRUCAO']; as x) {
              <nz-radio-group [(ngModel)]="resultadoInstrucao" [nzDisabled]="!x.habilitada">
                <label nz-radio nzValue="FAVORAVEL">Deliberação favorável</label><label nz-radio nzValue="DESFAVORAVEL">Desfavorável</label>
              </nz-radio-group>
              <div class="linha">
                <input nz-input [(ngModel)]="detalheInstrucao" [disabled]="!x.habilitada" placeholder="Número, data e conclusão da deliberação" class="espaco" />
                <button nz-button nzType="primary" [disabled]="!x.habilitada || !resultadoInstrucao || !detalheInstrucao.trim()" nz-tooltip [nzTooltipTitle]="x.motivo"
                  [nzLoading]="ocupado()" (click)="registrarInstrucao()">Registrar retorno</button>
              </div>
              <span class="suave pequeno">A forma como o retorno da Agência e do CONDI chega ao sistema (registro manual ou integração) ainda será definida com a Secretaria.</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: ESTILOS,
})
export class AbaDiligenciasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  readonly setores = signal<Setor[]>([]);
  readonly respondendo = signal<number | null>(null);
  readonly rotulos: Record<string, string> = { ABERTA: 'aguardando resposta', RESPONDIDA: 'respondida', CANCELADA: 'cancelada' };
  tipo = 'DOCUMENTO';
  descricao = '';
  setorId: number | null = null;
  pergunta = '';
  resposta = '';
  resultadoInstrucao = '';
  detalheInstrucao = '';

  ngOnInit() {
    this.api.setores().subscribe((s) => this.setores.set(s.filter((x) => x.tipo === 'INTERNO')));
  }
  private id() {
    return this.d().resumo.id;
  }
  private fim = (d: ProcessoDetalhe) => this.atualizado.emit(d);

  abrir() {
    executar(this.msg, this.ocupado, this.api.abrirDiligencia(this.id(), this.tipo, this.descricao.trim()), 'Diligência aberta e comunicada ao contribuinte',
      (d) => { this.descricao = ''; this.fim(d); });
  }
  cancelar(did: number) {
    const motivo = prompt('Motivo do cancelamento da diligência:');
    if (motivo?.trim()) executar(this.msg, this.ocupado, this.api.cancelarDiligencia(this.id(), did, motivo.trim()), 'Diligência cancelada', this.fim);
  }
  solicitar() {
    executar(this.msg, this.ocupado, this.api.solicitarManifestacao(this.id(), this.setorId!, this.pergunta.trim()), 'Manifestação solicitada ao setor',
      (d) => { this.pergunta = ''; this.setorId = null; this.fim(d); });
  }
  responder(mid: number) {
    executar(this.msg, this.ocupado, this.api.responderManifestacao(this.id(), mid, this.resposta.trim()), 'Manifestação registrada',
      (d) => { this.respondendo.set(null); this.fim(d); });
  }
  encaminhar() {
    executar(this.msg, this.ocupado, this.api.encaminharInstrucao(this.id()), 'Encaminhado para instrução externa', this.fim);
  }
  registrarInstrucao() {
    executar(this.msg, this.ocupado, this.api.registrarInstrucao(this.id(), this.resultadoInstrucao, this.detalheInstrucao.trim()), 'Retorno da instância externa registrado', this.fim);
  }
}

/** Termo de acordo: minuta gerada do ato, envio à empresa, prazo e devolução assinada. */
@Component({
  selector: 'app-aba-termo',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzInputModule, NzInputNumberModule, NzAlertModule, NzTooltipModule],
  template: `
    @let a = d().acoes;
    @let dv = d().desvios;
    <div class="coluna">
      @if (d().resumo.status === 'TERMO_ACORDO') {
        <nz-alert nzType="warning" nzShowIcon nzMessage="O processo depende da empresa"
          nzDescription="O ato não pode ser concluído enquanto o termo de acordo não for devolvido assinado. É o único ponto do fluxo em que a Secretaria não controla o prazo." />
      }
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="file-done" />Acompanhamento do termo</span></div>
        <div class="cartao-corpo dados">
          <div><div class="rotulo">Encaminhado em</div><div class="valor">{{ dv.termoEnviadoEm ? (dv.termoEnviadoEm | date: 'dd/MM/yyyy HH:mm') : 'não enviado' }}</div></div>
          <div><div class="rotulo">Prazo</div><div class="valor">{{ dv.termoPrazo ? (dv.termoPrazo + 'T12:00:00' | date: 'dd/MM/yyyy') : '—' }}</div></div>
          <div><div class="rotulo">Assinatura da empresa</div><div class="valor">{{ dv.termoAssinadoEm ? 'devolvido em ' + (dv.termoAssinadoEm | date: 'dd/MM/yyyy HH:mm') : 'pendente' }}</div></div>
        </div>
        @if (a['ENVIAR_TERMO']; as x) {
          <div class="cartao-corpo form">
            <span class="suave">A minuta é gerada a partir das cláusulas do Ato Declaratório e das contrapartidas, disponibilizada no portal e comunicada à empresa com prazo.</span>
            <div class="linha"><button nz-button nzType="primary" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="enviar()">
              <nz-icon nzType="send" />Enviar termo de acordo à empresa</button></div>
          </div>
        }
        @if (a['PRORROGAR_TERMO']; as x) {
          <div class="cartao-corpo form">
            <div class="linha">
              <div class="campo"><label>Dias</label><nz-input-number [(ngModel)]="dias" [nzMin]="1" [nzMax]="60" [nzDisabled]="!x.habilitada" /></div>
              <input nz-input [(ngModel)]="justificativa" [disabled]="!x.habilitada" placeholder="Justificativa da prorrogação" class="espaco" />
              <button nz-button [disabled]="!x.habilitada || !justificativa.trim()" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="prorrogar()"><nz-icon nzType="calendar" />Prorrogar prazo</button>
            </div>
          </div>
        }
      </div>
      @if (dv.termoTexto) {
        <div class="cartao"><div class="cartao-titulo"><span><nz-icon nzType="form" />Minuta do termo de acordo</span></div>
          <div class="cartao-corpo"><pre class="texto-doc">{{ dv.termoTexto }}</pre></div></div>
      }
    </div>
  `,
  styles: ESTILOS,
})
export class AbaTermoComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  dias = 15;
  justificativa = '';

  enviar() {
    executar(this.msg, this.ocupado, this.api.enviarTermo(this.d().resumo.id), 'Termo de acordo enviado à empresa', (d) => this.atualizado.emit(d));
  }
  prorrogar() {
    executar(this.msg, this.ocupado, this.api.prorrogarTermo(this.d().resumo.id, this.dias, this.justificativa.trim()), 'Prazo do termo prorrogado',
      (d) => { this.justificativa = ''; this.atualizado.emit(d); });
  }
}

/** Decisão desfavorável (indeferimento, suspensão ou cassação), prazo recursal e recurso ao Conselho. */
@Component({
  selector: 'app-aba-recursos',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzInputModule, NzRadioModule, NzAlertModule, NzTooltipModule, StatusTagComponent],
  template: `
    @let a = d().acoes;
    @let dv = d().desvios;
    <div class="coluna">
      <nz-alert nzType="warning" nzShowIcon nzMessage="O recurso não tem efeito suspensivo" nzDescription="A decisão recorrida produz efeitos enquanto o recurso é apreciado pelo Conselho de Recursos Fiscais." />
      @if (dv.decisaoEm) {
        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="audit" />Decisão</span></div>
          <div class="cartao-corpo dados">
            <div><div class="rotulo">Decisão</div><div class="valor">{{ decisao() }}</div></div>
            <div><div class="rotulo">Motivo estruturado</div><div class="valor">{{ dv.motivoDecisao ?? '—' }}</div></div>
            <div><div class="rotulo">Decidida em</div><div class="valor">{{ dv.decisaoEm | date: 'dd/MM/yyyy HH:mm' }}</div></div>
            <div><div class="rotulo">Ciência do contribuinte</div><div class="valor">{{ dv.decisaoCienciaEm ? (dv.decisaoCienciaEm | date: 'dd/MM/yyyy HH:mm') : 'pendente' }}</div></div>
            <div><div class="rotulo">Prazo recursal</div><div class="valor">{{ dv.fimPrazoRecursal ? 'até ' + (dv.fimPrazoRecursal + 'T12:00:00' | date: 'dd/MM/yyyy') : 'corre da ciência' }}</div></div>
          </div>
          <div class="cartao-corpo linha">
            @if (a['REGISTRAR_CIENCIA']; as x) {
              <button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="ciencia()"><nz-icon nzType="check" />Registrar ciência presencial</button>
            }
            @if (d().resumo.status === 'INDEFERIDO' && a['ARQUIVAR']; as x) {
              <button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="arquivar()"><nz-icon nzType="inbox" />Arquivar (indeferimento definitivo)</button>
            }
          </div>
        </div>
      }
      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="flag" />Recursos ao Conselho de Recursos Fiscais</span></div>
        <div class="lista">
          @for (r of dv.recursos; track r.id) {
            <div class="item">
              <div class="texto">
                <div><strong>Recurso contra {{ decisoes[r.decisaoRecorrida] }}</strong> <span class="suave">· apresentado em {{ r.apresentadoEm | date: 'dd/MM/yyyy' }} por {{ r.apresentadoPor }}</span></div>
                <div class="resposta">{{ r.razoes }}</div>
                <span class="suave pequeno">{{ r.encaminhadoEm ? 'Encaminhado ao Conselho em ' + (r.encaminhadoEm | date: 'dd/MM/yyyy') : 'Aguardando encaminhamento ao Conselho' }}
                  {{ r.resultado ? ' · acórdão ' + r.numeroAcordao + ' em ' + (r.decididoEm | date: 'dd/MM/yyyy') : '' }}</span>
              </div>
              <bf-status [valor]="r.resultado ?? 'PENDENTE'" [rotulo]="r.resultado === 'PROVIDO' ? 'provido' : r.resultado === 'NAO_PROVIDO' ? 'não provido' : 'em apreciação'" />
            </div>
          } @empty { <div class="cartao-corpo suave">Nenhum recurso apresentado.</div> }
        </div>
        @if (a['ENCAMINHAR_RECURSO']; as x) {
          <div class="cartao-corpo form">
            <div class="linha"><button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" [nzLoading]="ocupado()" (click)="encaminhar()">
              <nz-icon nzType="send" />Encaminhar ao Conselho</button></div>
            @if (a['DECIDIR_RECURSO']?.habilitada) {
              <nz-radio-group [(ngModel)]="resultado"><label nz-radio nzValue="PROVIDO">Recurso provido</label><label nz-radio nzValue="NAO_PROVIDO">Não provido</label></nz-radio-group>
              <div class="linha">
                <input nz-input [(ngModel)]="acordao" placeholder="Número do acórdão" class="sel" />
                <input nz-input [(ngModel)]="fundamento" placeholder="Fundamento (opcional)" class="espaco" />
                <button nz-button nzType="primary" [disabled]="!resultado || !acordao.trim()" [nzLoading]="ocupado()" (click)="decidir()">Registrar decisão do Conselho</button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: ESTILOS,
})
export class AbaRecursosComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  readonly decisoes: Record<string, string> = { INDEFERIMENTO: 'o indeferimento', SUSPENSAO: 'a suspensão', CASSACAO: 'a cassação' };
  readonly decisao = computed(() => {
    const r = this.d().desvios.recursos.at(-1)?.decisaoRecorrida;
    const s = this.d().resumo.status;
    return s === 'INDEFERIDO' || r === 'INDEFERIMENTO' ? 'Indeferimento da solicitação' : s === 'CASSADO' || r === 'CASSACAO' ? 'Cassação do benefício' : 'Suspensão do benefício';
  });
  resultado = '';
  acordao = '';
  fundamento = '';

  private fim = (d: ProcessoDetalhe) => this.atualizado.emit(d);
  ciencia() {
    executar(this.msg, this.ocupado, this.api.cienciaPresencial(this.d().resumo.id), 'Ciência da decisão registrada', this.fim);
  }
  arquivar() {
    executar(this.msg, this.ocupado, this.api.arquivar(this.d().resumo.id), 'Processo arquivado', this.fim);
  }
  encaminhar() {
    executar(this.msg, this.ocupado, this.api.encaminharRecurso(this.d().resumo.id), 'Recurso encaminhado ao Conselho', this.fim);
  }
  decidir() {
    this.confirmacao.confirm({
      header: 'Registrar decisão do Conselho',
      message: this.resultado === 'PROVIDO' ? 'Recurso provido: a decisão recorrida é revertida. Confirma?' : 'Recurso não provido: a decisão recorrida é mantida. Confirma?',
      accept: () => executar(this.msg, this.ocupado, this.api.decidirRecurso(this.d().resumo.id, this.resultado, this.acordao.trim(), this.fundamento.trim()),
        'Decisão do Conselho registrada', this.fim),
    });
  }
}

/** Procedimentos de suspensão e cassação do benefício concedido (notificação prévia, decisão, restabelecimento). */
@Component({
  selector: 'app-procedimentos',
  imports: [FormsModule, DatePipe, NzButtonModule, NzIconModule, NzInputModule, NzInputNumberModule, NzSelectModule, NzModalModule, NzAlertModule, NzTooltipModule, StatusTagComponent],
  template: `
    @let a = d().acoes;
    <div class="cartao">
      <div class="cartao-titulo"><span><nz-icon nzType="safety-certificate" />Suspensão e cassação</span><span class="suave">antes da decisão, o contribuinte é notificado com prazo para regularizar</span></div>
      <div class="lista">
        @for (x of d().desvios.procedimentos; track x.id) {
          <div class="item">
            <div class="texto">
              <div><strong>{{ x.tipo === 'CASSACAO' ? 'Cassação' : 'Suspensão' }}</strong> · {{ x.motivo }}</div>
              <span class="suave pequeno">Iniciado em {{ x.abertoEm | date: 'dd/MM/yyyy' }} por {{ x.abertoPor }} · prazo para regularizar até {{ x.prazoRegularizacao + 'T12:00:00' | date: 'dd/MM/yyyy' }}
                {{ x.decididoEm ? ' · decidido em ' + (x.decididoEm | date: 'dd/MM/yyyy') + ' por ' + x.decididoPor : '' }}</span>
              <div class="resposta">{{ x.fundamentacao }}{{ x.encerramento ? ' — Encerramento: ' + x.encerramento : '' }}</div>
            </div>
            <bf-status [valor]="x.situacao" [rotulo]="rotulos[x.situacao]" />
          </div>
        } @empty { <div class="cartao-corpo suave">Nenhum procedimento de suspensão ou cassação.</div> }
      </div>
      <div class="cartao-corpo linha">
        @if (a['ABRIR_SUSPENSAO']; as x) { <button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="iniciar('SUSPENSAO')"><nz-icon nzType="pause-circle" />Iniciar suspensão</button> }
        @if (a['ABRIR_CASSACAO']; as x) { <button nz-button nzDanger [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="iniciar('CASSACAO')"><nz-icon nzType="stop" />Iniciar cassação</button> }
        @if (a['DECIDIR_PROCEDIMENTO']; as x) { <button nz-button nzType="primary" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="decidir()"><nz-icon nzType="audit" />Registrar decisão</button> }
        @if (a['ARQUIVAR_PROCEDIMENTO']; as x) { <button nz-button [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="arquivarProc()">Arquivar procedimento (regularizado)</button> }
        @if (a['RESTABELECER']; as x) { <button nz-button nzType="primary" [disabled]="!x.habilitada" nz-tooltip [nzTooltipTitle]="x.motivo" (click)="restabelecer()"><nz-icon nzType="play-circle" />Restabelecer benefício</button> }
      </div>
    </div>

    <nz-modal [nzVisible]="!!tipo()" [nzTitle]="tipo() === 'CASSACAO' ? 'Iniciar cassação do benefício' : 'Iniciar suspensão do benefício'" (nzOnCancel)="tipo.set(null)" [nzFooter]="rodape" nzWidth="38rem">
      <ng-container *nzModalContent>
        <div class="coluna">
          <nz-alert [nzType]="tipo() === 'CASSACAO' ? 'error' : 'warning'" nzShowIcon [nzMessage]="tipo() === 'CASSACAO'
            ? 'A cassação é irreversível e gera impedimento de pleitear novos incentivos por período determinado.'
            : 'Decidida a suspensão, abre-se um intervalo no histórico de vigência, encerrado pelo restabelecimento.'" />
          <div class="campo"><label class="obrigatorio">Motivo estruturado</label>
            <nz-select [(ngModel)]="motivo">@for (m of listas()?.motivosProcedimento ?? []; track m) { <nz-option [nzValue]="m" [nzLabel]="m" /> }</nz-select></div>
          <div class="campo"><label class="obrigatorio">Fundamentação</label><textarea nz-input rows="3" [(ngModel)]="fundamentacao"></textarea></div>
          <div class="campo"><label>Prazo para regularizar (dias)</label><nz-input-number [(ngModel)]="prazo" [nzMin]="1" [nzMax]="90" /></div>
        </div>
      </ng-container>
      <ng-template #rodape>
        <button nz-button (click)="tipo.set(null)">Cancelar</button>
        <button nz-button nzType="primary" [nzDanger]="tipo() === 'CASSACAO'" [disabled]="!motivo || !fundamentacao.trim()" (click)="abrir()">Enviar notificação prévia</button>
      </ng-template>
    </nz-modal>
  `,
  styles: ESTILOS,
})
export class ProcedimentosComponent {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  readonly d = input.required<ProcessoDetalhe>();
  readonly atualizado = output<ProcessoDetalhe>();
  readonly ocupado = signal(false);
  readonly tipo = signal<'SUSPENSAO' | 'CASSACAO' | null>(null);
  readonly listas = signal<Listas | null>(null);
  readonly rotulos: Record<string, string> = { ABERTO: 'em curso', DECIDIDO: 'decidido', ARQUIVADO: 'arquivado', RESTABELECIDO: 'restabelecido' };
  motivo = '';
  fundamentacao = '';
  prazo = 15;

  private fim = (d: ProcessoDetalhe) => this.atualizado.emit(d);
  iniciar(t: 'SUSPENSAO' | 'CASSACAO') {
    this.api.listas().subscribe((l) => { this.listas.set(l); this.prazo = l.prazoRegularizacao; });
    this.motivo = '';
    this.fundamentacao = '';
    this.tipo.set(t);
  }
  abrir() {
    executar(this.msg, this.ocupado, this.api.abrirProcedimento(this.d().resumo.id, { tipo: this.tipo()!, motivo: this.motivo, fundamentacao: this.fundamentacao.trim(), prazoDias: this.prazo }),
      'Notificação prévia enviada ao contribuinte', (d) => { this.tipo.set(null); this.fim(d); });
  }
  decidir() {
    const x = this.d().desvios.procedimentos.find((p) => p.situacao === 'ABERTO');
    this.confirmacao.confirm({
      header: x?.tipo === 'CASSACAO' ? 'Confirmar a cassação' : 'Confirmar a suspensão',
      message: x?.tipo === 'CASSACAO' ? 'Ação irreversível: o benefício passa a cassado e a vigência é encerrada. Cabe recurso em 30 dias da ciência, sem efeito suspensivo.'
        : 'O benefício fica suspenso até o restabelecimento. Cabe recurso em 30 dias da ciência.',
      acceptLabel: x?.tipo === 'CASSACAO' ? 'Cassar definitivamente' : 'Suspender',
      perigo: x?.tipo === 'CASSACAO',
      accept: () => executar(this.msg, this.ocupado, this.api.decidirProcedimento(this.d().resumo.id), 'Decisão registrada e comunicada', this.fim),
    });
  }
  arquivarProc() {
    const m = prompt('Por que o procedimento foi encerrado sem decisão? (ex.: regularização comprovada)');
    if (m?.trim()) executar(this.msg, this.ocupado, this.api.arquivarProcedimento(this.d().resumo.id, m.trim()), 'Procedimento arquivado', this.fim);
  }
  restabelecer() {
    const m = prompt('Fundamento do restabelecimento:');
    if (m?.trim()) executar(this.msg, this.ocupado, this.api.restabelecer(this.d().resumo.id, m.trim()), 'Benefício restabelecido', this.fim);
  }
}
