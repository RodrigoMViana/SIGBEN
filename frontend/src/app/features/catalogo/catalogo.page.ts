import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MensagemService } from '../../core/mensagens';
import { BeneficioCatalogo, DocumentoExigido, TagCatalogo, Taxa, TextoPadrao, TipoConcessao } from '../../core/models';
import { StatusTagComponent } from '../../shared/ui';

const CONSEQUENCIA: Record<TipoConcessao, string> = {
  ATO_DECLARATORIO: 'O processo gera parecer, Ato Declaratório vinculado e publicação no Diário Oficial. A vigência começa na publicação.',
  PARECER_FISCAL: 'O processo gera parecer homologado pelo Secretário, sem ato nem publicação. As abas Ato Declaratório e Publicação passam a desabilitadas.',
  ESCRITURACAO_FISCAL: 'Fruição direta na escrituração, sem pedido individual: o benefício deixa de constar na lista de solicitações do portal.',
  PROCESSUAL: 'Tratamento processual, sem concessão individual: o benefício deixa de constar na lista de solicitações do portal.',
};

/** Catálogo de benefícios, taxas, documentos exigidos, textos padrão e tags. */
@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, CurrencyPipe, DatePipe, NzTabsModule, NzTableModule, NzTagModule, NzButtonModule, NzIconModule, NzModalModule, NzRadioModule,
    NzInputModule, NzInputNumberModule, NzAlertModule, NzCheckboxModule, StatusTagComponent],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho"><div><h1>Catálogo de benefícios</h1>
        <div class="subtitulo">Benefícios, Tipo de Concessão, alcance por CNAE, taxas, documentos exigidos e textos padrão. {{ gere() ? 'Alterações exigem justificativa e ficam auditadas.' : '' }}</div></div></div>
      <nz-tabs>
        <nz-tab nzTitle="Benefícios">
          <div class="cartao">
            <nz-table [nzData]="beneficios()" [nzFrontPagination]="false" nzSize="small">
              <thead><tr><th>Código</th><th class="col-nome">Benefício</th><th>Tipo de Concessão</th><th>Modalidades</th><th>Convênio</th><th>Alcance</th><th nzAlign="right">Em andamento</th><th nzAlign="right">Concessões</th>@if (gere()) { <th></th> }</tr></thead>
              <tbody>
                @for (b of beneficios(); track b.beneficio.id) {
                  <tr>
                    <td class="mono">{{ b.beneficio.codigo }}</td>
                    <td><div>{{ b.beneficio.assunto }}</div><div class="suave pequeno">{{ b.beneficio.norma }}</div></td>
                    <td><bf-status [valor]="b.beneficio.tipoConcessao" [rotulo]="b.beneficio.tipoConcessaoRotulo" />@if (!b.beneficio.ativo) { <nz-tag>inativo</nz-tag> }</td>
                    <td>{{ b.beneficio.modalidades.join(', ') || '—' }}</td>
                    <td><div>{{ b.beneficio.convenio }}</div><div class="suave pequeno">{{ b.beneficio.tipoConvenio }}</div></td>
                    <td>@for (a of b.beneficio.alcance; track a.rotulo) { <nz-tag>{{ a.rotulo }}</nz-tag> } @empty { <span class="suave">livre</span> }</td>
                    <td class="direita num">{{ b.processosEmAndamento }}</td><td class="direita num">{{ b.concessoes }}</td>
                    @if (gere()) { <td><button nz-button nzSize="small" (click)="editar(b)"><nz-icon nzType="edit" />Alterar</button></td> }
                  </tr>
                }
              </tbody>
            </nz-table>
          </div>
        </nz-tab>
        <nz-tab nzTitle="Taxas">
          <div class="cartao">
            <nz-table [nzData]="taxas()" [nzFrontPagination]="false" nzSize="small">
              <thead><tr><th>Espécie</th><th>Faixa</th><th nzAlign="right">Valor</th></tr></thead>
              <tbody>@for (t of taxas(); track t.id) { <tr><td>{{ t.especie }}</td><td>{{ t.faixa }}</td><td class="direita num">{{ t.isento ? 'isento' : (t.valor | currency: 'BRL') }}</td></tr> }</tbody>
            </nz-table>
          </div>
        </nz-tab>
        <nz-tab nzTitle="Documentos exigidos">
          <div class="cartao">
            <nz-table [nzData]="documentos()" [nzFrontPagination]="false" nzSize="small">
              <thead><tr><th>Documento</th><th>Obrigatório</th><th>Espécie</th></tr></thead>
              <tbody>@for (d of documentos(); track d.id) { <tr><td>{{ d.descricao }}</td><td>{{ d.obrigatorio ? 'sim' : 'opcional' }}</td><td>{{ d.especie ?? 'todas' }}</td></tr> }</tbody>
            </nz-table>
          </div>
        </nz-tab>
        <nz-tab nzTitle="Textos padrão">
          <div class="cartao">
            <nz-table [nzData]="textos()" [nzFrontPagination]="false" nzSize="small">
              <thead><tr><th>Texto padrão</th><th>Tipo</th><th>Versão</th><th>Tags</th><th>Atualizado</th><th></th></tr></thead>
              <tbody>
                @for (t of textos(); track t.id) {
                  <tr><td>{{ t.nome }}</td><td>{{ tipos[t.tipo] ?? t.tipo }}</td><td>{{ t.versaoTexto }}</td><td class="suave pequeno">{{ t.tags.length }}</td>
                    <td class="suave pequeno">{{ t.atualizadoEm ? (t.atualizadoEm | date: 'dd/MM/yyyy') + ' · ' + t.atualizadoPor : '—' }}</td>
                    <td><button nz-button nzSize="small" (click)="abrirTexto(t)"><nz-icon [nzType]="gere() ? 'edit' : 'eye'" />{{ gere() ? 'Editar' : 'Ver' }}</button></td></tr>
                }
              </tbody>
            </nz-table>
          </div>
        </nz-tab>
        <nz-tab nzTitle="Tags">
          <div class="cartao">
            <nz-table [nzData]="tags()" [nzFrontPagination]="false" nzSize="small">
              <thead><tr><th>Tag</th><th>Descrição</th><th>Natureza</th><th>Origem</th><th>Opções</th></tr></thead>
              <tbody>@for (t of tags(); track t.chave) { <tr><td class="mono">{{ '{{' + t.chave + '}}' }}</td><td>{{ t.descricao }}</td><td>{{ t.natureza.toLowerCase() }}</td><td>{{ t.origem }}</td><td class="suave pequeno">{{ t.opcoes.length || '—' }}</td></tr> }</tbody>
            </nz-table>
          </div>
        </nz-tab>
      </nz-tabs>
    </div>

    <nz-modal [nzVisible]="!!editando()" [nzTitle]="'Alterar ' + (editando()?.beneficio?.assunto ?? '')" (nzOnCancel)="editando.set(null)" [nzFooter]="rodape" nzWidth="40rem">
      <ng-container *nzModalContent>
        <div class="coluna">
          <div class="campo"><label>Tipo de Concessão</label>
            <nz-radio-group [(ngModel)]="tipo" class="tipos">
              <label nz-radio nzValue="ATO_DECLARATORIO">Ato Declaratório</label><label nz-radio nzValue="PARECER_FISCAL">Parecer Fiscal</label>
              <label nz-radio nzValue="ESCRITURACAO_FISCAL">Escrituração Fiscal</label><label nz-radio nzValue="PROCESSUAL">Processual</label>
            </nz-radio-group></div>
          <nz-alert [nzType]="tipo !== editando()?.beneficio?.tipoConcessao ? 'warning' : 'info'" nzShowIcon [nzMessage]="'Consequência: ' + tipo" [nzDescription]="consequencia()" />
          @if (tipo !== editando()?.beneficio?.tipoConcessao && (editando()?.processosEmAndamento ?? 0) > 0) {
            <nz-alert nzType="warning" nzShowIcon [nzMessage]="editando()!.processosEmAndamento + ' processo(s) em andamento mudam de caminho'" nzDescription="As abas e etapas desses processos passam a seguir o novo tipo." />
          }
          <div class="campo-linha">
            <div class="campo"><label>Prazo de fruição (meses)</label><nz-input-number [(ngModel)]="prazo" [nzMin]="1" /></div>
            <div class="campo largo"><label>Modalidades (separadas por ;)</label><input nz-input [(ngModel)]="modalidades" /></div>
          </div>
          <div class="campo-linha">
            <label nz-checkbox [(ngModel)]="exigeTermo">Exige termo de acordo assinado pela empresa antes do Ato Declaratório</label>
            <label nz-checkbox [(ngModel)]="exigeInstrucaoExterna">Exige instrução externa (Agência de Desenvolvimento e CONDI)</label>
          </div>
          <div class="campo"><label class="obrigatorio">Justificativa</label><textarea nz-input rows="2" [(ngModel)]="justificativa"></textarea></div>
        </div>
      </ng-container>
      <ng-template #rodape><button nz-button (click)="editando.set(null)">Cancelar</button>
        <button nz-button nzType="primary" [disabled]="!justificativa.trim()" (click)="salvar()">Salvar alteração</button></ng-template>
    </nz-modal>

    <nz-modal [nzVisible]="!!texto()" [nzTitle]="(texto()?.nome ?? '') + ' · versão ' + (texto()?.versaoTexto ?? '')" (nzOnCancel)="texto.set(null)" [nzFooter]="rodapeTexto" nzWidth="48rem">
      <ng-container *nzModalContent>
        <div class="coluna">
          <span class="suave pequeno">Tags são escritas entre chaves duplas, por exemplo {{ '{{razaoSocial}}' }}. Parágrafos são separados por linha em branco.</span>
          <textarea nz-input rows="14" [(ngModel)]="corpo" [disabled]="!gere()" class="mono"></textarea>
          @if (gere()) { <div class="campo"><label class="obrigatorio">Justificativa</label><input nz-input [(ngModel)]="justificativa" /></div> }
        </div>
      </ng-container>
      <ng-template #rodapeTexto><button nz-button (click)="texto.set(null)">Fechar</button>
        @if (gere()) { <button nz-button nzType="primary" [disabled]="!justificativa.trim() || !corpo.trim()" (click)="salvarTexto()">Salvar nova versão</button> }</ng-template>
    </nz-modal>
  `,
  styles: `
    .pequeno { font-size: 12px; }
    .coluna { display: flex; flex-direction: column; gap: 14px; }
    .tipos { display: flex; flex-wrap: wrap; gap: 4px; }
    .largo { flex: 1; min-width: 240px; }
  `,
})
export class CatalogoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly msg = inject(MensagemService);
  readonly gere = computed(() => this.auth.pode('CATALOGO_GERIR'));
  readonly beneficios = signal<BeneficioCatalogo[]>([]);
  readonly taxas = signal<Taxa[]>([]);
  readonly documentos = signal<DocumentoExigido[]>([]);
  readonly textos = signal<TextoPadrao[]>([]);
  readonly tags = signal<TagCatalogo[]>([]);
  readonly editando = signal<BeneficioCatalogo | null>(null);
  readonly texto = signal<TextoPadrao | null>(null);
  readonly tipos: Record<string, string> = { PARECER_FAVORAVEL: 'Parecer favorável', PARECER_DESFAVORAVEL: 'Parecer desfavorável', ATO_DECLARATORIO: 'Ato Declaratório', TERMO_ACORDO: 'Termo de acordo', COMUNICACAO: 'Comunicação' };
  tipo: TipoConcessao = 'ATO_DECLARATORIO';
  prazo: number | null = null;
  modalidades = '';
  exigeTermo = false;
  exigeInstrucaoExterna = false;
  justificativa = '';
  corpo = '';

  consequencia() {
    return CONSEQUENCIA[this.tipo];
  }

  ngOnInit() {
    this.carregar();
    this.api.taxas().subscribe((t) => this.taxas.set(t));
    this.api.documentosExigidos().subscribe((d) => this.documentos.set(d));
    this.api.textosPadrao().subscribe((t) => this.textos.set(t));
    this.api.tags().subscribe((t) => this.tags.set(t));
  }

  carregar() {
    this.api.beneficios().subscribe((b) => this.beneficios.set(b));
  }

  editar(b: BeneficioCatalogo) {
    this.tipo = b.beneficio.tipoConcessao;
    this.prazo = b.beneficio.prazoMeses;
    this.modalidades = b.beneficio.modalidades.join(';');
    this.exigeTermo = !!b.beneficio.exigeTermo;
    this.exigeInstrucaoExterna = !!b.beneficio.exigeInstrucaoExterna;
    this.justificativa = '';
    this.editando.set(b);
  }

  salvar() {
    const b = this.editando()!;
    this.api.alterarBeneficio(b.beneficio.id, { tipoConcessao: this.tipo, prazoMeses: this.prazo, modalidades: this.modalidades, exigeTermo: this.exigeTermo, exigeInstrucaoExterna: this.exigeInstrucaoExterna, justificativa: this.justificativa.trim() })
      .subscribe(() => {
        this.msg.add({ severity: 'success', summary: 'Benefício alterado', detail: 'A alteração foi registrada na auditoria.' });
        this.editando.set(null);
        this.carregar();
      });
  }

  abrirTexto(t: TextoPadrao) {
    this.corpo = t.corpo;
    this.justificativa = '';
    this.texto.set(t);
  }

  salvarTexto() {
    this.api.alterarTexto(this.texto()!.id, this.corpo, this.justificativa.trim()).subscribe((t) => {
      this.msg.add({ severity: 'success', summary: 'Texto padrão alterado', detail: `Nova versão ${t.versaoTexto}.` });
      this.texto.set(null);
      this.api.textosPadrao().subscribe((l) => this.textos.set(l));
    });
  }
}
