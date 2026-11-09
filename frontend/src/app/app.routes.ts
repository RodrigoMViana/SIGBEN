import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { autenticadoGuard, permissaoGuard } from './core/guards';
import { MenuService } from './core/menu.service';

const p = (...permissoes: string[]) => ({ canActivate: [permissaoGuard], data: { permissoes } });
const ACOES = ['PROCESSO_FORMALIZAR', 'INFORMACAO_FISCAL_EMITIR', 'PARECER_ELABORAR', 'ATO_ELABORAR', 'PARECER_HOMOLOGAR', 'ATO_PUBLICAR', 'CIENCIA_REGISTRAR', 'PROCESSO_ARQUIVAR'];

/** Rotas com carregamento sob demanda (lazy): o bundle inicial contém apenas login e shell. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', children: [], canActivate: [() => inject(Router).parseUrl(inject(MenuService).primeiraRota())] },
      { path: 'caixa', ...p(...ACOES), data: { permissoes: ACOES, modo: 'caixa' }, loadComponent: () => import('./features/processos/processos.page').then((m) => m.ProcessosPage) },
      { path: 'processos', ...p('PROCESSO_CONSULTAR'), data: { permissoes: ['PROCESSO_CONSULTAR'], modo: 'consulta' }, loadComponent: () => import('./features/processos/processos.page').then((m) => m.ProcessosPage) },
      { path: 'processos/:id', ...p('PROCESSO_CONSULTAR'), loadComponent: () => import('./features/processo/processo.page').then((m) => m.ProcessoPage) },
      { path: 'painel', ...p('DASHBOARD_VER'), loadComponent: () => import('./features/painel/painel.page').then((m) => m.PainelPage) },
      { path: 'catalogo', ...p('PROCESSO_CONSULTAR', 'CATALOGO_GERIR'), loadComponent: () => import('./features/catalogo/catalogo.page').then((m) => m.CatalogoPage) },
      { path: 'integracoes', ...p('INTEGRACAO_MONITORAR'), loadComponent: () => import('./features/integracao/integracoes.page').then((m) => m.IntegracoesPage) },
      { path: 'parametrizacoes', ...p('PARAMETRO_GERIR'), loadComponent: () => import('./features/parametros/parametros.page').then((m) => m.ParametrosPage) },
      { path: 'permissoes', ...p('ADMIN_PERMISSOES'), loadComponent: () => import('./features/permissoes/permissoes.page').then((m) => m.PermissoesPage) },
      { path: 'portal', ...p('PORTAL_CONTRIBUINTE'), loadComponent: () => import('./features/portal/portal.page').then((m) => m.PortalPage) },
      { path: 'portal/solicitar/:interessadoId', ...p('PORTAL_CONTRIBUINTE'), loadComponent: () => import('./features/portal/nova-solicitacao.page').then((m) => m.NovaSolicitacaoPage) },
      { path: 'portal/processos/:id', ...p('PORTAL_CONTRIBUINTE'), loadComponent: () => import('./features/portal/portal-processo.page').then((m) => m.PortalProcessoPage) },
      { path: 'sem-acesso', loadComponent: () => import('./features/login/sem-acesso.page').then((m) => m.SemAcessoPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
