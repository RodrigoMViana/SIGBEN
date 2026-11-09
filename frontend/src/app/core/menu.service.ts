import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Contadores } from './models';

export interface ItemMenu {
  rotulo: string;
  /** Nome do ícone Ant Design (ver core/icones.ts). */
  icone: string;
  rota: string;
  permissoes: string[];
  contador?: keyof Contadores;
}

/**
 * Menu orientado a PERMISSÕES (não a perfis fixos): ao renomear perfis ou redistribuir
 * permissões em outro cliente, o menu se ajusta sem mudança de código.
 */
const ITENS: ItemMenu[] = [
  { rotulo: 'Minha caixa de trabalho', icone: 'inbox', rota: '/caixa', permissoes: ['PROCESSO_FORMALIZAR', 'INFORMACAO_FISCAL_EMITIR', 'PARECER_ELABORAR', 'ATO_ELABORAR', 'PARECER_HOMOLOGAR', 'ATO_PUBLICAR', 'CIENCIA_REGISTRAR', 'PROCESSO_ARQUIVAR', 'MANIFESTACAO_RESPONDER', 'RECURSO_ENCAMINHAR', 'PROCEDIMENTO_DECIDIR'], contador: 'caixa' },
  { rotulo: 'Painel gerencial', icone: 'dashboard', rota: '/painel', permissoes: ['DASHBOARD_VER'] },
  { rotulo: 'Consulta de processos', icone: 'file-search', rota: '/processos', permissoes: ['PROCESSO_CONSULTAR'] },
  { rotulo: 'Catálogo de benefícios', icone: 'bank', rota: '/catalogo', permissoes: ['PROCESSO_CONSULTAR', 'CATALOGO_GERIR'] },
  { rotulo: 'Integrações', icone: 'sync', rota: '/integracoes', permissoes: ['INTEGRACAO_MONITORAR'] },
  { rotulo: 'Parametrizações', icone: 'setting', rota: '/parametrizacoes', permissoes: ['PARAMETRO_GERIR'] },
  { rotulo: 'Permissões dos perfis', icone: 'lock', rota: '/permissoes', permissoes: ['ADMIN_PERMISSOES'] },
  { rotulo: 'Meus benefícios', icone: 'safety-certificate', rota: '/portal', permissoes: ['PORTAL_CONTRIBUINTE'] },
];

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly contadores = signal<Contadores | null>(null);

  readonly itens = computed(() => {
    this.auth.permissoes();
    return ITENS.filter((i) => this.auth.pode(...i.permissoes));
  });

  primeiraRota(): string {
    return this.itens()[0]?.rota ?? '/sem-acesso';
  }

  atualizarContadores() {
    if (!this.auth.autenticado() || this.auth.pode('PORTAL_CONTRIBUINTE') && !this.auth.pode('PROCESSO_CONSULTAR')) return;
    this.api.contadores().subscribe({ next: (c) => this.contadores.set(c), error: () => undefined });
  }
}
