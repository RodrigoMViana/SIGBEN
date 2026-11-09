import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ApiService } from '../../core/api.service';
import { MensagemService } from '../../core/mensagens';
import { BeneficioPortal, Especie, TaxaCalculada } from '../../core/models';
import { fmtMoeda, lerMoeda } from '../../shared/ui';

/** Nova solicitação: benefício, espécie e renúncia estimada (que define a faixa da taxa). */
@Component({
  selector: 'app-nova-solicitacao',
  imports: [FormsModule, RouterLink, CurrencyPipe, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzInputNumberModule, NzTagModule, NzAlertModule],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho">
        <div><a routerLink="/portal" class="voltar"><nz-icon nzType="arrow-left" /> Voltar</a>
          <h1>Nova solicitação de benefício</h1>
          <div class="subtitulo">Escolha o benefício e a espécie. Em seguida você anexa os documentos exigidos e envia para formalização.</div></div>
      </div>

      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="bank" />1. Benefício</span><span class="suave">somente benefícios que exigem autorização individual</span></div>
        <div class="lista">
          @for (b of beneficios(); track b.beneficio.id) {
            <label class="item" [class.marcado]="beneficioId === b.beneficio.id">
              <input type="radio" name="b" [value]="b.beneficio.id" [(ngModel)]="beneficioId" />
              <div class="texto"><div><strong>{{ b.beneficio.assunto }}</strong> <span class="suave">· {{ b.beneficio.convenio }}</span></div>
                <div class="suave pequeno">{{ b.beneficio.modalidades.join(', ') }} · {{ b.beneficio.efeitos }}</div></div>
              <nz-tag [nzColor]="b.beneficio.geraAto ? 'blue' : 'purple'">{{ b.beneficio.tipoConcessaoRotulo }}</nz-tag>
              @if (!b.compativel) { <nz-tag nzColor="warning">atividade fora do alcance</nz-tag> }
            </label>
          }
        </div>
      </div>
      @if (selecionado() && !selecionado()!.compativel) {
        <nz-alert nzType="warning" nzShowIcon nzMessage="A atividade econômica (CNAE) do interessado não está no alcance deste benefício"
          nzDescription="A solicitação pode ser feita, mas a divergência será avaliada na análise jurídica e pode levar ao indeferimento." />
      }

      <div class="cartao">
        <div class="cartao-titulo"><span><nz-icon nzType="solution" />2. Espécie e valor</span></div>
        <div class="cartao-corpo coluna">
          <nz-radio-group [(ngModel)]="especie" (ngModelChange)="calcular()">
            <label nz-radio nzValue="CONCESSAO">Concessão</label><label nz-radio nzValue="PRORROGACAO">Prorrogação</label><label nz-radio nzValue="ALTERACAO">Alteração</label>
          </nz-radio-group>
          <div class="campo-linha">
            <div class="campo"><label [class.obrigatorio]="especie === 'CONCESSAO'">Renúncia estimada (valor pretendido)</label>
              <nz-input-number [(ngModel)]="valor" (ngModelChange)="calcular()" [nzFormatter]="fmt" [nzParser]="ler" [nzMin]="0" class="valor" /></div>
            @if (taxa(); as t) {
              <div class="taxa"><span class="suave pequeno">Taxa de serviço</span><strong>{{ t.isento ? 'isenta' : (t.valor | currency: 'BRL') }}</strong><span class="suave pequeno">{{ t.faixa }}</span></div>
            }
          </div>
          <div class="campo"><label>Requerimento fundamentado</label>
            <textarea nz-input rows="3" [(ngModel)]="requerimento" placeholder="Descreva o motivo da solicitação e o projeto beneficiado"></textarea></div>
        </div>
      </div>

      <div class="barra-acoes"><span class="espaco"></span>
        <button nz-button routerLink="/portal">Cancelar</button>
        <button nz-button nzType="primary" [disabled]="!beneficioId || (especie === 'CONCESSAO' && !valor)" [nzLoading]="enviando()" (click)="criar()">
          Continuar para os documentos<nz-icon nzType="caret-right" /></button>
      </div>
    </div>
  `,
  styles: `
    .voltar { font-size: 13px; display: inline-flex; gap: 4px; align-items: center; margin-bottom: 6px; }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); cursor: pointer; flex-wrap: wrap; }
    .item:first-child { border-top: none; } .item.marcado { background: color-mix(in srgb, var(--bf-primaria) 6%, white); }
    .texto { flex: 1; min-width: 220px; } .pequeno { font-size: 12px; } .espaco { flex: 1; }
    .coluna { display: flex; flex-direction: column; gap: 14px; }
    .valor { width: 240px; }
    .taxa { display: flex; flex-direction: column; padding: 8px 14px; border: 1px solid var(--bf-borda); border-radius: 6px; background: #f8fafc; }
  `,
})
export class NovaSolicitacaoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly router = inject(Router);
  readonly interessadoId = input.required<string>();
  readonly beneficios = signal<BeneficioPortal[]>([]);
  readonly taxa = signal<TaxaCalculada | null>(null);
  readonly enviando = signal(false);
  readonly fmt = fmtMoeda;
  readonly ler = lerMoeda;
  beneficioId: number | null = null;
  especie: Especie = 'CONCESSAO';
  valor: number | null = null;
  requerimento = '';
  readonly selecionado = computed(() => this.beneficios().find((b) => b.beneficio.id === this.beneficioId) ?? null);

  ngOnInit() {
    this.api.beneficiosPortal(Number(this.interessadoId())).subscribe((b) => this.beneficios.set(b));
    this.calcular();
  }

  calcular() {
    this.api.taxa(this.especie, this.valor).subscribe({ next: (t) => this.taxa.set(t), error: () => this.taxa.set(null) });
  }

  criar() {
    this.enviando.set(true);
    this.api.solicitar(Number(this.interessadoId()), { beneficioId: this.beneficioId!, especie: this.especie, valorPretendido: this.valor, requerimento: this.requerimento.trim() })
      .subscribe({
        next: (p) => {
          this.msg.add({ severity: 'success', summary: 'Solicitação aberta', detail: `Processo ${p.resumo.numero}. Anexe os documentos exigidos e envie.` });
          this.router.navigate(['/portal/processos', p.resumo.id]);
        },
        error: () => this.enviando.set(false),
      });
  }
}
