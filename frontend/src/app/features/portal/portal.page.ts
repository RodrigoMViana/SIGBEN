import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../../core/api.service';
import { MensagemService } from '../../core/mensagens';
import { InteressadoPortal, PainelPortal, Pendencia } from '../../core/models';
import { ESPECIES } from '../processos/processos.page';

const CHAVE = 'bf.portal.interessado';

/** Portal do contribuinte: o representante escolhe o interessado e vê pendências, processos e comunicações. */
@Component({
  selector: 'app-portal',
  imports: [FormsModule, RouterLink, DatePipe, NzButtonModule, NzIconModule, NzSelectModule, NzTagModule, NzTooltipModule],
  template: `
    <div class="pagina">
      <div class="pagina-cabecalho">
        <div><h1>Meus benefícios fiscais</h1><div class="subtitulo">Solicite benefícios, acompanhe a análise e registre a ciência das decisões.</div></div>
        @if (interessados().length > 1) {
          <div class="campo seletor"><label>Interessado</label>
            <nz-select [ngModel]="interessadoId()" (ngModelChange)="escolher($event)">
              @for (i of interessados(); track i.interessado.id) {
                <nz-option [nzValue]="i.interessado.id" [nzLabel]="i.interessado.razaoSocial + (i.pendencias ? ' · ' + i.pendencias + ' pendência(s)' : '')" />
              }
            </nz-select></div>
        }
      </div>

      @if (painel(); as p) {
        <div class="cartao identificacao">
          <div class="cartao-corpo linha">
            <div><strong>{{ p.interessado.razaoSocial }}</strong>
              <div class="suave">CNPJ {{ p.interessado.cnpj }} · IE {{ p.interessado.inscricaoEstadual }} · {{ p.interessado.atividade }}</div></div>
            <span class="espaco"></span>
            <button nz-button nzType="primary" [routerLink]="['/portal/solicitar', p.interessado.id]"><nz-icon nzType="plus" />Nova solicitação</button>
          </div>
        </div>

        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="warning" />Ações pendentes com você</span><span class="suave">{{ p.pendencias.length }}</span></div>
          <div class="lista">
            @for (x of p.pendencias; track x.id) {
              <div class="item pendencia">
                <nz-tag [nzColor]="x.tipo === 'Ciência' ? 'blue' : 'warning'">{{ x.tipo }}</nz-tag>
                <div class="texto"><div><strong>{{ x.titulo }}</strong></div><div class="suave pequeno">{{ x.contexto }}</div></div>
                @if (x.prazo) { <span class="prazo" [class.urgente]="(x.diasRestantes ?? 99) <= 5">até {{ x.prazo + 'T12:00:00' | date: 'dd/MM/yyyy' }} · {{ x.diasRestantes }} dia(s)</span> }
                <button nz-button nzType="primary" nzSize="small" (click)="agir(x)" [nzLoading]="ocupado() === x.id">{{ x.acao }}</button>
              </div>
            } @empty { <div class="vazio"><nz-icon nzType="check-circle" />Nenhuma ação pendente.</div> }
          </div>
        </div>

        <div class="cartao">
          <div class="cartao-titulo"><span><nz-icon nzType="solution" />Solicitações e benefícios</span></div>
          <div class="lista">
            @for (r of p.processos; track r.id) {
              <a class="item processo" [routerLink]="['/portal/processos', r.id]">
                <div class="texto"><div><span class="mono">{{ r.numero }}</span> · {{ r.beneficio }}</div>
                  <div class="suave pequeno">{{ especies[r.especie] }} · solicitado em {{ r.dataSolicitacao | date: 'dd/MM/yyyy' }}</div></div>
                <nz-tag [nzColor]="r.familia === 'CONTRIBUINTE' ? 'warning' : r.familia === 'CONCLUIDO' ? 'success' : 'blue'">{{ r.statusPortal }}</nz-tag>
                <nz-icon nzType="caret-right" class="suave" />
              </a>
            } @empty { <div class="vazio"><nz-icon nzType="inbox" />Nenhuma solicitação.</div> }
          </div>
        </div>

        <div class="grade grade-2">
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="message" />Comunicações oficiais</span></div>
            <div class="lista">
              @for (c of p.comunicacoes.slice(0, 8); track c.id) {
                <div class="item"><div class="texto"><div>{{ c.assunto }}</div><div class="suave pequeno">{{ c.enviadaEm | date: 'dd/MM/yyyy HH:mm' }}{{ c.numeroDte ? ' · ' + c.numeroDte : '' }}</div></div>
                  @if (c.cienciaEm) { <nz-tag nzColor="success">ciência {{ c.cienciaEm | date: 'dd/MM/yyyy' }}</nz-tag> } @else { <nz-tag nzColor="warning">sem ciência</nz-tag> }</div>
              } @empty { <div class="vazio">Nenhuma comunicação.</div> }
            </div>
          </div>
          <div class="cartao">
            <div class="cartao-titulo"><span><nz-icon nzType="safety-certificate" />Fruição direta na escrituração</span></div>
            <div class="cartao-corpo coluna">
              <span class="suave pequeno">Benefícios de caráter geral ou de aplicação direta: não há pedido a fazer, a fruição ocorre na Escrituração Fiscal Digital.</span>
              @for (b of p.fruicaoDireta; track b.beneficio.id) {
                @if (b.compativel) { <div><nz-icon nzType="check" class="ok" /> <strong>{{ b.beneficio.assunto }}</strong> <span class="suave pequeno">· {{ b.beneficio.modalidades.join(', ') }} · {{ b.beneficio.convenio }}</span></div> }
              }
            </div>
          </div>
        </div>
      } @else if (interessados().length === 0 && carregado()) {
        <div class="cartao vazio"><nz-icon nzType="team" />Seu usuário não está vinculado a nenhum interessado. Procure o Atendimento.</div>
      }
    </div>
  `,
  styles: `
    .seletor { min-width: 320px; }
    .linha { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; } .espaco { flex: 1; }
    .identificacao { border-left: 4px solid var(--bf-primaria); }
    .lista { display: flex; flex-direction: column; }
    .item { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--bf-borda); color: inherit; flex-wrap: wrap; }
    .item:first-child { border-top: none; }
    .processo:hover { background: #f8fafc; text-decoration: none; }
    .texto { flex: 1; min-width: 220px; } .pequeno { font-size: 12px; }
    .prazo { font-size: 12px; color: #475569; } .prazo.urgente { color: #b91c1c; font-weight: 600; }
    .coluna { display: flex; flex-direction: column; gap: 8px; } .ok { color: #16a34a; }
  `,
})
export class PortalPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly msg = inject(MensagemService);
  private readonly router = inject(Router);
  readonly interessados = signal<InteressadoPortal[]>([]);
  readonly interessadoId = signal<number | null>(null);
  readonly painel = signal<PainelPortal | null>(null);
  readonly carregado = signal(false);
  readonly ocupado = signal<string | null>(null);
  readonly especies = ESPECIES;

  ngOnInit() {
    this.api.interessadosPortal().subscribe((l) => {
      this.interessados.set(l);
      this.carregado.set(true);
      let salvo: number | null = null;
      try { salvo = Number(sessionStorage.getItem(CHAVE)) || null; } catch { /* sem armazenamento */ }
      const id = l.find((i) => i.interessado.id === salvo)?.interessado.id ?? l.find((i) => i.pendencias > 0)?.interessado.id ?? l[0]?.interessado.id;
      if (id) this.escolher(id);
    });
  }

  escolher(id: number) {
    this.interessadoId.set(id);
    try { sessionStorage.setItem(CHAVE, String(id)); } catch { /* sem armazenamento */ }
    this.api.painelPortal(id).subscribe((p) => this.painel.set(p));
  }

  agir(x: Pendencia) {
    if (x.tipo === 'Ciência' || x.tipo === 'Comunicação') {
      if (!x.comunicacaoId) { this.router.navigate(['/portal/processos', x.processoId]); return; }
      this.ocupado.set(x.id);
      this.api.cienciaComunicacao(x.comunicacaoId).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Ciência registrada', detail: 'A partir de agora correm os prazos.' });
          this.escolher(this.interessadoId()!);
          this.api.interessadosPortal().subscribe((l) => this.interessados.set(l));
        },
        complete: () => this.ocupado.set(null),
        error: () => this.ocupado.set(null),
      });
      return;
    }
    this.router.navigate(['/portal/processos', x.processoId]);
  }
}
