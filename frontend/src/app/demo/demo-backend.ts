/**
 * Back-end SIMULADO da versão de demonstração (GitHub Pages).
 *
 * Reproduz, em memória e de forma simplificada, as regras da API Java (máquina de estados do processo,
 * caixa de trabalho por permissão, tags das peças, portal do contribuinte e fila de integração) para que o
 * front-end funcione sem servidor. Os dados iniciais vêm de `demo/dados.json` (massa fictícia gerada por
 * scripts/gerar-dados-demo.mjs). Alterações valem até recarregar a página.
 * NÃO é usado no build normal: só entra com `ng build --configuration demo`.
 */
import type {
  AbaProcesso, Acao, BeneficioCatalogo, Comunicacao, ConfiguracaoCliente, Desvios, DocumentoExigido, EditorPeca, Evento, ItemDocumental, Listas,
  Parametro, ParametroHistorico, PecaResumo, PerfilDetalhe, Permissao, ProcessoDetalhe, ProcessoResumo, Setor, Solicitacao,
  StatusProcesso, TagCatalogo, TagPeca, Taxa, TextoPadrao, UsuarioAdmin, UsuarioResumo,
} from '../core/models';

export interface DadosDemo {
  config: ConfiguracaoCliente;
  usuarios: UsuarioAdmin[];
  perfis: PerfilDetalhe[];
  permissoes: Permissao[];
  setores: Setor[];
  responsaveis: UsuarioResumo[];
  beneficios: BeneficioCatalogo[];
  taxas: Taxa[];
  documentosExigidos: DocumentoExigido[];
  textos: TextoPadrao[];
  tags: TagCatalogo[];
  parametros: Parametro[];
  historicoParametros: ParametroHistorico[];
  processos: Record<number, ProcessoDetalhe>;
  historicos: Record<number, Evento[]>;
  comunicacoes: Record<number, Comunicacao[]>;
  editores: Record<number, { parecer?: EditorPeca; ato?: EditorPeca }>;
  representantes: Record<string, number[]>;
  setorDe: Record<string, string | null>;
  solicitacoes: Solicitacao[];
  listas: Listas;
}

export class ErroDemo {
  constructor(readonly status: number, readonly title: string, readonly detail: string) {}
}

export interface Requisicao {
  metodo: string;
  caminho: string;
  params: URLSearchParams;
  corpo: any;
  token: string | null;
  perfil: string | null;
}

type Papel = 'ATENDIMENTO' | 'FISCALIZACAO' | 'TRIBUTACAO' | 'GABINETE' | 'MONITORAMENTO' | 'RECURSO' | 'INSTRUCAO_EXTERNA';
const ST: Record<StatusProcesso, [string, string, ProcessoResumo['familia'], Papel, string | null]> = {
  EM_FORMALIZACAO: ['Em formalização pelo contribuinte', 'Ação pendente com você', 'CONTRIBUINTE', 'ATENDIMENTO', null],
  RECEBIDO: ['Recebido — em formalização no Atendimento', 'Em análise', 'SEFAZ', 'ATENDIMENTO', 'PROCESSO_FORMALIZAR'],
  INFORMACAO_FISCAL: ['Aguardando Informação Fiscal', 'Em análise', 'SEFAZ', 'FISCALIZACAO', 'INFORMACAO_FISCAL_EMITIR'],
  ANALISE_JURIDICA: ['Em análise jurídica', 'Em análise', 'SEFAZ', 'TRIBUTACAO', 'PARECER_ELABORAR'],
  PARECER_ELABORACAO: ['Parecer em elaboração', 'Em análise', 'SEFAZ', 'TRIBUTACAO', 'PARECER_ELABORAR'],
  ATO_ELABORACAO: ['Ato Declaratório em elaboração', 'Em análise', 'SEFAZ', 'TRIBUTACAO', 'ATO_ELABORAR'],
  HOMOLOGACAO: ['Aguardando homologação do Secretário', 'Em análise', 'SEFAZ', 'GABINETE', 'PARECER_HOMOLOGAR'],
  PUBLICACAO: ['Aguardando publicação no Diário Oficial', 'Em análise', 'SEFAZ', 'GABINETE', 'ATO_PUBLICAR'],
  CIENCIA_PENDENTE: ['Concedido · aguardando ciência', 'Deferido · registre a ciência', 'CONCLUIDO', 'ATENDIMENTO', 'CIENCIA_REGISTRAR'],
  ARQUIVAMENTO_PENDENTE: ['Ciência registrada · aguardando arquivamento', 'Deferido', 'CONCLUIDO', 'TRIBUTACAO', 'PROCESSO_ARQUIVAR'],
  CONCEDIDO_ARQUIVADO: ['Concedido · processo arquivado', 'Deferido', 'CONCLUIDO', 'MONITORAMENTO', null],
  VIGENTE: ['Vigente', 'Deferido · vigente', 'CONCLUIDO', 'MONITORAMENTO', null],
  DILIGENCIA: ['Aguardando resposta de diligência', 'Ação pendente com você', 'CONTRIBUINTE', 'TRIBUTACAO', null],
  MANIFESTACAO: ['Aguardando manifestação complementar', 'Em análise', 'SEFAZ', 'TRIBUTACAO', 'MANIFESTACAO_RESPONDER'],
  INSTRUCAO_EXTERNA: ['Aguardando instrução externa (Agência/CONDI)', 'Em análise', 'EXTERNO', 'INSTRUCAO_EXTERNA', 'PARECER_ELABORAR'],
  TERMO_ACORDO: ['Aguardando termo de acordo assinado pela empresa', 'Ação pendente com você', 'CONTRIBUINTE', 'TRIBUTACAO', null],
  INDEFERIDO: ['Indeferido', 'Indeferido', 'DESFAVORAVEL', 'TRIBUTACAO', null],
  RECURSO: ['Recurso no Conselho de Recursos Fiscais', 'Recurso em apreciação', 'EXTERNO', 'TRIBUTACAO', 'RECURSO_ENCAMINHAR'],
  SUSPENSO: ['Benefício suspenso', 'Suspenso', 'DESFAVORAVEL', 'MONITORAMENTO', null],
  CASSADO: ['Cassado', 'Cassado', 'DESFAVORAVEL', 'MONITORAMENTO', null],
  ARQUIVADO: ['Arquivado', 'Encerrado', 'ENCERRADO', 'TRIBUTACAO', null],
};
const CARTEIRA: StatusProcesso[] = ['ANALISE_JURIDICA', 'PARECER_ELABORACAO', 'ATO_ELABORACAO'];
const PAUSA_DA_ANALISE: StatusProcesso[] = ['DILIGENCIA', 'MANIFESTACAO', 'INSTRUCAO_EXTERNA', 'TERMO_ACORDO'];
const CONCEDIDOS: StatusProcesso[] = ['CIENCIA_PENDENTE', 'ARQUIVAMENTO_PENDENTE', 'CONCEDIDO_ARQUIVADO', 'VIGENTE'];
const FORA_DO_FLUXO: StatusProcesso[] = ['EM_FORMALIZACAO', ...CONCEDIDOS, 'DILIGENCIA', 'TERMO_ACORDO', 'INDEFERIDO', 'SUSPENSO', 'CASSADO', 'ARQUIVADO'];
const EM_FRUICAO: StatusProcesso[] = ['VIGENTE', 'CONCEDIDO_ARQUIVADO'];
const DECISOES: StatusProcesso[] = ['INDEFERIDO', 'SUSPENSO', 'CASSADO'];
const desviosVazios = (): Desvios => ({ statusRetorno: null, motivoDecisao: null, decisaoEm: null, decisaoCienciaEm: null, fimPrazoRecursal: null, termoEnviadoEm: null,
  termoPrazo: null, termoAssinadoEm: null, termoTexto: null, instrucaoEnviadaEm: null, instrucaoResultado: null, instrucaoDetalhe: null,
  diligencias: [], manifestacoes: [], recursos: [], procedimentos: [] });
const SENHA_DEMO = '123456';
const TAG = /\{\{\s*([a-zA-Z0-9_]+)\s*}}/g;

const agora = () => new Date().toISOString().slice(0, 19);
const hoje = () => new Date().toISOString().slice(0, 10);
const somarDias = (iso: string, dias: number) => { const d = new Date(iso.slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const somarMeses = (iso: string, meses: number) => { const d = new Date(iso.slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + meses); return d.toISOString().slice(0, 10); };
const dias = (desde: string | null) => (desde ? Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86_400_000)) : 0);
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const br = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const negocio = (m: string) => new ErroDemo(422, 'Regra de negócio', m);

function paginar<T>(lista: T[], p: URLSearchParams, padrao = 25) {
  const pagina = Number(p.get('pagina') ?? 0);
  const tamanho = Number(p.get('tamanho') ?? padrao);
  return { itens: lista.slice(pagina * tamanho, pagina * tamanho + tamanho), total: lista.length, pagina, tamanho };
}

/** CNAE alcançado pelo benefício, a partir do rótulo do alcance ("Divisões 10 a 33", "Grupo 35.1"). */
function alcanca(alcance: { rotulo: string }[], cnaes: string[]) {
  if (!alcance.length) return true;
  return cnaes.some((c) => alcance.some((a) => {
    const g = a.rotulo.match(/^Grupo (.+)$/);
    if (g) return c.startsWith(g[1]);
    const n = a.rotulo.match(/(\d+)(?: a (\d+))?$/);
    if (!n) return false;
    const div = Number(c.slice(0, 2));
    return div >= Number(n[1]) && div <= Number(n[2] ?? n[1]);
  }));
}

export class DemoBackend {
  private seq = 900_000;
  private seqNumero = 148;
  private seqDte = 950;
  /** Valores informados nas tags editáveis: processo → tipo da peça → chave → valor. */
  private valores: Record<number, Record<string, Record<string, string>>> = {};
  private modelos: Record<number, Record<string, number>> = {};
  /** Situação do benefício antes do procedimento de suspensão/cassação (para restabelecer ou prover recurso). */
  private anteriorProc: Record<number, StatusProcesso> = {};

  constructor(private readonly d: DadosDemo) {
    for (const [pid, eds] of Object.entries(d.editores)) {
      for (const [tipo, e] of Object.entries(eds) as [string, EditorPeca][]) {
        (this.valores[+pid] ??= {})[tipo] = Object.fromEntries(e.tags.filter((t) => t.editavel && t.valor).map((t) => [t.chave, t.valor!]));
        if (e.textoPadraoId) (this.modelos[+pid] ??= {})[tipo] = e.textoPadraoId;
      }
    }
    Object.values(d.processos).forEach((p) => this.recalcular(p));
  }

  // ===================================================================== roteamento
  tratar(r: Requisicao): unknown {
    const rotas: [string, RegExp, (m: RegExpMatchArray) => unknown][] = [
      ['GET', /^\/api\/public\/config$/, () => this.d.config],
      ['POST', /^\/api\/auth\/login$/, () => this.login(r.corpo)],
      ['GET', /^\/api\/auth\/sessao$/, () => this.sessao(r)],
      ['GET', /^\/api\/painel\/contadores$/, () => ({ caixa: this.lista(r, true).length })],
      ['GET', /^\/api\/painel\/dashboard$/, () => this.dashboard()],
      ['GET', /^\/api\/setores$/, () => this.d.setores],
      ['GET', /^\/api\/usuarios$/, () => this.d.responsaveis],
      // processos
      ['GET', /^\/api\/processos$/, () => this.pesquisar(r)],
      ['GET', /^\/api\/processos\/listas$/, () => this.d.listas],
      ['POST', /^\/api\/processos\/distribuir$/, () => this.distribuir(r)],
      ['GET', /^\/api\/processos\/(\d+)$/, (m) => this.detalhe(+m[1], r)],
      ['GET', /^\/api\/processos\/(\d+)\/historico$/, (m) => this.d.historicos[+m[1]] ?? []],
      ['GET', /^\/api\/processos\/(\d+)\/comunicacoes$/, (m) => this.d.comunicacoes[+m[1]] ?? []],
      ['GET', /^\/api\/(?:portal\/)?processos\/(\d+)\/documentos\/(\d+)\/arquivo$/, (m) => this.arquivo(+m[1], +m[2])],
      ['POST', /^\/api\/processos\/(\d+)\/documentos$/, (m) => this.anexar(+m[1], r, 'INTERNO')],
      ['POST', /^\/api\/processos\/(\d+)\/documentos\/(\d+)\/recusar$/, (m) => this.recusar(+m[1], +m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/documentos\/(\d+)\/aceitar$/, (m) => this.aceitar(+m[1], +m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/formalizar$/, (m) => this.formalizar(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/informacao-fiscal$/, (m) => this.informacaoFiscal(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/elegibilidade$/, (m) => this.elegibilidade(+m[1], r)],
      ['GET', /^\/api\/processos\/(\d+)\/pecas\/(parecer|ato)$/, (m) => this.editor(+m[1], m[2] as 'parecer' | 'ato', r)],
      ['PUT', /^\/api\/processos\/(\d+)\/pecas\/(parecer|ato)$/, (m) => this.salvarPeca(+m[1], m[2] as 'parecer' | 'ato', r)],
      ['POST', /^\/api\/processos\/(\d+)\/parecer\/assinar$/, (m) => this.assinar(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/contrapartidas$/, (m) => this.contrapartida(+m[1], r)],
      ['DELETE', /^\/api\/processos\/(\d+)\/contrapartidas\/(\d+)$/, (m) => this.excluirContrapartida(+m[1], +m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/ato\/concluir$/, (m) => this.concluirAto(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/homologar$/, (m) => this.homologar(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/publicacao\/(RECEBIMENTO|APROVACAO|PUBLICACAO)$/, (m) => this.publicacao(+m[1], m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/ciencia$/, (m) => this.ciencia(+m[1], 'PRESENCIAL', r)],
      ['POST', /^\/api\/processos\/(\d+)\/arquivar$/, (m) => this.arquivar(+m[1], r)],
      // fase 2: desvios do fluxo
      ['POST', /^\/api\/processos\/(\d+)\/diligencias$/, (m) => this.abrirDiligencia(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/diligencias\/(\d+)\/cancelar$/, (m) => this.cancelarDiligencia(+m[1], +m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/manifestacoes$/, (m) => this.solicitarManifestacao(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/manifestacoes\/(\d+)\/responder$/, (m) => this.responderManifestacao(+m[1], +m[2], r)],
      ['POST', /^\/api\/processos\/(\d+)\/instrucao-externa$/, (m) => this.encaminharInstrucao(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/instrucao-externa\/retorno$/, (m) => this.registrarInstrucao(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/termo\/enviar$/, (m) => this.enviarTermo(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/termo\/prorrogar$/, (m) => this.prorrogarTermo(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/recurso\/encaminhar$/, (m) => this.encaminharRecurso(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/recurso\/decisao$/, (m) => this.decidirRecurso(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/procedimentos$/, (m) => this.abrirProcedimento(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/procedimentos\/decidir$/, (m) => this.decidirProcedimento(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/procedimentos\/arquivar$/, (m) => this.arquivarProcedimento(+m[1], r)],
      ['POST', /^\/api\/processos\/(\d+)\/restabelecer$/, (m) => this.restabelecer(+m[1], r)],
      // portal
      ['GET', /^\/api\/portal\/interessados$/, () => this.interessadosPortal(r)],
      ['GET', /^\/api\/portal\/interessados\/(\d+)\/painel$/, (m) => this.painelPortal(+m[1], r)],
      ['GET', /^\/api\/portal\/interessados\/(\d+)\/beneficios$/, (m) => this.beneficiosPortal(+m[1], r)],
      ['GET', /^\/api\/portal\/taxa$/, () => this.taxa(r.params.get('especie')!, Number(r.params.get('valor') || 0))],
      ['GET', /^\/api\/portal\/documentos-exigidos$/, () => this.exigidos(r.params.get('especie')!).map((x) => ({ id: x.id, descricao: x.descricao, obrigatorio: x.obrigatorio }))],
      ['POST', /^\/api\/portal\/interessados\/(\d+)\/solicitacoes$/, (m) => this.solicitar(+m[1], r)],
      ['GET', /^\/api\/portal\/processos\/(\d+)$/, (m) => this.processoPortal(+m[1], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/documentos$/, (m) => { this.representado(r, this.p(+m[1]).resumo.interessadoId); this.anexar(+m[1], r, 'PORTAL'); return this.processoPortal(+m[1], r); }],
      ['DELETE', /^\/api\/portal\/processos\/(\d+)\/documentos\/(\d+)$/, (m) => this.removerDocumento(+m[1], +m[2], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/enviar$/, (m) => this.enviar(+m[1], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/ciencia$/, (m) => { this.representado(r, this.p(+m[1]).resumo.interessadoId); this.ciencia(+m[1], 'PORTAL', r); return this.processoPortal(+m[1], r); }],
      ['POST', /^\/api\/portal\/comunicacoes\/(\d+)\/ciencia$/, (m) => this.cienciaComunicacao(+m[1], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/diligencias\/(\d+)\/responder$/, (m) => this.responderDiligencia(+m[1], +m[2], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/termo\/devolver$/, (m) => this.devolverTermo(+m[1], r)],
      ['POST', /^\/api\/portal\/processos\/(\d+)\/recurso$/, (m) => this.apresentarRecurso(+m[1], r)],
      // catálogo
      ['GET', /^\/api\/catalogo\/beneficios$/, () => this.catalogo()],
      ['PUT', /^\/api\/catalogo\/beneficios\/(\d+)$/, (m) => this.alterarBeneficio(+m[1], r)],
      ['GET', /^\/api\/catalogo\/taxas$/, () => this.d.taxas],
      ['GET', /^\/api\/catalogo\/documentos-exigidos$/, () => this.d.documentosExigidos],
      ['GET', /^\/api\/catalogo\/textos-padrao$/, () => this.d.textos],
      ['PUT', /^\/api\/catalogo\/textos-padrao\/(\d+)$/, (m) => this.alterarTexto(+m[1], r)],
      ['GET', /^\/api\/catalogo\/tags$/, () => this.d.tags],
      // parametrizações
      ['GET', /^\/api\/parametros$/, () => (r.params.get('aba') ? this.d.parametros.filter((p) => p.aba === r.params.get('aba')) : this.d.parametros)],
      ['PUT', /^\/api\/parametros\/(\d+)$/, (m) => this.alterarParametro(+m[1], r)],
      ['POST', /^\/api\/parametros\/(\d+)\/cancelar-programacao$/, (m) => { const p = this.parametro(+m[1]); p.valorProgramado = undefined; p.vigenciaProgramada = undefined; return p; }],
      ['GET', /^\/api\/parametros\/historico$/, () => (r.params.get('parametroId') ? this.d.historicoParametros.filter((h) => h.parametroId === Number(r.params.get('parametroId'))) : this.d.historicoParametros)],
      ['POST', /^\/api\/parametros\/previa$/, () => String(r.corpo?.texto ?? '').replace(TAG, (_s, k) => `[${k}]`)],
      // integrações
      ['GET', /^\/api\/integracao\/solicitacoes$/, () => paginar(this.d.solicitacoes.filter((s) => !r.params.get('processoId') || s.processoId === Number(r.params.get('processoId'))), r.params)],
      ['GET', /^\/api\/integracao\/solicitacoes\/(\d+)$/, (m) => this.d.solicitacoes.find((s) => s.id === +m[1])],
      ['POST', /^\/api\/integracao\/solicitacoes\/(\d+)\/reprocessar$/, () => { throw negocio('Somente solicitações com erro podem ser reprocessadas.'); }],
      ['GET', /^\/api\/integracao\/resumo$/, () => this.resumoIntegracoes()],
      ['POST', /^\/api\/integracao\/ciencia\/executar$/, () => ({ expressas: 0, tacitas: 0, processos: 0 })],
      // administração
      ['GET', /^\/api\/admin\/usuarios$/, () => this.usuariosAdmin(r.params)],
      ['PUT', /^\/api\/admin\/usuarios\/(\d+)\/perfis$/, (m) => { const u = this.d.usuarios.find((x) => x.id === +m[1])!; u.perfis = r.corpo; return u; }],
      ['GET', /^\/api\/admin\/perfis$/, () => this.d.perfis],
      ['GET', /^\/api\/admin\/permissoes$/, () => this.d.permissoes],
      ['PUT', /^\/api\/admin\/perfis\/([A-Z_]+)\/permissoes$/, (m) => { const p = this.d.perfis.find((x) => x.codigo === m[1])!; p.permissoes = [...r.corpo].sort(); return p; }],
    ];
    for (const [metodo, re, fn] of rotas) {
      const m = r.caminho.match(re);
      if (m && metodo === r.metodo) {
        if (!/^\/api\/(public|auth\/login)/.test(r.caminho)) this.usuario(r);
        return fn(m);
      }
    }
    throw new ErroDemo(404, 'Não encontrado', `Rota não disponível na demonstração: ${r.metodo} ${r.caminho}`);
  }

  // ===================================================================== sessão e permissões
  private login(c: { login: string; senha: string }) {
    const u = this.d.usuarios.find((x) => x.login.toLowerCase() === String(c?.login ?? '').trim().toLowerCase());
    if (!u || c.senha !== SENHA_DEMO) throw new ErroDemo(401, 'Falha na autenticação', 'Login ou senha inválidos.');
    return { token: 'demo.' + u.login, login: u.login, nome: u.nome, perfis: this.perfisDe(u) };
  }
  private perfisDe(u: UsuarioAdmin) {
    return this.d.perfis.filter((p) => u.perfis.includes(p.codigo)).map((p) => ({ codigo: p.codigo, nome: p.nome }));
  }
  private usuario(r: Requisicao): UsuarioAdmin {
    const login = r.token?.startsWith('demo.') ? r.token.slice(5) : null;
    const u = this.d.usuarios.find((x) => x.login === login);
    if (!u) throw new ErroDemo(401, 'Sessão expirada', 'Entre novamente.');
    return u;
  }
  private perfilAtivo(r: Requisicao) {
    const u = this.usuario(r);
    return r.perfil && u.perfis.includes(r.perfil) ? r.perfil : this.perfisDe(u)[0]?.codigo ?? null;
  }
  private permissoes(r: Requisicao): Set<string> {
    const p = this.d.perfis.find((x) => x.codigo === this.perfilAtivo(r));
    return new Set(p?.permissoes ?? []);
  }
  private pode(r: Requisicao, ...ps: string[]) {
    const s = this.permissoes(r);
    return ps.some((p) => s.has(p));
  }
  private exigirPermissao(r: Requisicao, ...ps: string[]) {
    if (!this.pode(r, ...ps)) throw new ErroDemo(403, 'Acesso negado', 'O perfil ativo não possui permissão para esta operação.');
  }
  private sessao(r: Requisicao) {
    const u = this.usuario(r);
    return { login: u.login, nome: u.nome, perfilAtivo: this.perfilAtivo(r), perfis: this.perfisDe(u), permissoes: [...this.permissoes(r)], setor: this.d.setorDe[u.login] ?? null };
  }

  // ===================================================================== consultas
  private p(id: number): ProcessoDetalhe {
    const p = this.d.processos[id];
    if (!p) throw new ErroDemo(404, 'Não encontrado', 'Processo não encontrado: ' + id);
    return p;
  }
  private todos() {
    return Object.values(this.d.processos);
  }
  private lista(r: Requisicao, caixa: boolean): ProcessoResumo[] {
    let l = this.todos().map((p) => p.resumo);
    if (caixa) {
      const perms = this.permissoes(r);
      const distribui = perms.has('PROCESSO_DISTRIBUIR');
      const login = this.usuario(r).login;
      const nome = this.d.usuarios.find((u) => u.login === login)?.nome;
      const setor = this.d.setorDe[login] ?? null;
      l = l.filter((p) => {
        const det = this.d.processos[p.id];
        // procedimento de suspensão/cassação com prazo de regularização vencido, aguardando decisão
        if (perms.has('PROCEDIMENTO_DECIDIR') && det.desvios.procedimentos.some((x) => x.situacao === 'ABERTO' && x.prazoRegularizacao < hoje())) return true;
        const perm = ST[p.status][4];
        if (!perm || !perms.has(perm)) return false;
        if (p.status === 'MANIFESTACAO') return det.desvios.manifestacoes.some((x) => x.situacao === 'PENDENTE' && x.setor === setor);
        return !(CARTEIRA.includes(p.status) || p.status === 'INSTRUCAO_EXTERNA') || distribui || p.responsavelNome === nome;
      });
    }
    return l;
  }
  private pesquisar(r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_CONSULTAR');
    const q = r.params;
    let l = this.lista(r, q.get('caixa') === 'true');
    const texto = q.get('texto') ? normalizar(q.get('texto')!) : null;
    const status = q.getAll('status');
    if (texto) l = l.filter((p) => normalizar(p.numero + ' ' + p.razaoSocial + ' ' + p.cnpj).includes(texto));
    if (status.length) l = l.filter((p) => status.includes(p.status));
    if (q.get('beneficioId')) l = l.filter((p) => p.beneficioId === Number(q.get('beneficioId')));
    if (q.get('setorId')) { const s = this.d.setores.find((x) => x.id === Number(q.get('setorId')))?.sigla; l = l.filter((p) => p.setor === s); }
    const campo = q.get('ordenarPor') ?? 'diasNoSetor';
    const desc = q.get('desc') === 'true';
    const chave = (p: ProcessoResumo): number | string => campo === 'numero' ? p.numero : campo === 'valorPretendido' ? (p.valorPretendido ?? 0) : campo === 'dataSolicitacao' ? p.dataSolicitacao : -new Date(p.entradaSetorEm).getTime();
    l = [...l].sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0) * (desc ? -1 : 1));
    return paginar(l, q);
  }
  private detalhe(id: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_CONSULTAR');
    const p = this.p(id);
    this.recalcular(p, r);
    return p;
  }
  private dashboard() {
    const ps = this.todos().map((p) => p.resumo);
    const fora = FORA_DO_FLUXO;
    const porSetor: Record<string, number> = {};
    ps.filter((p) => !fora.includes(p.status)).forEach((p) => (porSetor[p.setor ?? '—'] = (porSetor[p.setor ?? '—'] ?? 0) + 1));
    return {
      emAndamento: ps.filter((p) => !fora.includes(p.status)).length,
      concedidos: ps.filter((p) => CONCEDIDOS.includes(p.status)).length,
      parados: ps.filter((p) => p.parado).length,
      aguardandoContribuinte: ps.filter((p) => ['EM_FORMALIZACAO', 'DILIGENCIA', 'TERMO_ACORDO'].includes(p.status)).length,
      porSituacao: (Object.keys(ST) as StatusProcesso[]).map((s) => ({ status: s, rotulo: ST[s][0], familia: ST[s][2], quantidade: ps.filter((p) => p.status === s).length })),
      porSetor, diasAlerta: this.inteiro('prazo.alerta_setor_dias', 15),
    };
  }
  private arquivo(pid: number, did: number) {
    const doc = this.p(pid).documentosExigidos.find((i) => i.atual?.id === did)?.atual;
    return new Blob([`Documento fictício da demonstração: ${doc?.descricao ?? did} (${doc?.nomeArquivo ?? ''})`], { type: 'text/plain' });
  }

  // ===================================================================== estado derivado (abas, ações, resumo)
  private recalcular(p: ProcessoDetalhe, r?: Requisicao) {
    const s = p.resumo.status;
    p.resumo.statusRotulo = ST[s][0];
    p.resumo.statusPortal = ST[s][1];
    p.resumo.familia = ST[s][2];
    p.resumo.diasNoSetor = dias(p.resumo.entradaSetorEm);
    p.resumo.diasTotal = dias(p.resumo.dataSolicitacao);
    p.desvios ??= desviosVazios();
    p.desvios.fimPrazoRecursal = p.desvios.decisaoCienciaEm ? somarDias(p.desvios.decisaoCienciaEm, this.inteiro('prazo.recurso_dias', 30)) : null;
    p.resumo.parado = !FORA_DO_FLUXO.includes(s) && p.resumo.diasNoSetor >= this.inteiro('prazo.alerta_setor_dias', 15);
    p.resumo.divergenciaCnae = p.beneficio.geraParecer && !alcanca(p.beneficio.alcance, p.interessado.cnaes);
    p.documentosPendentes = ['EM_FORMALIZACAO', 'RECEBIDO'].includes(s) ? this.pendentes(p) : [];
    p.abas = this.abas(p);
    p.acoes = r ? this.acoes(p, r) : {};
  }
  private pendentes(p: ProcessoDetalhe) {
    return p.documentosExigidos.filter((i) => i.obrigatorio && (!i.atual || i.atual.situacao === 'RECUSADO')).map((i) => i.descricao);
  }
  private abas(p: ProcessoDetalhe): AbaProcesso[] {
    const b = p.beneficio;
    const s = p.resumo.status;
    const tipo = b.tipoConcessaoRotulo;
    const par = [...p.pecas].reverse().find((x) => x.tipo === 'PARECER');
    const parecer = par?.situacao === 'ASSINADA';
    const favoravel = !par || par.conclusao !== 'DESFAVORAVEL';
    const homologado = !!p.homologadoEm;
    const dv = p.desvios;
    const temDesvios = dv.diligencias.length > 0 || dv.manifestacoes.length > 0 || !!dv.instrucaoEnviadaEm;
    const A = (id: string, rotulo: string, habilitada: boolean, motivo: string | null, pendente = false) => ({ id, rotulo, habilitada, motivo, pendente });
    return [
      A('dados', 'Dados do processo', true, null),
      A('enquadramento', 'Enquadramento', b.geraParecer, `Benefício de ${tipo} não percorre análise nem enquadramento`),
      A('documentos', 'Documentos', true, null, s === 'RECEBIDO' || s === 'EM_FORMALIZACAO'),
      A('informacaoFiscal', 'Informação Fiscal', b.geraParecer, `Benefício de ${tipo} não percorre análise de viabilidade`, s === 'INFORMACAO_FISCAL'),
      A('parecer', 'Análise e parecer', b.geraParecer, `Benefício de ${tipo} não gera parecer`, s === 'ANALISE_JURIDICA' || s === 'PARECER_ELABORACAO'),
      A('diligencias', 'Diligências e manifestações', b.geraParecer && (temDesvios || CARTEIRA.includes(s)), 'Abre na análise jurídica: diligência ao contribuinte, manifestação de outro setor ou instrução externa',
        s === 'DILIGENCIA' || s === 'MANIFESTACAO' || s === 'INSTRUCAO_EXTERNA'),
      A('ato', 'Ato Declaratório', b.geraAto && parecer && favoravel, b.geraAto ? 'O Ato Declaratório é vinculado ao parecer favorável. Finalize o parecer para gerar o ato.' : `Tipo de Concessão ${tipo} não gera Ato Declaratório`, s === 'ATO_ELABORACAO'),
      A('termo', 'Termo de acordo', !!b.exigeTermo && b.geraAto && parecer && favoravel, b.exigeTermo ? 'O termo de acordo é enviado durante a elaboração do Ato Declaratório' : 'O modelo deste benefício não prevê termo de acordo', s === 'TERMO_ACORDO'),
      A('homologacao', 'Homologação', b.geraParecer && (s === 'HOMOLOGACAO' || homologado), !b.geraParecer ? 'Não há parecer a homologar neste tipo de concessão' : b.geraAto ? 'A homologação depende do parecer assinado e do Ato Declaratório concluído' : 'A homologação do Secretário depende do parecer assinado', s === 'HOMOLOGACAO'),
      A('publicacao', 'Publicação', b.geraAto && homologado && favoravel, b.geraAto ? 'A publicação no Diário Oficial depende da homologação pelo Secretário' : 'Parecer Fiscal não gera publicação no Diário Oficial', s === 'PUBLICACAO'),
      A('vigencia', 'Ciência, vigência e procedimentos', !!p.vigenciaInicio || CONCEDIDOS.includes(s), b.geraAto ? 'A vigência começa na publicação do Ato Declaratório' : 'A vigência começa na homologação do parecer',
        s === 'CIENCIA_PENDENTE' || s === 'ARQUIVAMENTO_PENDENTE' || dv.procedimentos.some((x) => x.situacao === 'ABERTO')),
      A('recursos', 'Decisão e recursos', !!dv.decisaoEm || dv.recursos.length > 0, 'A aba abre quando houver decisão de indeferimento, suspensão ou cassação',
        s === 'RECURSO' || (DECISOES.includes(s) && !dv.decisaoCienciaEm)),
      A('comunicacoes', 'Comunicações', true, null),
      A('historico', 'Histórico e tramitação', true, null),
    ];
  }
  private acoes(p: ProcessoDetalhe, r: Requisicao): Record<string, Acao> {
    const m: Record<string, Acao> = {};
    const A = (h: boolean, motivo: string | null): Acao => ({ habilitada: h, motivo: h ? null : motivo });
    const distribui = this.pode(r, 'PROCESSO_DISTRIBUIR');
    const resp = p.resumo.responsavelNome === this.usuario(r).nome;
    const naoResp = p.resumo.responsavelNome ? 'O processo está distribuído para ' + p.resumo.responsavelNome : 'O processo ainda não foi distribuído pela Coordenação';
    const analista = this.pode(r, 'PARECER_ELABORAR') && (distribui || resp);
    const motivoAnalista = !this.pode(r, 'PARECER_ELABORAR') ? 'A análise jurídica é feita pela Tributação' : naoResp;
    const dv = p.desvios;
    const procAberto = dv.procedimentos.some((x) => x.situacao === 'ABERTO');
    const procedimentos = (suspensao: boolean) => {
      const abre = this.pode(r, 'PROCEDIMENTO_ABRIR');
      const decide = this.pode(r, 'PROCEDIMENTO_DECIDIR');
      const motivoAbre = !abre ? 'O procedimento é iniciado pelo monitoramento ou pela Coordenação' : 'Já há procedimento em curso';
      if (suspensao) m['ABRIR_SUSPENSAO'] = A(abre && !procAberto, motivoAbre);
      m['ABRIR_CASSACAO'] = A(abre && !procAberto, motivoAbre);
      if (procAberto) {
        const x = dv.procedimentos.filter((y) => y.situacao === 'ABERTO').at(-1)!;
        const vencido = x.prazoRegularizacao < hoje();
        m['DECIDIR_PROCEDIMENTO'] = A(decide && vencido, !decide ? 'A decisão é registrada pela Coordenação' : 'Aguarde o fim do prazo de regularização');
        m['ARQUIVAR_PROCEDIMENTO'] = A(decide, 'O arquivamento é registrado pela Coordenação');
      }
    };
    switch (p.resumo.status) {
      case 'RECEBIDO': {
        const pode = this.pode(r, 'PROCESSO_FORMALIZAR');
        m['FORMALIZAR'] = A(pode && !p.documentosPendentes.length, pode ? 'Há documentos obrigatórios pendentes' : 'A formalização é feita pelo Atendimento');
        m['ANALISAR_DOCUMENTOS'] = A(pode, 'A conferência é feita pelo Atendimento');
        break;
      }
      case 'INFORMACAO_FISCAL': m['EMITIR_IF'] = A(this.pode(r, 'INFORMACAO_FISCAL_EMITIR'), 'A Informação Fiscal é emitida pela Fiscalização'); break;
      case 'ANALISE_JURIDICA': case 'PARECER_ELABORACAO': {
        const pode = this.pode(r, 'PARECER_ELABORAR') && (distribui || resp);
        const motivo = !this.pode(r, 'PARECER_ELABORAR') ? 'A análise jurídica é feita pela Tributação' : naoResp;
        m['DISTRIBUIR'] = A(distribui, 'A distribuição é feita pela Coordenação');
        m['ELEGIBILIDADE'] = A(pode, motivo);
        m['ABRIR_DILIGENCIA'] = A(analista, motivoAnalista);
        m['SOLICITAR_MANIFESTACAO'] = A(analista, motivoAnalista);
        if (p.beneficio.exigeInstrucaoExterna) m['ENCAMINHAR_INSTRUCAO'] = A(analista && dv.instrucaoResultado !== 'FAVORAVEL', analista ? 'Deliberação favorável já registrada' : motivoAnalista);
        if (p.resumo.status === 'PARECER_ELABORACAO') {
          const ifOk = p.pecas.some((x) => x.tipo === 'INFORMACAO_FISCAL' && x.situacao === 'ASSINADA');
          m['EDITAR_PARECER'] = A(pode, motivo);
          m['ASSINAR_PARECER'] = A(pode && ifOk, pode ? 'A Informação Fiscal ainda não foi emitida' : motivo);
        }
        break;
      }
      case 'ATO_ELABORACAO': {
        const pode = this.pode(r, 'ATO_ELABORAR') && (distribui || resp);
        const motivo = !this.pode(r, 'ATO_ELABORAR') ? 'O ato é elaborado pela Tributação' : naoResp;
        m['DISTRIBUIR'] = A(distribui, 'A distribuição é feita pela Coordenação');
        const termoFalta = !!p.beneficio.exigeTermo && !dv.termoAssinadoEm;
        m['EDITAR_ATO'] = A(pode, motivo);
        if (p.beneficio.exigeTermo) m['ENVIAR_TERMO'] = A(pode && termoFalta, pode ? 'O termo já foi devolvido assinado' : motivo);
        m['CONCLUIR_ATO'] = A(pode && !termoFalta, pode ? 'O benefício exige o termo de acordo assinado pela empresa' : motivo);
        break;
      }
      case 'DILIGENCIA': m['CANCELAR_DILIGENCIA'] = A(analista, motivoAnalista); break;
      case 'MANIFESTACAO': {
        const setor = this.d.setorDe[this.usuario(r).login] ?? null;
        const responde = this.pode(r, 'MANIFESTACAO_RESPONDER') && dv.manifestacoes.some((x) => x.situacao === 'PENDENTE' && x.setor === setor);
        m['RESPONDER_MANIFESTACAO'] = A(responde, 'A manifestação é respondida pelo setor consultado');
        m['SOLICITAR_MANIFESTACAO'] = A(analista, motivoAnalista);
        break;
      }
      case 'INSTRUCAO_EXTERNA': m['REGISTRAR_INSTRUCAO'] = A(analista, motivoAnalista); break;
      case 'TERMO_ACORDO': {
        const pode = this.pode(r, 'ATO_ELABORAR') && (distribui || resp);
        m['PRORROGAR_TERMO'] = A(pode, 'A prorrogação é feita pelo auditor responsável');
        break;
      }
      case 'VIGENTE': case 'CONCEDIDO_ARQUIVADO': procedimentos(true); break;
      case 'INDEFERIDO': case 'SUSPENSO': case 'CASSADO': {
        if (!dv.decisaoCienciaEm) m['REGISTRAR_CIENCIA'] = A(this.pode(r, 'CIENCIA_REGISTRAR'), 'A ciência presencial é registrada pelo Atendimento');
        if (p.resumo.status === 'INDEFERIDO') {
          const arquiva = this.pode(r, 'PROCESSO_ARQUIVAR');
          const fim = dv.fimPrazoRecursal;
          const vencido = !!fim && fim < hoje();
          m['ARQUIVAR'] = A(arquiva && vencido, !arquiva ? 'O arquivamento é feito pela Coordenação' : !fim ? 'Aguarde a ciência do indeferimento' : 'O prazo recursal ainda está em curso');
        }
        if (p.resumo.status === 'SUSPENSO') {
          m['RESTABELECER'] = A(this.pode(r, 'PROCEDIMENTO_DECIDIR'), 'O restabelecimento é registrado pela Coordenação');
          procedimentos(false);
        }
        break;
      }
      case 'RECURSO': {
        const pode = this.pode(r, 'RECURSO_ENCAMINHAR');
        const encaminhado = dv.recursos.some((x) => !x.resultado && !!x.encaminhadoEm);
        const motivo = 'O encaminhamento e o registro da decisão são feitos pela Coordenação';
        m['ENCAMINHAR_RECURSO'] = A(pode && !encaminhado, pode ? 'Recurso já encaminhado ao Conselho' : motivo);
        m['DECIDIR_RECURSO'] = A(pode && encaminhado, pode ? 'Encaminhe antes o recurso ao Conselho' : motivo);
        break;
      }
      case 'HOMOLOGACAO': m['HOMOLOGAR'] = A(this.pode(r, 'PARECER_HOMOLOGAR'), 'A homologação é do Secretário de Estado da Fazenda'); break;
      case 'PUBLICACAO': {
        const pode = this.pode(r, 'ATO_PUBLICAR');
        const pub = p.publicacao;
        m['PUBLICACAO_RECEBIMENTO'] = A(pode && !pub.recebidoEm, pode ? 'Recebimento já registrado' : 'A publicação é registrada pelo Gabinete');
        m['PUBLICACAO_APROVACAO'] = A(pode && !!pub.recebidoEm && !pub.aprovadoEm, !pode ? 'A publicação é registrada pelo Gabinete' : !pub.recebidoEm ? 'Registre antes o recebimento da matéria' : 'Aprovação já registrada');
        m['PUBLICACAO_REGISTRO'] = A(pode && !!pub.aprovadoEm, pode ? 'Registre antes a aprovação da matéria' : 'A publicação é registrada pelo Gabinete');
        break;
      }
      case 'CIENCIA_PENDENTE': m['REGISTRAR_CIENCIA'] = A(this.pode(r, 'CIENCIA_REGISTRAR'), 'A ciência presencial é registrada pelo Atendimento'); break;
      case 'ARQUIVAMENTO_PENDENTE': m['ARQUIVAR'] = A(this.pode(r, 'PROCESSO_ARQUIVAR'), 'O arquivamento é feito pela Coordenação'); break;
    }
    return m;
  }

  // ===================================================================== transições
  private exigir(p: ProcessoDetalhe, ...st: StatusProcesso[]) {
    if (!st.includes(p.resumo.status)) throw negocio('Operação não permitida na situação atual do processo: ' + p.resumo.statusRotulo + '.');
  }
  private setorDo(papel: Papel) {
    return this.d.parametros.find((x) => x.chave === 'setor.' + papel.toLowerCase())?.valor ?? papel;
  }
  private evento(p: ProcessoDetalhe, r: Requisicao | null, tipo: string, descricao: string, extra: Partial<Evento> = {}) {
    const nome = r ? this.usuario(r).nome : 'sistema';
    (this.d.historicos[p.resumo.id] ??= []).unshift({ id: ++this.seq, dataHora: agora(), tipo, descricao, usuarioNome: nome, setorOrigem: null, setorDestino: null, statusAnterior: null, statusNovo: null, ...extra });
  }
  private mover(p: ProcessoDetalhe, r: Requisicao, novo: StatusProcesso, tipo: string, descricao: string) {
    const anterior = p.resumo.status;
    const origem = p.resumo.setor;
    const destino = this.setorDo(ST[novo][3]);
    p.resumo.status = novo;
    if (origem !== destino) { p.resumo.setor = destino; p.resumo.entradaSetorEm = agora(); }
    if (!CARTEIRA.includes(novo) && !PAUSA_DA_ANALISE.includes(novo)) { p.resumo.responsavelId = null; p.resumo.responsavelNome = null; }
    this.evento(p, r, tipo, descricao, { statusAnterior: anterior, statusNovo: novo, setorOrigem: origem, setorDestino: origem !== destino ? destino : null });
    this.recalcular(p, r);
  }
  /** Trâmite para outro setor sem mudar a situação (ex.: recurso encaminhado ao Conselho). */
  private tramitar(p: ProcessoDetalhe, r: Requisicao, papel: Papel, tipo: string, descricao: string) {
    const origem = p.resumo.setor;
    const destino = this.setorDo(papel);
    p.resumo.setor = destino;
    p.resumo.entradaSetorEm = agora();
    this.evento(p, r, tipo, descricao, { setorOrigem: origem, setorDestino: destino });
    this.recalcular(p, r);
  }
  /** Comunicação a partir do texto padrão do catálogo (mesma regra do ComunicacaoService). */
  private comunicarModelo(p: ProcessoDetalhe, tipo: string, codigo: string, assunto: string, extras: Record<string, string>, prazoDias: number | null, marco: boolean) {
    const v: Record<string, string> = { ...this.resolvidas(p), ...extras };
    if (prazoDias != null) v['prazo'] ??= br(somarDias(hoje(), prazoDias));
    const corpo = this.modelo(codigo)?.corpo ?? assunto;
    this.comunicar(p, tipo, assunto, this.resolverTexto(corpo, v), prazoDias, marco);
    return (this.d.comunicacoes[p.resumo.id] ?? [])[0];
  }
  private integrar(p: ProcessoDetalhe, demanda: string, descricao: string, servico: string, retorno: Record<string, unknown>) {
    const id = ++this.seq;
    this.d.solicitacoes.unshift({ id, demanda, demandaDescricao: descricao, processoId: p.resumo.id, status: 'CONCLUIDA', etapaAtual: 1, totalEtapas: 1, tentativas: 1, criadoEm: agora(), criadoPor: 'demonstração', atualizadoEm: agora(),
      etapas: [{ ordem: 0, servico, descricao, caminho: 'simulado na demonstração', status: 'CONCLUIDA', inicio: agora(), fim: agora(), retorno: JSON.stringify(retorno) }] });
  }
  private comunicar(p: ProcessoDetalhe, tipo: string, assunto: string, texto: string, prazoDias: number | null, marco: boolean) {
    const numero = `DTE-${new Date().getFullYear()}-${String(++this.seqDte).padStart(6, '0')}`;
    const c: Comunicacao = { id: ++this.seq, processoId: p.resumo.id, tipo, assunto, texto: texto + '\n\n' + this.texto('comunicacao.assinatura', 'Secretaria da Fazenda') + '.', enviadaEm: agora(),
      prazo: prazoDias == null ? null : somarDias(hoje(), prazoDias), numeroDte: numero, cienciaEm: null, cienciaTipo: null, marcoProcesso: marco };
    (this.d.comunicacoes[p.resumo.id] ??= []).unshift(c);
    this.integrar(p, 'COMUNICAR_CONTRIBUINTE', 'Comunicação oficial ao contribuinte (DT-e)', 'RF-04', { numeroComunicacao: numero });
    this.evento(p, null, 'COMUNICACAO', `Comunicação "${assunto}" entregue pelo canal eletrônico sob o nº ${numero}.`);
  }
  private modelo(codigo: string) {
    return this.d.textos.find((t) => t.codigo === codigo);
  }
  private resolverTexto(corpo: string, v: Record<string, string>) {
    return corpo.replace(TAG, (s, k) => v[k] ?? s);
  }

  private anexar(pid: number, r: Requisicao, origem: 'PORTAL' | 'INTERNO') {
    const p = this.p(pid);
    if (origem === 'PORTAL') this.exigir(p, 'EM_FORMALIZACAO', 'DILIGENCIA', 'TERMO_ACORDO');
    else this.exigirPermissao(r, 'PROCESSO_FORMALIZAR');
    const fd = r.corpo as FormData;
    const f = fd.get('arquivo') as File;
    if (!f) throw negocio('Selecione o arquivo.');
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(f.type)) throw negocio('Formato não aceito. Envie PDF, PNG ou JPEG.');
    if (f.size > 20 * 1024 * 1024) throw negocio('O arquivo excede o limite de 20 MB.');
    const exigido = Number(fd.get('documentoExigidoId')) || null;
    const item = p.documentosExigidos.find((i) => i.documentoExigidoId === exigido) ?? (() => {
      const novo: ItemDocumental = { documentoExigidoId: null, descricao: String(fd.get('descricao') ?? f.name), obrigatorio: false, atual: null };
      p.documentosExigidos.push(novo);
      return novo;
    })();
    item.atual = { id: ++this.seq, documentoExigidoId: exigido, descricao: item.descricao, nomeArquivo: f.name, tamanho: f.size, situacao: origem === 'INTERNO' ? 'ACEITO' : 'ENVIADO',
      motivoRecusa: null, origem, enviadoEm: agora(), enviadoPor: this.usuario(r).login, analisadoEm: origem === 'INTERNO' ? agora() : null };
    this.evento(p, r, 'DOCUMENTO', `Documento anexado (${origem === 'PORTAL' ? 'portal' : 'anexo interno'}): ${item.descricao} · ${f.name}`);
    this.recalcular(p, r);
    return item.atual;
  }
  private removerDocumento(pid: number, did: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.exigir(p, 'EM_FORMALIZACAO');
    const item = p.documentosExigidos.find((i) => i.atual?.id === did);
    if (!item || item.atual!.situacao !== 'ENVIADO') throw negocio('Somente documentos ainda não analisados podem ser removidos.');
    item.atual = null;
    this.recalcular(p, r);
    return this.processoPortal(pid, r);
  }
  private enviar(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.exigir(p, 'EM_FORMALIZACAO');
    const faltam = this.pendentes(p);
    if (faltam.length) throw negocio('A formalização não se completa sem os documentos obrigatórios: ' + faltam.join('; ') + '.');
    this.mover(p, r, 'RECEBIDO', 'ENVIO', 'Solicitação enviada pelo contribuinte com os documentos obrigatórios. Processo recebido no Atendimento para conferência.');
    return this.processoPortal(pid, r);
  }
  private recusar(pid: number, did: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_FORMALIZAR');
    const p = this.p(pid);
    this.exigir(p, 'RECEBIDO');
    const motivo = String(r.corpo?.motivo ?? '').trim();
    if (!motivo) throw negocio('Informe o motivo da recusa.');
    const item = p.documentosExigidos.find((i) => i.atual?.id === did)!;
    Object.assign(item.atual!, { situacao: 'RECUSADO', motivoRecusa: motivo, analisadoEm: agora() });
    this.mover(p, r, 'EM_FORMALIZACAO', 'RECUSA_DOCUMENTO', `Documento recusado na conferência: ${item.descricao} · motivo: ${motivo}. O processo voltou ao contribuinte para novo envio.`);
    const prazo = this.inteiro('prazo.documento.reenvio_dias', 30);
    this.comunicar(p, 'DOCUMENTO_RECUSADO', 'Documento recusado na formalização — ' + item.descricao,
      `Prezado contribuinte,\n\nNa formalização do processo nº ${p.resumo.numero}, de ${p.interessado.razaoSocial}, o documento "${item.descricao}" foi recusado pelo Atendimento.\n\nMotivo: ${motivo}\n\nEnvie novo documento pelo portal até ${br(somarDias(hoje(), prazo))}.`, prazo, false);
    return p;
  }
  private aceitar(pid: number, did: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_FORMALIZAR');
    const p = this.p(pid);
    this.exigir(p, 'RECEBIDO');
    const item = p.documentosExigidos.find((i) => i.atual?.id === did)!;
    Object.assign(item.atual!, { situacao: 'ACEITO', analisadoEm: agora() });
    this.recalcular(p, r);
    return p;
  }
  private formalizar(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_FORMALIZAR');
    const p = this.p(pid);
    this.exigir(p, 'RECEBIDO');
    if (p.taxaValor > 0 && !r.corpo?.taxaConferida) throw negocio(`Confira o recolhimento da taxa de ${moeda(p.taxaValor)} antes de formalizar.`);
    if (this.pendentes(p).length) throw negocio('Há documentos obrigatórios pendentes: ' + this.pendentes(p).join('; ') + '.');
    p.documentosExigidos.forEach((i) => { if (i.atual?.situacao === 'ENVIADO') Object.assign(i.atual, { situacao: 'ACEITO', analisadoEm: agora() }); });
    p.taxaPaga = p.taxaValor > 0;
    p.taxaConferidaEm = p.taxaPaga ? agora() : null;
    p.dataFormalizacao = agora();
    p.protocoloLegado = `PROT-${new Date().getFullYear()}-${String(++this.seqDte).padStart(6, '0')}`;
    this.mover(p, r, 'INFORMACAO_FISCAL', 'FORMALIZACAO', `Processo formalizado: taxa ${p.taxaPaga ? 'conferida' : 'isenta'} e documentos obrigatórios aceitos. Encaminhado para análise de viabilidade operacional.`);
    this.integrar(p, 'PROTOCOLAR_PROCESSO', 'Protocolo do processo formalizado', 'RF-01', { numeroProtocolo: p.protocoloLegado });
    this.evento(p, null, 'INTEGRACAO', `Processo protocolado no sistema corporativo sob o nº ${p.protocoloLegado}.`);
    return p;
  }
  private numeroPeca(p: ProcessoDetalhe, tipo: PecaResumo['tipo']) {
    const suf = tipo === 'INFORMACAO_FISCAL' ? this.texto('numeracao.if.sufixo', '-IF') : tipo === 'PARECER' ? this.texto('numeracao.parecer.sufixo', '-PAR')
      : tipo === 'TERMO_ACORDO' ? this.texto('numeracao.termo.sufixo', '-TA') : this.texto('numeracao.ato.sufixo', '-AD');
    return p.resumo.numero.slice(0, 4) + '/' + p.resumo.numero.slice(-4) + suf;
  }
  private novaPeca(p: ProcessoDetalhe, r: Requisicao, tipo: PecaResumo['tipo'], extra: Partial<PecaResumo> = {}): PecaResumo {
    const x: PecaResumo = { id: ++this.seq, tipo, numero: this.numeroPeca(p, tipo), situacao: 'RASCUNHO', conclusao: null, conclusaoRotulo: null, fundamentacao: null, observacoes: null,
      autorNome: this.usuario(r).nome, assinadaEm: null, textoPadrao: null, corpoFinal: null, ...extra };
    p.pecas.push(x);
    return x;
  }
  private informacaoFiscal(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'INFORMACAO_FISCAL_EMITIR');
    const p = this.p(pid);
    this.exigir(p, 'INFORMACAO_FISCAL');
    const c = r.corpo ?? {};
    if (!['VIAVEL', 'VIAVEL_RESSALVAS', 'INVIAVEL'].includes(c.conclusao)) throw negocio('Informe a conclusão: viável, viável com ressalvas ou inviável.');
    if (!String(c.fundamentacao ?? '').trim()) throw negocio('Informe a fundamentação técnica.');
    const rot = { VIAVEL: 'viável', VIAVEL_RESSALVAS: 'viável com ressalvas', INVIAVEL: 'inviável' }[c.conclusao as string]!;
    const x = this.novaPeca(p, r, 'INFORMACAO_FISCAL', { situacao: 'ASSINADA', assinadaEm: agora(), conclusao: c.conclusao, conclusaoRotulo: rot, fundamentacao: c.fundamentacao, observacoes: c.observacoes ?? null });
    this.mover(p, r, 'ANALISE_JURIDICA', 'INFORMACAO_FISCAL', `Informação Fiscal nº ${x.numero} emitida · conclusão: ${rot}. Processo encaminhado à análise jurídica.`);
    return p;
  }
  private distribuir(r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_DISTRIBUIR');
    const { processoIds, responsavelId, prioridade } = r.corpo;
    const resp = this.d.responsaveis.find((u) => u.id === responsavelId);
    const ignorados: { id: number; descricao: string; motivo: string }[] = [];
    let processados = 0;
    for (const id of processoIds as number[]) {
      const p = this.d.processos[id];
      if (!p) { ignorados.push({ id, descricao: 'Processo ' + id, motivo: 'não encontrado' }); continue; }
      if (!CARTEIRA.includes(p.resumo.status)) { ignorados.push({ id, descricao: p.resumo.numero, motivo: 'situação não admite distribuição: ' + p.resumo.statusRotulo }); continue; }
      const antes = p.resumo.responsavelNome ?? 'sem responsável';
      if (resp) { p.resumo.responsavelId = resp.id; p.resumo.responsavelNome = resp.nome; }
      if (prioridade) p.resumo.prioridade = prioridade;
      this.evento(p, r, 'DISTRIBUICAO', (resp ? `Processo distribuído: ${antes} → ${resp.nome}` : 'Prioridade alterada') + (prioridade ? ' · prioridade ' + prioridade.toLowerCase() : ''));
      processados++;
    }
    return { processados, ignorados, loteId: null };
  }
  private exigirResponsavel(p: ProcessoDetalhe, r: Requisicao) {
    const nome = this.usuario(r).nome;
    if (this.pode(r, 'PROCESSO_DISTRIBUIR')) {
      if (!p.resumo.responsavelNome) { p.resumo.responsavelNome = nome; p.resumo.responsavelId = this.usuario(r).id; }
      return;
    }
    if (!p.resumo.responsavelNome) throw negocio('O processo ainda não foi distribuído. Aguarde a distribuição pela Coordenação.');
    if (p.resumo.responsavelNome !== nome) throw negocio('O processo está distribuído para ' + p.resumo.responsavelNome + '.');
  }
  private elegibilidade(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PARECER_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, 'ANALISE_JURIDICA', 'PARECER_ELABORACAO');
    this.exigirResponsavel(p, r);
    const b = p.beneficio;
    const compat = alcanca(b.alcance, p.interessado.cnaes);
    const inf = p.pecas.find((x) => x.tipo === 'INFORMACAO_FISCAL');
    const regular = !String(p.interessado.inscricaoEstadual ?? '').endsWith('6');
    p.elegibilidade = [
      { item: 'Benefício ativo e passível de solicitação', resultado: 'OK', detalhe: `${b.assunto} · Tipo de Concessão ${b.tipoConcessaoRotulo} · ${b.convenio}` },
      { item: 'Atividade econômica (CNAE) compatível com o alcance', resultado: compat ? 'OK' : 'ALERTA', detalhe: (compat ? 'CNAE ' : 'Divergência: CNAE ') + p.interessado.cnaes.join(', ') + (compat ? ' alcançado por ' : ' fora de ') + (b.alcance.map((a) => `${a.rotulo} (${a.descricao})`).join('; ') || 'alcance livre') },
      { item: 'Taxa de serviço recolhida', resultado: !p.taxaValor || p.taxaPaga ? 'OK' : 'FALHA', detalhe: !p.taxaValor ? 'Espécie isenta de taxa' : moeda(p.taxaValor) + (p.taxaPaga ? ' conferida na formalização' : ' não conferida') },
      { item: 'Regularidade fiscal da requerente', resultado: regular ? 'OK' : 'FALHA', detalhe: regular ? 'Sem pendências de dívida ativa ou omissão de declarações' : 'Débito inscrito em dívida ativa pendente de regularização' },
      { item: 'Informação Fiscal (viabilidade operacional)', resultado: !inf || inf.conclusao === 'INVIAVEL' ? 'FALHA' : inf.conclusao === 'VIAVEL_RESSALVAS' ? 'ALERTA' : 'OK', detalhe: inf ? `IF nº ${inf.numero} · ${inf.conclusaoRotulo}` : 'Não emitida' },
    ];
    p.elegibilidadeEm = agora();
    const f = p.elegibilidade.filter((i) => i.resultado === 'FALHA').length;
    const a = p.elegibilidade.filter((i) => i.resultado === 'ALERTA').length;
    const resumo = `Relatório de elegibilidade gerado: ${5 - f - a} item(ns) atendido(s), ${a} alerta(s), ${f} falha(s).`;
    if (p.resumo.status === 'ANALISE_JURIDICA') {
      const m = this.modelo('PARECER_FAVORAVEL')!;
      this.novaPeca(p, r, 'PARECER', { textoPadrao: m.nome });
      (this.modelos[pid] ??= {})['parecer'] = m.id;
      this.mover(p, r, 'PARECER_ELABORACAO', 'ELEGIBILIDADE', resumo + ' Parecer em elaboração.');
    } else {
      this.evento(p, r, 'ELEGIBILIDADE', resumo);
      this.recalcular(p, r);
    }
    return p;
  }

  // ------------------------------------------------------------------ peças com tags
  private resolvidas(p: ProcessoDetalhe): Record<string, string> {
    const v: Record<string, string | null | undefined> = {
      numeroProcesso: p.resumo.numero, razaoSocial: p.interessado.razaoSocial, cnpj: p.interessado.cnpj, inscricaoEstadual: p.interessado.inscricaoEstadual,
      beneficio: p.beneficio.assunto, valorTaxa: p.taxaValor ? moeda(p.taxaValor) : 'isento', renunciaEstimada: p.resumo.valorPretendido ? moeda(p.resumo.valorPretendido) : null,
      prazoFruicao: p.beneficio.prazoMeses ? p.beneficio.prazoMeses + ' meses' : null, dataPublicacao: p.publicacao.publicadoEm ? br(p.publicacao.publicadoEm) : null,
      numeroInformacaoFiscal: p.pecas.find((x) => x.tipo === 'INFORMACAO_FISCAL' && x.situacao === 'ASSINADA')?.numero,
      numeroParecer: p.pecas.find((x) => x.tipo === 'PARECER')?.numero, numeroAto: p.pecas.find((x) => x.tipo === 'ATO_DECLARATORIO')?.numero,
      contrapartidas: p.contrapartidas.length ? p.contrapartidas.map((c) => c.descricao).join('; ') : null,
      motivoDecisao: p.desvios?.motivoDecisao, numeroTermo: p.pecas.find((x) => x.tipo === 'TERMO_ACORDO')?.numero,
    };
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x != null)) as Record<string, string>;
  }
  private tagsDa(p: ProcessoDetalhe, tipo: 'parecer' | 'ato', corpo: string, assinada: boolean): TagPeca[] {
    const res = this.resolvidas(p);
    const inf = this.valores[p.resumo.id]?.[tipo] ?? {};
    const chaves = [...new Set([...corpo.matchAll(TAG)].map((m) => m[1]))];
    return chaves.map((chave) => {
      const t = this.d.tags.find((x) => x.chave === chave);
      let natureza = (t?.natureza ?? 'PREENCHIMENTO') as TagPeca['natureza'];
      let origem = t?.origem ?? 'Informado pelo auditor';
      let opcoes = t?.opcoes ?? [];
      if (chave === 'modalidade') opcoes = p.beneficio.modalidades.map((m) => m.toLowerCase());
      if (chave === 'contrapartidas' && !p.contrapartidas.length) { natureza = 'PREENCHIMENTO'; origem = 'Sem contrapartida estruturada: informe o texto (ex.: não há contrapartidas)'; }
      let valor: string | null;
      let editavel = false;
      if (natureza === 'RESOLVIDA') valor = res[chave] ?? null;
      else { valor = inf[chave] ?? (natureza === 'ESCOLHA' && opcoes.length === 1 ? opcoes[0] : null); editavel = !assinada; }
      return { chave, descricao: t?.descricao ?? chave, natureza, origem, valor, opcoes, editavel, pendente: !valor };
    });
  }
  private paragrafos(corpo: string, tags: TagPeca[]) {
    return corpo.split(/\r?\n\s*\r?\n/).map((par) => {
      const segmentos: { texto: string | null; tag: string | null }[] = [];
      let ultimo = 0;
      for (const m of par.matchAll(TAG)) {
        if (m.index! > ultimo) segmentos.push({ texto: par.slice(ultimo, m.index), tag: null });
        segmentos.push({ texto: tags.find((t) => t.chave === m[1])?.valor ?? null, tag: m[1] });
        ultimo = m.index! + m[0].length;
      }
      if (ultimo < par.length) segmentos.push({ texto: par.slice(ultimo), tag: null });
      return { segmentos };
    }).filter((x) => x.segmentos.length);
  }
  private editor(pid: number, tipo: 'parecer' | 'ato', r: Requisicao): EditorPeca {
    const p = this.p(pid);
    const tp = tipo === 'ato' ? 'ATO_DECLARATORIO' : 'PARECER';
    const peca = [...p.pecas].reverse().find((x) => x.tipo === tp);
    if (!peca) throw negocio('Peça ainda não gerada para este processo.');
    const tipos = tipo === 'ato' ? ['ATO_DECLARATORIO'] : ['PARECER_FAVORAVEL', 'PARECER_DESFAVORAVEL'];
    const modelo = this.d.textos.find((t) => t.id === this.modelos[pid]?.[tipo]) ?? this.d.textos.find((t) => t.nome === peca.textoPadrao) ?? this.d.textos.find((t) => t.tipo === tipos[0])!;
    const assinada = peca.situacao === 'ASSINADA';
    const tags = this.tagsDa(p, tipo, modelo.corpo, assinada);
    return {
      pecaId: peca.id, tipo: tp, numero: peca.numero, situacao: peca.situacao, textoPadraoId: modelo.id, textoPadraoNome: modelo.nome, textoPadraoTipo: modelo.tipo, versaoTexto: modelo.versaoTexto,
      modelos: this.d.textos.filter((t) => tipos.includes(t.tipo) && t.ativo).map((t) => ({ id: t.id, nome: t.nome, versao: t.versaoTexto })),
      paragrafos: assinada && peca.corpoFinal ? this.paragrafos(peca.corpoFinal, []) : this.paragrafos(modelo.corpo, tags),
      tags, pendentes: assinada ? 0 : tags.filter((t) => t.pendente).length, autorNome: peca.autorNome, assinadaEm: peca.assinadaEm,
    };
  }
  private salvarPeca(pid: number, tipo: 'parecer' | 'ato', r: Requisicao) {
    this.exigirPermissao(r, 'PARECER_ELABORAR', 'ATO_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, tipo === 'ato' ? 'ATO_ELABORACAO' : 'PARECER_ELABORACAO');
    this.exigirResponsavel(p, r);
    const e = this.editor(pid, tipo, r);
    if (e.situacao === 'ASSINADA') throw negocio('A peça já foi assinada e não pode ser alterada. Correções exigem nova peça.');
    if (r.corpo?.textoPadraoId) (this.modelos[pid] ??= {})[tipo] = r.corpo.textoPadraoId;
    const v = (this.valores[pid] ??= {})[tipo] ??= {};
    for (const [k, x] of Object.entries((r.corpo?.valores ?? {}) as Record<string, string>)) { if (x?.trim()) v[k] = x.trim(); else delete v[k]; }
    return this.editor(pid, tipo, r);
  }
  private finalizar(p: ProcessoDetalhe, tipo: 'parecer' | 'ato', r: Requisicao) {
    const e = this.editor(p.resumo.id, tipo, r);
    const pend = e.tags.filter((t) => t.pendente).map((t) => t.descricao);
    if (pend.length) throw negocio(`Há ${pend.length} tag(s) pendente(s): ${pend.join(', ')}.`);
    const modelo = this.d.textos.find((t) => t.id === e.textoPadraoId)!;
    const peca = p.pecas.find((x) => x.id === e.pecaId)!;
    Object.assign(peca, { situacao: 'ASSINADA', assinadaEm: agora(), autorNome: this.usuario(r).nome, textoPadrao: modelo.nome,
      corpoFinal: this.resolverTexto(modelo.corpo, Object.fromEntries(e.tags.filter((t) => t.valor).map((t) => [t.chave, t.valor!]))) });
    return peca;
  }
  private assinar(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PARECER_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, 'PARECER_ELABORACAO');
    this.exigirResponsavel(p, r);
    if (!p.pecas.some((x) => x.tipo === 'INFORMACAO_FISCAL' && x.situacao === 'ASSINADA')) throw negocio('A Informação Fiscal ainda não foi emitida: o parecer não pode ser finalizado.');
    const e = this.editor(pid, 'parecer', r);
    if (e.textoPadraoTipo === 'PARECER_DESFAVORAVEL') {
      const motivo = r.corpo?.motivo;
      if (!motivo || !this.d.listas.motivosIndeferimento.includes(motivo)) throw negocio('Informe o motivo estruturado do indeferimento.');
      const des = this.finalizar(p, 'parecer', r);
      des.conclusao = 'DESFAVORAVEL';
      des.conclusaoRotulo = 'desfavorável';
      p.desvios.motivoDecisao = motivo;
      this.mover(p, r, 'HOMOLOGACAO', 'PARECER', `Parecer nº ${des.numero} assinado (desfavorável) · motivo: ${motivo}. Encaminhado à homologação do indeferimento pelo Secretário.`);
      return p;
    }
    if (p.beneficio.exigeInstrucaoExterna && p.desvios.instrucaoResultado !== 'FAVORAVEL') throw negocio('O benefício exige instrução prévia da Agência e deliberação favorável do CONDI antes do parecer favorável.');
    const par = this.finalizar(p, 'parecer', r);
    par.conclusao = 'FAVORAVEL';
    par.conclusaoRotulo = 'favorável';
    if (p.beneficio.geraAto) {
      const m = this.d.textos.find((t) => t.tipo === 'ATO_DECLARATORIO')!;
      this.novaPeca(p, r, 'ATO_DECLARATORIO', { textoPadrao: m.nome });
      (this.modelos[pid] ??= {})['ato'] = m.id;
      this.mover(p, r, 'ATO_ELABORACAO', 'PARECER', `Parecer nº ${par.numero} assinado (favorável). Ato Declaratório gerado vinculado ao parecer.`);
    } else {
      this.mover(p, r, 'HOMOLOGACAO', 'PARECER', `Parecer nº ${par.numero} assinado (favorável). Tipo de Concessão Parecer Fiscal: encaminhado à homologação do Secretário.`);
    }
    return p;
  }
  private contrapartida(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'ATO_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, 'ATO_ELABORACAO');
    const c = r.corpo;
    if (!c?.natureza || !c.meta || !c.prazo || !c.periodicidade) throw negocio('Informe natureza, meta, unidade, prazo e periodicidade da contrapartida.');
    const meta = c.unidade === 'MOEDA' ? 'investimento de ' + moeda(c.meta) : c.unidade === 'POSTOS' ? `geração de ${c.meta} postos de trabalho` : 'manutenção da atividade';
    const descricao = `${meta} até ${br(c.prazo)}, com comprovação ${{ UNICA: 'única', SEMESTRAL: 'semestral', ANUAL: 'anual' }[c.periodicidade as string]}`;
    p.contrapartidas.push({ id: ++this.seq, natureza: c.natureza, meta: c.meta, unidade: c.unidade, prazo: c.prazo, periodicidade: c.periodicidade, realizado: 0, descricao });
    this.evento(p, r, 'CONTRAPARTIDA', 'Contrapartida incluída no ato: ' + descricao);
    this.recalcular(p, r);
    return p;
  }
  private excluirContrapartida(pid: number, cid: number, r: Requisicao) {
    this.exigirPermissao(r, 'ATO_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, 'ATO_ELABORACAO');
    p.contrapartidas = p.contrapartidas.filter((c) => c.id !== cid);
    this.recalcular(p, r);
    return p;
  }
  private concluirAto(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'ATO_ELABORAR');
    const p = this.p(pid);
    this.exigir(p, 'ATO_ELABORACAO');
    this.exigirResponsavel(p, r);
    if (p.beneficio.exigeTermo && !p.desvios.termoAssinadoEm) throw negocio('O benefício exige termo de acordo assinado pela empresa. Envie o termo e aguarde a devolução assinada.');
    const ato = this.finalizar(p, 'ato', r);
    this.mover(p, r, 'HOMOLOGACAO', 'ATO', `Ato Declaratório nº ${ato.numero} concluído e encaminhado, com o parecer, à homologação do Secretário.`);
    return p;
  }
  private homologar(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PARECER_HOMOLOGAR');
    const p = this.p(pid);
    this.exigir(p, 'HOMOLOGACAO');
    const nome = this.usuario(r).nome;
    p.homologadoEm = agora();
    p.homologadoPor = nome;
    const par = [...p.pecas].reverse().find((x) => x.tipo === 'PARECER');
    if (par?.conclusao === 'DESFAVORAVEL') {
      p.desvios.decisaoEm = agora();
      this.mover(p, r, 'INDEFERIDO', 'HOMOLOGACAO', `Indeferimento homologado pelo ${nome} · motivo: ${p.desvios.motivoDecisao}. O contribuinte foi comunicado; o prazo recursal corre da ciência.`);
      this.comunicarModelo(p, 'INDEFERIMENTO', 'COM_INDEFERIMENTO', 'Decisão de indeferimento — prazo para recurso',
        { justificativaTecnica: this.valores[pid]?.['parecer']?.['justificativaTecnica'] ?? '' }, this.inteiro('prazo.recurso_dias', 30), true);
      return p;
    }
    if (p.beneficio.geraAto) {
      p.publicacao.encaminhadoEm = agora();
      this.mover(p, r, 'PUBLICACAO', 'HOMOLOGACAO', `Parecer e Ato Declaratório homologados pelo ${nome}. Matéria encaminhada para publicação no Diário Oficial.`);
    } else {
      p.vigenciaInicio = hoje();
      p.vigenciaFim = p.beneficio.prazoMeses ? somarMeses(hoje(), p.beneficio.prazoMeses) : null;
      this.mover(p, r, 'CIENCIA_PENDENTE', 'HOMOLOGACAO', `Parecer homologado pelo ${nome}. Tipo de Concessão Parecer Fiscal: a homologação conclui a concessão, sem ato nem publicação. Aguardando a ciência do contribuinte.`);
      this.comunicar(p, 'HOMOLOGACAO', 'Parecer homologado — ' + p.beneficio.assunto,
        `Prezado contribuinte,\n\nComunicamos que o parecer favorável no processo nº ${p.resumo.numero}, de ${p.interessado.razaoSocial}, referente a ${p.beneficio.assunto}, foi homologado pelo Secretário de Estado da Fazenda.\n\nRegistre a ciência pelo portal. É da ciência que correm os prazos.`,
        this.inteiro('prazo.ciencia.portal_dias', 30), true);
    }
    return p;
  }
  private publicacao(pid: number, fase: string, r: Requisicao) {
    this.exigirPermissao(r, 'ATO_PUBLICAR');
    const p = this.p(pid);
    this.exigir(p, 'PUBLICACAO');
    const pub = p.publicacao;
    if (fase === 'RECEBIMENTO') { pub.recebidoEm = agora(); this.evento(p, r, 'PUBLICACAO', 'Matéria recebida pelo Gabinete para publicação.'); }
    if (fase === 'APROVACAO') {
      if (!pub.recebidoEm) throw negocio('Registre antes o recebimento da matéria.');
      pub.aprovadoEm = agora();
      this.evento(p, r, 'PUBLICACAO', 'Matéria aprovada para publicação.');
    }
    if (fase === 'PUBLICACAO') {
      if (!pub.aprovadoEm) throw negocio('Registre antes a aprovação da matéria.');
      const c = r.corpo ?? {};
      if (!c.data || !String(c.edicao ?? '').trim()) throw negocio('Informe a data e a edição do Diário Oficial.');
      if (c.data > hoje()) throw negocio('A data de publicação não pode ser futura.');
      Object.assign(pub, { publicadoEm: c.data, edicao: c.edicao.trim(), pagina: c.pagina ?? null });
      p.vigenciaInicio = c.data;
      p.vigenciaFim = p.beneficio.prazoMeses ? somarMeses(c.data, p.beneficio.prazoMeses) : null;
      this.mover(p, r, 'CIENCIA_PENDENTE', 'PUBLICACAO', `Ato Declaratório publicado no Diário Oficial em ${br(c.data)} · edição ${pub.edicao}. A vigência começa a contar. Aguardando a ciência do contribuinte.`);
      const ato = p.pecas.find((x) => x.tipo === 'ATO_DECLARATORIO');
      this.comunicar(p, 'DEFERIMENTO', 'Ato Declaratório publicado no Diário Oficial — ' + p.beneficio.assunto,
        `Prezado contribuinte,\n\nComunicamos que a solicitação constante do processo nº ${p.resumo.numero}, de ${p.interessado.razaoSocial}, foi DEFERIDA, e o Ato Declaratório nº ${ato?.numero} foi publicado no Diário Oficial do Estado em ${br(c.data)}.\n\nRegistre a ciência pelo portal. É da ciência que correm os prazos.`,
        this.inteiro('prazo.ciencia.portal_dias', 30), true);
    }
    this.recalcular(p, r);
    return p;
  }
  private ciencia(pid: number, tipo: 'PORTAL' | 'PRESENCIAL', r: Requisicao) {
    if (tipo === 'PRESENCIAL') this.exigirPermissao(r, 'CIENCIA_REGISTRAR');
    const p = this.p(pid);
    if (DECISOES.includes(p.resumo.status)) return this.cienciaDecisao(p, tipo, r);
    this.exigir(p, 'CIENCIA_PENDENTE');
    const nome = this.usuario(r).nome;
    Object.assign(p, { cienciaEm: agora(), cienciaTipo: tipo, cienciaPor: nome });
    (this.d.comunicacoes[pid] ?? []).filter((c) => c.marcoProcesso && !c.cienciaEm).forEach((c) => Object.assign(c, { cienciaEm: agora(), cienciaTipo: tipo }));
    const como = tipo === 'PORTAL' ? 'pelo contribuinte no portal' : 'presencialmente no Atendimento por ' + nome;
    if (p.beneficio.geraAto) this.mover(p, r, 'VIGENTE', 'CIENCIA', `Ciência registrada ${como}. Benefício vigente e incluído no Cadastro Estadual de Beneficiários.`);
    else this.mover(p, r, 'ARQUIVAMENTO_PENDENTE', 'CIENCIA', `Ciência registrada ${como}. Processo aguardando arquivamento.`);
    this.integrar(p, 'REGISTRAR_BENEFICIO', 'Registro do benefício concedido no cadastro', 'RF-06', { confirmacao: 'Benefício registrado no cadastro do contribuinte' });
    return p;
  }
  private arquivar(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCESSO_ARQUIVAR');
    const p = this.p(pid);
    if (p.resumo.status === 'INDEFERIDO') {
      const fim = p.desvios.fimPrazoRecursal;
      if (!fim) throw negocio('Aguarde a ciência do indeferimento: é dela que corre o prazo recursal.');
      if (fim >= hoje()) throw negocio(`O prazo recursal termina em ${br(fim)}. Arquive depois dessa data.`);
      p.arquivadoEm = agora();
      this.mover(p, r, 'ARQUIVADO', 'ARQUIVAMENTO', 'Processo arquivado: indeferimento definitivo, sem recurso no prazo.');
      return p;
    }
    this.exigir(p, 'ARQUIVAMENTO_PENDENTE');
    p.arquivadoEm = agora();
    this.mover(p, r, 'CONCEDIDO_ARQUIVADO', 'ARQUIVAMENTO', 'Processo arquivado. Benefício concedido por parecer homologado, em acompanhamento pelo monitoramento.');
    return p;
  }

  // ===================================================================== fase 2: desvios do fluxo
  private cienciaDecisao(p: ProcessoDetalhe, tipo: 'PORTAL' | 'PRESENCIAL', r: Requisicao) {
    if (tipo === 'PRESENCIAL') this.exigirPermissao(r, 'CIENCIA_REGISTRAR');
    if (p.desvios.decisaoCienciaEm) throw negocio('A ciência desta decisão já foi registrada.');
    p.desvios.decisaoCienciaEm = agora();
    (this.d.comunicacoes[p.resumo.id] ?? []).filter((c) => c.marcoProcesso && !c.cienciaEm).forEach((c) => Object.assign(c, { cienciaEm: agora(), cienciaTipo: tipo }));
    this.recalcular(p, r);
    this.evento(p, r, 'CIENCIA_DECISAO', `Ciência da decisão (${p.resumo.statusRotulo.toLowerCase()}) registrada · ${tipo.toLowerCase()}. Prazo recursal até ${br(p.desvios.fimPrazoRecursal!)}.`);
    return p;
  }
  /** Fim de diligência, manifestação ou instrução externa: volta à situação anterior na Tributação. */
  private voltar(p: ProcessoDetalhe, r: Requisicao, tipo: string, descricao: string) {
    const destino = (p.desvios.statusRetorno as StatusProcesso | null) ?? 'ANALISE_JURIDICA';
    p.desvios.statusRetorno = null;
    this.mover(p, r, destino, tipo, descricao);
  }
  private abrirDiligencia(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'ANALISE_JURIDICA', 'PARECER_ELABORACAO');
    this.exigirResponsavel(p, r);
    const c = r.corpo ?? {};
    if (!c.tipo || !String(c.descricao ?? '').trim()) throw negocio('Informe o tipo e o que está sendo solicitado ao contribuinte.');
    const dias = this.inteiro('prazo.diligencia_dias', 15);
    const x = { id: ++this.seq, tipo: c.tipo, descricao: String(c.descricao).trim(), prazo: somarDias(hoje(), dias), abertaEm: agora(), abertaPor: this.usuario(r).nome,
      resposta: null, documentoId: null, respondidaEm: null, respondidaPor: null, situacao: 'ABERTA' as const };
    p.desvios.diligencias.push(x);
    this.comunicarModelo(p, 'DILIGENCIA', 'COM_DILIGENCIA', 'Diligência — ' + x.descricao, { solicitacao: x.descricao }, dias, false);
    p.desvios.statusRetorno = p.resumo.status;
    this.mover(p, r, 'DILIGENCIA', 'DILIGENCIA', `Diligência aberta (${String(c.tipo).toLowerCase()}): ${x.descricao} · prazo até ${br(x.prazo)}. O processo aguarda a resposta do contribuinte.`);
    return p;
  }
  private diligencia(p: ProcessoDetalhe, did: number) {
    const x = p.desvios.diligencias.find((d) => d.id === did);
    if (!x) throw new ErroDemo(404, 'Não encontrado', 'Diligência não encontrada: ' + did);
    return x;
  }
  private cancelarDiligencia(pid: number, did: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'DILIGENCIA');
    this.exigirResponsavel(p, r);
    const motivo = String(r.corpo?.motivo ?? '').trim();
    if (!motivo) throw negocio('Informe o motivo do cancelamento.');
    const x = this.diligencia(p, did);
    Object.assign(x, { situacao: 'CANCELADA', resposta: 'Cancelada: ' + motivo });
    this.voltar(p, r, 'DILIGENCIA', `Diligência cancelada: ${x.descricao} · ${motivo}. O processo voltou à análise.`);
    return p;
  }
  private responderDiligencia(pid: number, did: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.exigir(p, 'DILIGENCIA');
    const x = this.diligencia(p, did);
    if (x.situacao !== 'ABERTA') throw negocio('Esta diligência já foi respondida ou cancelada.');
    const fd = r.corpo as FormData;
    const resposta = String(fd.get('resposta') ?? '').trim();
    const f = fd.get('arquivo') as File | null;
    if (!resposta && !f) throw negocio('Informe a resposta ou anexe o documento solicitado.');
    if (x.tipo === 'DOCUMENTO' && !f) throw negocio('A diligência solicita documento: anexe o arquivo.');
    if (f) {
      const doc = this.anexarLivre(p, r, f, 'Resposta à diligência: ' + x.descricao);
      x.documentoId = doc.id;
    }
    Object.assign(x, { resposta: resposta || null, respondidaEm: agora(), respondidaPor: this.usuario(r).nome, situacao: 'RESPONDIDA' });
    (this.d.comunicacoes[pid] ?? []).filter((c) => c.tipo === 'DILIGENCIA' && !c.cienciaEm).forEach((c) => Object.assign(c, { cienciaEm: agora(), cienciaTipo: 'PORTAL' }));
    this.voltar(p, r, 'DILIGENCIA', `Diligência respondida pelo contribuinte: ${x.descricao}. O processo voltou à análise.`);
    return this.processoPortal(pid, r);
  }
  /** Documento avulso enviado pelo portal (resposta de diligência, termo assinado). */
  private anexarLivre(p: ProcessoDetalhe, r: Requisicao, f: File, descricao: string) {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(f.type)) throw negocio('Formato não aceito. Envie PDF, PNG ou JPEG.');
    if (f.size > 20 * 1024 * 1024) throw negocio('O arquivo excede o limite de 20 MB.');
    const atual = { id: ++this.seq, documentoExigidoId: null, descricao, nomeArquivo: f.name, tamanho: f.size, situacao: 'ENVIADO' as const,
      motivoRecusa: null, origem: 'PORTAL' as const, enviadoEm: agora(), enviadoPor: this.usuario(r).login, analisadoEm: null };
    p.documentosExigidos.push({ documentoExigidoId: null, descricao, obrigatorio: false, atual });
    this.evento(p, r, 'DOCUMENTO', `Documento anexado (portal): ${descricao} · ${f.name}`);
    return atual;
  }
  private solicitarManifestacao(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'ANALISE_JURIDICA', 'PARECER_ELABORACAO', 'MANIFESTACAO');
    this.exigirResponsavel(p, r);
    const c = r.corpo ?? {};
    const s = this.d.setores.find((x) => x.id === c.setorId);
    if (!s || s.tipo !== 'INTERNO') throw negocio('Escolha o setor interno que deve se manifestar.');
    if (!String(c.pergunta ?? '').trim()) throw negocio('Descreva o que o setor deve esclarecer.');
    const x = { id: ++this.seq, setorId: s.id, setor: s.sigla, pergunta: String(c.pergunta).trim(), prazo: somarDias(hoje(), this.inteiro('prazo.manifestacao_dias', 10)),
      solicitadaEm: agora(), solicitadaPor: this.usuario(r).nome, resposta: null, respondidaEm: null, respondidaPor: null, situacao: 'PENDENTE' as const };
    p.desvios.manifestacoes.push(x);
    const desc = `Manifestação complementar solicitada a ${s.sigla}: ${x.pergunta} · prazo até ${br(x.prazo)}.`;
    if (p.resumo.status === 'MANIFESTACAO') { this.evento(p, r, 'MANIFESTACAO', desc); this.recalcular(p, r); }
    else {
      p.desvios.statusRetorno = p.resumo.status;
      this.mover(p, r, 'MANIFESTACAO', 'MANIFESTACAO', desc + ' O parecer não pode ser finalizado enquanto houver manifestação pendente.');
    }
    return p;
  }
  private responderManifestacao(pid: number, mid: number, r: Requisicao) {
    this.exigirPermissao(r, 'MANIFESTACAO_RESPONDER');
    const p = this.p(pid);
    this.exigir(p, 'MANIFESTACAO');
    const x = p.desvios.manifestacoes.find((m) => m.id === mid);
    if (!x) throw new ErroDemo(404, 'Não encontrado', 'Manifestação não encontrada: ' + mid);
    if (x.situacao !== 'PENDENTE') throw negocio('Esta manifestação já foi respondida.');
    if (x.setor !== (this.d.setorDe[this.usuario(r).login] ?? null)) throw negocio('A manifestação foi solicitada a outro setor.');
    const texto = String(r.corpo?.texto ?? '').trim();
    if (!texto) throw negocio('Escreva a manifestação do setor.');
    Object.assign(x, { resposta: texto, respondidaEm: agora(), respondidaPor: this.usuario(r).nome, situacao: 'RESPONDIDA' });
    if (!p.desvios.manifestacoes.some((m) => m.situacao === 'PENDENTE')) {
      this.voltar(p, r, 'MANIFESTACAO', `Manifestação de ${x.setor} registrada. Não há manifestações pendentes: o processo voltou à análise.`);
    } else {
      this.evento(p, r, 'MANIFESTACAO', `Manifestação de ${x.setor} registrada. Ainda há manifestações pendentes.`);
      this.recalcular(p, r);
    }
    return p;
  }
  private encaminharInstrucao(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'ANALISE_JURIDICA', 'PARECER_ELABORACAO');
    this.exigirResponsavel(p, r);
    if (!p.beneficio.exigeInstrucaoExterna) throw negocio('O benefício não exige instrução prévia pela Agência nem deliberação do CONDI.');
    p.desvios.statusRetorno = p.resumo.status;
    p.desvios.instrucaoEnviadaEm = agora();
    p.desvios.instrucaoResultado = null;
    this.mover(p, r, 'INSTRUCAO_EXTERNA', 'INSTRUCAO_EXTERNA', 'Projeto encaminhado para instrução pela Agência de Desenvolvimento e deliberação do CONDI. O retorno é registrado no processo.');
    return p;
  }
  private registrarInstrucao(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'INSTRUCAO_EXTERNA');
    const c = r.corpo ?? {};
    if (c.resultado !== 'FAVORAVEL' && c.resultado !== 'DESFAVORAVEL') throw negocio('Informe se a deliberação foi favorável ou desfavorável.');
    if (!String(c.detalhe ?? '').trim()) throw negocio('Informe a deliberação (número, data e conclusão).');
    p.desvios.instrucaoResultado = c.resultado;
    p.desvios.instrucaoDetalhe = String(c.detalhe).trim();
    this.voltar(p, r, 'INSTRUCAO_EXTERNA', `Retorno da instância externa registrado: deliberação ${c.resultado.toLowerCase()} · ${p.desvios.instrucaoDetalhe}. O processo voltou à análise.`);
    return p;
  }
  private enviarTermo(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'ATO_ELABORACAO');
    this.exigirResponsavel(p, r);
    if (!p.beneficio.exigeTermo) throw negocio('O modelo deste benefício não prevê termo de acordo.');
    if (p.desvios.termoAssinadoEm) throw negocio('O termo de acordo já foi devolvido assinado.');
    const e = this.editor(pid, 'ato', r);
    if (e.pendentes > 0) throw negocio(`Preencha as cláusulas do ato antes de enviar o termo: há ${e.pendentes} tag(s) pendente(s).`);
    const modelo = this.d.textos.find((t) => t.tipo === 'TERMO_ACORDO');
    const termo = p.pecas.find((x) => x.tipo === 'TERMO_ACORDO') ?? this.novaPeca(p, r, 'TERMO_ACORDO');
    const valores = { ...this.resolvidas(p), ...Object.fromEntries(e.tags.filter((t) => t.valor).map((t) => [t.chave, t.valor!])) };
    Object.assign(termo, { situacao: 'ASSINADA', assinadaEm: agora(), textoPadrao: modelo?.nome ?? null, corpoFinal: this.resolverTexto(modelo?.corpo ?? '', valores) });
    const dias = this.inteiro('prazo.termo_dias', 15);
    Object.assign(p.desvios, { termoEnviadoEm: agora(), termoPrazo: somarDias(hoje(), dias), termoTexto: termo.corpoFinal });
    this.comunicarModelo(p, 'TERMO', 'COM_TERMO', 'Termo de acordo disponível para assinatura', {}, dias, false);
    this.mover(p, r, 'TERMO_ACORDO', 'TERMO', `Minuta do termo de acordo nº ${termo.numero} disponibilizada à empresa para assinatura digital · prazo até ${br(p.desvios.termoPrazo!)}.`);
    return p;
  }
  private prorrogarTermo(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.exigir(p, 'TERMO_ACORDO');
    const c = r.corpo ?? {};
    const dias = Number(c.dias);
    if (!(dias >= 1 && dias <= 60) || !String(c.justificativa ?? '').trim()) throw negocio('Informe de 1 a 60 dias e a justificativa da prorrogação.');
    p.desvios.termoPrazo = somarDias(p.desvios.termoPrazo ?? hoje(), dias);
    this.evento(p, r, 'TERMO', `Prazo do termo de acordo prorrogado por ${dias} dia(s), até ${br(p.desvios.termoPrazo)} · ${String(c.justificativa).trim()}`);
    this.recalcular(p, r);
    return p;
  }
  private devolverTermo(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.exigir(p, 'TERMO_ACORDO');
    const f = (r.corpo as FormData).get('arquivo') as File | null;
    if (!f) throw negocio('Anexe o termo de acordo assinado digitalmente.');
    this.anexarLivre(p, r, f, 'Termo de acordo assinado pela empresa');
    p.desvios.termoAssinadoEm = agora();
    (this.d.comunicacoes[pid] ?? []).filter((c) => c.tipo === 'TERMO' && !c.cienciaEm).forEach((c) => Object.assign(c, { cienciaEm: agora(), cienciaTipo: 'PORTAL' }));
    this.mover(p, r, 'ATO_ELABORACAO', 'TERMO', 'Termo de acordo devolvido assinado pela empresa. O ato pode ser concluído.');
    return this.processoPortal(pid, r);
  }
  private apresentarRecurso(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.exigir(p, 'INDEFERIDO', 'SUSPENSO', 'CASSADO');
    const c = r.corpo ?? {};
    if (String(c.razoes ?? '').trim().length < 20) throw negocio('Apresente as razões do recurso (ao menos 20 caracteres).');
    if (!c.cienteSemEfeitoSuspensivo) throw negocio('Declare ciência de que o recurso não tem efeito suspensivo.');
    if (!p.desvios.decisaoCienciaEm) this.cienciaDecisao(p, 'PORTAL', r);
    const fim = p.desvios.fimPrazoRecursal!;
    if (fim < hoje()) throw negocio(`O prazo recursal terminou em ${br(fim)}.`);
    const decisao = p.resumo.status === 'SUSPENSO' ? 'SUSPENSAO' : p.resumo.status === 'CASSADO' ? 'CASSACAO' : 'INDEFERIMENTO';
    p.desvios.recursos.push({ id: ++this.seq, decisaoRecorrida: decisao, razoes: String(c.razoes).trim(), apresentadoEm: agora(), apresentadoPor: this.usuario(r).nome,
      encaminhadoEm: null, resultado: null, numeroAcordao: null, fundamento: null, decididoEm: null });
    this.mover(p, r, 'RECURSO', 'RECURSO', `Recurso contra ${decisao.toLowerCase()} apresentado pelo contribuinte, com declaração de ciência do efeito não suspensivo. Aguardando encaminhamento ao Conselho.`);
    return this.processoPortal(pid, r);
  }
  private recursoAberto(p: ProcessoDetalhe) {
    const x = [...p.desvios.recursos].reverse().find((y) => !y.resultado);
    if (!x) throw negocio('Não há recurso pendente neste processo.');
    return x;
  }
  private encaminharRecurso(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'RECURSO_ENCAMINHAR');
    const p = this.p(pid);
    this.exigir(p, 'RECURSO');
    const x = this.recursoAberto(p);
    if (x.encaminhadoEm) throw negocio('O recurso já foi encaminhado ao Conselho.');
    x.encaminhadoEm = agora();
    this.tramitar(p, r, 'RECURSO', 'RECURSO', 'Recurso encaminhado ao Conselho de Recursos Fiscais com as razões e os documentos apresentados.');
    return p;
  }
  private decidirRecurso(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'RECURSO_ENCAMINHAR');
    const p = this.p(pid);
    this.exigir(p, 'RECURSO');
    const x = this.recursoAberto(p);
    if (!x.encaminhadoEm) throw negocio('Encaminhe antes o recurso ao Conselho.');
    const c = r.corpo ?? {};
    if (!['PROVIDO', 'NAO_PROVIDO'].includes(c.resultado) || !String(c.numeroAcordao ?? '').trim()) throw negocio('Informe o resultado e o número do acórdão do Conselho.');
    Object.assign(x, { resultado: c.resultado, numeroAcordao: String(c.numeroAcordao).trim(), fundamento: c.fundamento || null, decididoEm: agora() });
    const provido = c.resultado === 'PROVIDO';
    const desc = `Decisão do Conselho registrada: recurso ${provido ? 'provido' : 'não provido'} · acórdão ${x.numeroAcordao}. `;
    let consequencia: string;
    if (x.decisaoRecorrida === 'INDEFERIMENTO') {
      if (provido) {
        Object.assign(p.desvios, { motivoDecisao: null, decisaoEm: null, decisaoCienciaEm: null });
        p.homologadoEm = null;
        p.homologadoPor = null;
        consequencia = 'A solicitação volta à análise jurídica da Secretaria para novo parecer.';
        this.mover(p, r, 'ANALISE_JURIDICA', 'RECURSO', desc + consequencia);
      } else {
        consequencia = 'O indeferimento foi mantido e o processo foi arquivado.';
        p.arquivadoEm = agora();
        this.mover(p, r, 'ARQUIVADO', 'RECURSO', desc + consequencia);
      }
    } else if (provido) {
      const proc = [...p.desvios.procedimentos].reverse().find((y) => y.situacao === 'DECIDIDO');
      const volta = (proc && this.anteriorProc[proc.id]) || 'VIGENTE';
      if (proc) Object.assign(proc, { situacao: 'RESTABELECIDO', encerradoEm: agora(), encerramento: 'Recurso provido pelo Conselho · acórdão ' + x.numeroAcordao });
      if (x.decisaoRecorrida === 'CASSACAO' && p.vigenciaInicio && p.beneficio.prazoMeses) p.vigenciaFim = somarMeses(p.vigenciaInicio, p.beneficio.prazoMeses);
      Object.assign(p.desvios, { motivoDecisao: null, statusRetorno: null });
      consequencia = 'O benefício foi restabelecido.';
      this.mover(p, r, volta, 'RECURSO', desc + consequencia);
    } else {
      const cassacao = x.decisaoRecorrida === 'CASSACAO';
      consequencia = `A decisão de ${cassacao ? 'cassação' : 'suspensão'} foi mantida.`;
      this.mover(p, r, cassacao ? 'CASSADO' : 'SUSPENSO', 'RECURSO', desc + consequencia);
    }
    this.comunicarModelo(p, 'DECISAO_RECURSO', 'COM_DECISAO_RECURSO', 'Decisão do recurso — ' + (provido ? 'provido' : 'não provido'),
      { resultadoRecurso: provido ? 'DAR PROVIMENTO ao recurso' : 'NEGAR PROVIMENTO ao recurso', consequencia }, null, false);
    return p;
  }
  private abrirProcedimento(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCEDIMENTO_ABRIR');
    const p = this.p(pid);
    const c = r.corpo ?? {};
    if (c.tipo === 'CASSACAO') this.exigir(p, 'VIGENTE', 'CONCEDIDO_ARQUIVADO', 'SUSPENSO');
    else this.exigir(p, ...EM_FRUICAO);
    if (!c.tipo || !this.d.listas.motivosProcedimento.includes(c.motivo)) throw negocio('Informe o tipo e o motivo estruturado do procedimento.');
    if (!String(c.fundamentacao ?? '').trim()) throw negocio('Informe a fundamentação do procedimento.');
    if (p.desvios.procedimentos.some((x) => x.situacao === 'ABERTO')) throw negocio('Já existe procedimento em curso para este benefício.');
    const dias = Number(c.prazoDias) || this.d.listas.prazoRegularizacao;
    const x = { id: ++this.seq, tipo: c.tipo, motivo: c.motivo, fundamentacao: String(c.fundamentacao).trim(), prazoRegularizacao: somarDias(hoje(), dias), abertoEm: agora(),
      abertoPor: this.usuario(r).nome, situacao: 'ABERTO' as const, decididoEm: null, decididoPor: null, encerradoEm: null, encerramento: null };
    p.desvios.procedimentos.push(x);
    this.anteriorProc[x.id] = p.resumo.status === 'SUSPENSO' && p.desvios.statusRetorno ? (p.desvios.statusRetorno as StatusProcesso) : p.resumo.status;
    const nome = c.tipo === 'CASSACAO' ? 'cassação' : 'suspensão';
    this.comunicarModelo(p, 'NOTIFICACAO_PREVIA', 'COM_NOTIFICACAO_PREVIA', `Notificação prévia de ${nome} do benefício`,
      { procedimento: nome, motivoDecisao: c.motivo, fundamentacao: x.fundamentacao }, dias, false);
    this.evento(p, r, 'PROCEDIMENTO', `Procedimento de ${nome} iniciado · motivo: ${c.motivo}. Notificação prévia enviada com prazo para regularizar até ${br(x.prazoRegularizacao)}.`);
    this.recalcular(p, r);
    return p;
  }
  private procedimentoAberto(p: ProcessoDetalhe) {
    const x = [...p.desvios.procedimentos].reverse().find((y) => y.situacao === 'ABERTO');
    if (!x) throw negocio('Não há procedimento de suspensão ou cassação em curso.');
    return x;
  }
  private decidirProcedimento(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCEDIMENTO_DECIDIR');
    const p = this.p(pid);
    const x = this.procedimentoAberto(p);
    if (x.prazoRegularizacao >= hoje()) throw negocio(`Aguarde o fim do prazo de regularização (${br(x.prazoRegularizacao)}) antes de decidir.`);
    const nome = this.usuario(r).nome;
    Object.assign(x, { situacao: 'DECIDIDO', decididoEm: agora(), decididoPor: nome });
    Object.assign(p.desvios, { motivoDecisao: x.motivo, decisaoEm: agora(), decisaoCienciaEm: null });
    const recurso = this.inteiro('prazo.recurso_dias', 30);
    if (x.tipo === 'SUSPENSAO') {
      p.desvios.statusRetorno = this.anteriorProc[x.id] ?? p.resumo.status;
      this.mover(p, r, 'SUSPENSO', 'SUSPENSAO', `Suspensão do benefício decidida por ${nome} · motivo: ${x.motivo}. Intervalo de suspensão aberto até o restabelecimento.`);
      this.comunicarModelo(p, 'SUSPENSAO', 'COM_SUSPENSAO', 'Suspensão do benefício — prazo para recurso', {}, recurso, true);
    } else {
      p.desvios.statusRetorno = null;
      p.vigenciaFim = hoje();
      this.mover(p, r, 'CASSADO', 'CASSACAO', `Cassação do benefício decidida por ${nome} · motivo: ${x.motivo}. Vigência encerrada e impedimento de pleitear novos incentivos por período determinado.`);
      this.comunicarModelo(p, 'CASSACAO', 'COM_CASSACAO', 'Cassação do benefício — prazo para recurso', {}, recurso, true);
    }
    return p;
  }
  private arquivarProcedimento(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCEDIMENTO_DECIDIR');
    const p = this.p(pid);
    const x = this.procedimentoAberto(p);
    const motivo = String(r.corpo?.motivo ?? '').trim();
    if (!motivo) throw negocio('Informe por que o procedimento foi encerrado (ex.: regularização comprovada).');
    Object.assign(x, { situacao: 'ARQUIVADO', encerradoEm: agora(), encerramento: motivo });
    this.evento(p, r, 'PROCEDIMENTO', `Procedimento de ${x.tipo.toLowerCase()} arquivado sem decisão: ${motivo}`);
    this.recalcular(p, r);
    return p;
  }
  private restabelecer(pid: number, r: Requisicao) {
    this.exigirPermissao(r, 'PROCEDIMENTO_DECIDIR');
    const p = this.p(pid);
    this.exigir(p, 'SUSPENSO');
    const motivo = String(r.corpo?.motivo ?? '').trim();
    if (!motivo) throw negocio('Informe o fundamento do restabelecimento.');
    const proc = [...p.desvios.procedimentos].reverse().find((y) => y.situacao === 'DECIDIDO');
    if (proc) Object.assign(proc, { situacao: 'RESTABELECIDO', encerradoEm: agora(), encerramento: motivo });
    const volta = (p.desvios.statusRetorno as StatusProcesso | null) ?? 'VIGENTE';
    Object.assign(p.desvios, { statusRetorno: null, motivoDecisao: null });
    this.mover(p, r, volta, 'RESTABELECIMENTO', `Benefício restabelecido por ${this.usuario(r).nome} · ${motivo}. Intervalo de suspensão encerrado.`);
    return p;
  }

  // ===================================================================== portal
  private representado(r: Requisicao, interessadoId: number) {
    this.exigirPermissao(r, 'PORTAL_CONTRIBUINTE');
    if (!(this.d.representantes[this.usuario(r).login] ?? []).includes(interessadoId)) throw new ErroDemo(403, 'Acesso negado', 'Usuário não representa o interessado.');
  }
  private interessado(id: number) {
    return this.todos().find((p) => p.interessado.id === id)!.interessado;
  }
  private pendencias(iid: number) {
    const out: unknown[] = [];
    const dif = (prazo: string | null) => (prazo ? Math.round((new Date(prazo + 'T12:00:00').getTime() - new Date(hoje() + 'T12:00:00').getTime()) / 86_400_000) : null);
    for (const p of this.todos().filter((x) => x.resumo.interessadoId === iid)) {
      const cs = this.d.comunicacoes[p.resumo.id] ?? [];
      if (p.resumo.status === 'EM_FORMALIZACAO') {
        const rec = p.documentosExigidos.filter((i) => i.atual?.situacao === 'RECUSADO');
        const prazo = cs.find((c) => c.tipo === 'DOCUMENTO_RECUSADO')?.prazo ?? null;
        const faltam = this.pendentes(p);
        out.push(rec.length
          ? { id: 'rec' + rec[0].atual!.id, processoId: p.resumo.id, numeroProcesso: p.resumo.numero, tipo: 'Documento recusado', titulo: 'Novo envio: ' + rec[0].descricao, contexto: `Processo ${p.resumo.numero} · recusado pelo Atendimento · ${rec[0].atual!.motivoRecusa}`, prazo, diasRestantes: dif(prazo), acao: 'Reenviar documento', comunicacaoId: null }
          : { id: 'form' + p.resumo.id, processoId: p.resumo.id, numeroProcesso: p.resumo.numero, tipo: faltam.length ? 'Documento obrigatório' : 'Envio', titulo: faltam.length ? `Completar ${faltam.length} documento(s) obrigatório(s)` : 'Enviar a solicitação para formalização', contexto: `Processo ${p.resumo.numero} · ${p.beneficio.assunto} · a formalização não se completa sem os documentos obrigatórios`, prazo: null, diasRestantes: null, acao: faltam.length ? 'Enviar documentos' : 'Enviar solicitação', comunicacaoId: null });
      }
      const base = { processoId: p.resumo.id, numeroProcesso: p.resumo.numero };
      if (p.resumo.status === 'DILIGENCIA') {
        p.desvios.diligencias.filter((x) => x.situacao === 'ABERTA').forEach((x) => out.push({ ...base, id: 'dil' + x.id, tipo: 'Diligência', titulo: x.descricao,
          contexto: `Processo ${p.resumo.numero} · solicitado pela análise em ${br(x.abertaEm)} · sem resposta no prazo, a solicitação pode ser indeferida`, prazo: x.prazo, diasRestantes: dif(x.prazo), acao: 'Responder', comunicacaoId: null }));
      }
      if (p.resumo.status === 'TERMO_ACORDO') {
        out.push({ ...base, id: 'ter' + p.resumo.id, tipo: 'Assinatura', titulo: 'Termo de acordo aguardando assinatura digital', contexto: `Processo ${p.resumo.numero} · baixe a minuta, assine e devolva pelo sistema`,
          prazo: p.desvios.termoPrazo, diasRestantes: dif(p.desvios.termoPrazo), acao: 'Assinar termo', comunicacaoId: null });
      }
      if (DECISOES.includes(p.resumo.status)) {
        const decisao = p.resumo.status === 'INDEFERIDO' ? 'indeferimento' : p.resumo.status === 'CASSADO' ? 'cassação' : 'suspensão';
        if (!p.desvios.decisaoCienciaEm) {
          const marco = cs.find((c) => c.marcoProcesso && !c.cienciaEm);
          out.push({ ...base, id: 'cid' + p.resumo.id, tipo: 'Ciência', titulo: 'Registrar ciência da decisão de ' + decisao, contexto: `Processo ${p.resumo.numero} · motivo: ${p.desvios.motivoDecisao} · o prazo recursal corre da ciência`,
            prazo: marco?.prazo ?? null, diasRestantes: dif(marco?.prazo ?? null), acao: 'Registrar ciência', comunicacaoId: marco?.id ?? null });
        } else if (this.podeRecorrer(p)) {
          const fim = p.desvios.fimPrazoRecursal!;
          out.push({ ...base, id: 'rcs' + p.resumo.id, tipo: 'Prazo recursal', titulo: 'Recurso contra a decisão de ' + decisao, contexto: `Processo ${p.resumo.numero} · Conselho de Recursos Fiscais · sem efeito suspensivo`,
            prazo: fim, diasRestantes: dif(fim), acao: 'Apresentar recurso', comunicacaoId: null });
        }
      }
      if (p.resumo.status === 'CIENCIA_PENDENTE') {
        const marco = cs.find((c) => c.marcoProcesso && !c.cienciaEm);
        out.push({ id: 'cie' + p.resumo.id, processoId: p.resumo.id, numeroProcesso: p.resumo.numero, tipo: 'Ciência', titulo: p.beneficio.geraAto ? 'Registrar ciência do Ato Declaratório publicado' : 'Registrar ciência do parecer homologado', contexto: `Processo ${p.resumo.numero} · é da ciência que correm os prazos`, prazo: marco?.prazo ?? null, diasRestantes: dif(marco?.prazo ?? null), acao: 'Registrar ciência', comunicacaoId: marco?.id ?? null });
      }
    }
    return out;
  }
  private interessadosPortal(r: Requisicao) {
    this.exigirPermissao(r, 'PORTAL_CONTRIBUINTE');
    return (this.d.representantes[this.usuario(r).login] ?? []).map((id) => ({ interessado: this.interessado(id), pendencias: this.pendencias(id).length }))
      .sort((a, b) => a.interessado.razaoSocial.localeCompare(b.interessado.razaoSocial));
  }
  private painelPortal(iid: number, r: Requisicao) {
    this.representado(r, iid);
    const i = this.interessado(iid);
    const ps = this.todos().filter((p) => p.resumo.interessadoId === iid).map((p) => p.resumo).sort((a, b) => b.dataSolicitacao.localeCompare(a.dataSolicitacao));
    const cs = ps.flatMap((p) => this.d.comunicacoes[p.id] ?? []).sort((a, b) => b.enviadaEm.localeCompare(a.enviadaEm));
    const diretos = this.d.beneficios.map((b) => b.beneficio).filter((b) => b.ativo && b.tipoConcessao === 'ESCRITURACAO_FISCAL').map((b) => ({ beneficio: b, compativel: alcanca(b.alcance, i.cnaes) }));
    return { interessado: i, processos: ps, pendencias: this.pendencias(iid), comunicacoes: cs, fruicaoDireta: diretos };
  }
  private beneficiosPortal(iid: number, r: Requisicao) {
    this.representado(r, iid);
    const i = this.interessado(iid);
    return this.d.beneficios.map((b) => b.beneficio).filter((b) => b.ativo && (b.tipoConcessao === 'ATO_DECLARATORIO' || b.tipoConcessao === 'PARECER_FISCAL'))
      .map((b) => ({ beneficio: b, compativel: alcanca(b.alcance, i.cnaes) }));
  }
  private taxa(especie: string, valor: number) {
    const l = this.d.taxas.filter((t) => t.ativo && t.especie === especie);
    if (!l.length) throw negocio('Não há taxa cadastrada para a espécie ' + especie + '.');
    const t = l.find((x) => (x.valorMin == null && x.valorMax == null) || ((x.valorMin == null || x.valorMin === 0 || valor > x.valorMin) && (x.valorMax == null || valor <= x.valorMax))) ?? l[l.length - 1];
    return { especie, faixa: t.faixa, valor: t.isento ? 0 : t.valor, isento: t.isento };
  }
  private exigidos(especie: string) {
    return this.d.documentosExigidos.filter((d) => d.ativo && (!d.especie || d.especie === especie));
  }
  private solicitar(iid: number, r: Requisicao) {
    this.representado(r, iid);
    const c = r.corpo ?? {};
    const b = this.d.beneficios.map((x) => x.beneficio).find((x) => x.id === c.beneficioId);
    if (!b || !c.especie) throw negocio('Informe o benefício e a espécie da solicitação.');
    if (!(b.tipoConcessao === 'ATO_DECLARATORIO' || b.tipoConcessao === 'PARECER_FISCAL')) throw negocio(`O benefício ${b.assunto} é de ${b.tipoConcessaoRotulo}: a fruição é direta, sem pedido individual.`);
    if (c.especie === 'CONCESSAO' && !(c.valorPretendido > 0)) throw negocio('Informe o valor pretendido (renúncia estimada), que define a faixa da taxa.');
    const t = this.taxa(c.especie, c.valorPretendido ?? 0);
    const id = ++this.seq;
    const numero = `${new Date().getFullYear()}.0031.${String(this.seqNumero++).padStart(4, '0')}`;
    const u = this.usuario(r);
    const det: ProcessoDetalhe = {
      resumo: { id, numero, interessadoId: iid, razaoSocial: this.interessado(iid).razaoSocial, cnpj: this.interessado(iid).cnpj, beneficioId: b.id, beneficio: b.assunto,
        tipoConcessao: b.tipoConcessao, especie: c.especie, status: 'EM_FORMALIZACAO', statusRotulo: '', statusPortal: '', familia: 'CONTRIBUINTE', setor: this.setorDo('ATENDIMENTO'),
        responsavelId: null, responsavelNome: null, prioridade: 'NORMAL', valorPretendido: c.valorPretendido ?? null, dataSolicitacao: agora(), entradaSetorEm: agora(),
        diasNoSetor: 0, diasTotal: 0, divergenciaCnae: false, parado: false },
      interessado: this.interessado(iid), beneficio: b, taxaFaixa: t.faixa, taxaValor: t.valor, taxaPaga: false, taxaConferidaEm: null, requerimento: c.requerimento || null,
      solicitante: u.login, dataFormalizacao: null, protocoloLegado: null, elegibilidadeEm: null, elegibilidade: [], homologadoEm: null, homologadoPor: null,
      publicacao: { encaminhadoEm: null, recebidoEm: null, aprovadoEm: null, publicadoEm: null, edicao: null, pagina: null },
      cienciaEm: null, cienciaTipo: null, cienciaPor: null, vigenciaInicio: null, vigenciaFim: null, arquivadoEm: null, pecas: [], contrapartidas: [],
      documentosExigidos: this.exigidos(c.especie).map((x) => ({ documentoExigidoId: x.id, descricao: x.descricao, obrigatorio: x.obrigatorio, atual: null })),
      documentosPendentes: [], abas: [], acoes: {}, desvios: desviosVazios(),
    };
    this.d.processos[id] = det;
    this.d.historicos[id] = [];
    this.evento(det, r, 'SOLICITACAO', `Solicitação aberta no portal por ${u.nome} · ${b.assunto} · ${c.especie} · taxa ${t.isento ? 'isenta' : moeda(t.valor)} (${t.faixa})`, { statusNovo: 'EM_FORMALIZACAO' });
    this.recalcular(det, r);
    return this.processoPortal(id, r);
  }
  private processoPortal(pid: number, r: Requisicao) {
    const p = this.p(pid);
    this.representado(r, p.resumo.interessadoId);
    this.recalcular(p, r);
    const s = p.resumo.status;
    const ordem: Record<string, number> = { EM_FORMALIZACAO: 0, RECEBIDO: 1, INFORMACAO_FISCAL: 2, ANALISE_JURIDICA: 2, PARECER_ELABORACAO: 2, ATO_ELABORACAO: 2,
      DILIGENCIA: 2, MANIFESTACAO: 2, INSTRUCAO_EXTERNA: 2, TERMO_ACORDO: 2, HOMOLOGACAO: 3, PUBLICACAO: 4, CIENCIA_PENDENTE: 5 };
    const o = ordem[s] ?? 6;
    const E = (rotulo: string, i: number, quando: string | null) => ({ rotulo, concluida: o > i, atual: o === i, quando });
    const etapas = [E('Solicitação e documentos', 0, p.resumo.dataSolicitacao), E('Formalização no Atendimento', 1, p.dataFormalizacao), E('Análise pela Secretaria', 2, null)];
    if (!p.vigenciaInicio && p.desvios.decisaoEm) {
      // indeferimento: não há publicação nem vigência; a última etapa é a decisão e o prazo recursal
      const encerrado = s === 'ARQUIVADO';
      etapas.push({ rotulo: 'Homologação do indeferimento', concluida: true, atual: false, quando: p.homologadoEm },
        { rotulo: s === 'RECURSO' ? 'Recurso ao Conselho' : 'Decisão e prazo recursal', concluida: encerrado, atual: !encerrado, quando: p.desvios.decisaoEm });
    } else {
      etapas.push(E('Homologação pelo Secretário', 3, p.homologadoEm));
      if (p.beneficio.geraAto) etapas.push(E('Publicação no Diário Oficial', 4, p.publicacao.publicadoEm));
      etapas.push(E('Ciência e início dos prazos', 5, p.cienciaEm));
    }
    const ato = p.pecas.find((x) => x.tipo === 'ATO_DECLARATORIO');
    const publicado = !!p.publicacao.publicadoEm;
    return { resumo: p.resumo, beneficio: p.beneficio, taxaFaixa: p.taxaFaixa, taxaValor: p.taxaValor, requerimento: p.requerimento, documentos: p.documentosExigidos,
      documentosPendentes: s === 'EM_FORMALIZACAO' ? this.pendentes(p) : [], etapas, comunicacoes: this.d.comunicacoes[pid] ?? [],
      atoNumero: publicado ? ato?.numero ?? null : null, atoTexto: publicado ? ato?.corpoFinal ?? null : null, publicadoEm: p.publicacao.publicadoEm, edicao: p.publicacao.edicao,
      vigenciaInicio: p.vigenciaInicio, vigenciaFim: p.vigenciaFim, cienciaEm: p.cienciaEm, podeEditar: s === 'EM_FORMALIZACAO',
      desvios: p.desvios, podeResponderDiligencia: s === 'DILIGENCIA', podeDevolverTermo: s === 'TERMO_ACORDO', podeRecorrer: this.podeRecorrer(p),
      cienciaDecisaoPendente: DECISOES.includes(s) && !p.desvios.decisaoCienciaEm };
  }
  private podeRecorrer(p: ProcessoDetalhe) {
    if (!DECISOES.includes(p.resumo.status)) return false;
    const fim = p.desvios.fimPrazoRecursal;
    return !fim || fim >= hoje();
  }
  private cienciaComunicacao(cid: number, r: Requisicao) {
    const c = Object.values(this.d.comunicacoes).flat().find((x) => x.id === cid);
    if (!c) throw new ErroDemo(404, 'Não encontrado', 'Comunicação não encontrada');
    const p = this.p(c.processoId);
    this.representado(r, p.resumo.interessadoId);
    if (c.cienciaEm) return null;
    if (c.marcoProcesso && (p.resumo.status === 'CIENCIA_PENDENTE' || (DECISOES.includes(p.resumo.status) && !p.desvios.decisaoCienciaEm))) this.ciencia(p.resumo.id, 'PORTAL', r);
    else Object.assign(c, { cienciaEm: agora(), cienciaTipo: 'PORTAL' });
    return null;
  }

  // ===================================================================== catálogo, parâmetros, administração
  private catalogo() {
    return this.d.beneficios.map((b) => {
      const ps = this.todos().filter((p) => p.beneficio.id === b.beneficio.id);
      const conc = ps.filter((p) => CONCEDIDOS.includes(p.resumo.status)).length;
      return { beneficio: b.beneficio, processosEmAndamento: ps.length - conc, concessoes: conc };
    });
  }
  private alterarBeneficio(id: number, r: Requisicao) {
    this.exigirPermissao(r, 'CATALOGO_GERIR');
    const c = r.corpo ?? {};
    if (!String(c.justificativa ?? '').trim()) throw negocio('Informe a justificativa da alteração.');
    const b = this.d.beneficios.find((x) => x.beneficio.id === id)!.beneficio;
    const rot: Record<string, string> = { ATO_DECLARATORIO: 'Ato Declaratório', PARECER_FISCAL: 'Parecer Fiscal', ESCRITURACAO_FISCAL: 'Escrituração Fiscal', PROCESSUAL: 'Processual' };
    if (c.tipoConcessao) Object.assign(b, { tipoConcessao: c.tipoConcessao, tipoConcessaoRotulo: rot[c.tipoConcessao], geraAto: c.tipoConcessao === 'ATO_DECLARATORIO', geraParecer: ['ATO_DECLARATORIO', 'PARECER_FISCAL'].includes(c.tipoConcessao) });
    if (c.prazoMeses) b.prazoMeses = c.prazoMeses;
    if (c.exigeTermo != null) b.exigeTermo = !!c.exigeTermo;
    if (c.exigeInstrucaoExterna != null) b.exigeInstrucaoExterna = !!c.exigeInstrucaoExterna;
    if (c.modalidades != null) b.modalidades = String(c.modalidades).split(';').map((s: string) => s.trim()).filter(Boolean);
    // o processo compartilha o objeto do benefício do catálogo apenas por id: replica a mudança
    this.todos().filter((p) => p.beneficio.id === id).forEach((p) => { Object.assign(p.beneficio, b); p.resumo.tipoConcessao = b.tipoConcessao; });
    return b;
  }
  private alterarTexto(id: number, r: Requisicao) {
    this.exigirPermissao(r, 'CATALOGO_GERIR');
    const c = r.corpo ?? {};
    if (!String(c.justificativa ?? '').trim()) throw negocio('Informe a justificativa da alteração.');
    const t = this.d.textos.find((x) => x.id === id)!;
    const [a, b] = t.versaoTexto.split('.');
    Object.assign(t, { corpo: c.corpo, versaoTexto: `${a}.${Number(b ?? 0) + 1}`, atualizadoEm: agora(), atualizadoPor: this.usuario(r).login, tags: [...new Set([...String(c.corpo).matchAll(TAG)].map((m) => m[1]))] });
    return t;
  }
  private parametro(id: number) {
    return this.d.parametros.find((p) => p.id === id)!;
  }
  private texto(chave: string, padrao: string) {
    return this.d.parametros.find((p) => p.chave === chave)?.valor || padrao;
  }
  private inteiro(chave: string, padrao: number) {
    return Number(this.texto(chave, String(padrao))) || padrao;
  }
  private alterarParametro(id: number, r: Requisicao) {
    this.exigirPermissao(r, 'PARAMETRO_GERIR');
    const p = this.parametro(id);
    const c = r.corpo ?? {};
    if (!String(c.justificativa ?? '').trim()) throw negocio('Informe a justificativa da alteração.');
    if (!String(c.valor ?? '').trim()) throw negocio('Informe o novo valor.');
    const anterior = p.valor;
    if (c.vigenteAPartir && c.vigenteAPartir > hoje()) { p.valorProgramado = c.valor; p.vigenciaProgramada = c.vigenteAPartir; }
    else { p.valor = c.valor; p.vigenteDesde = hoje(); }
    p.atualizadoEm = agora();
    p.atualizadoPor = this.usuario(r).login;
    this.d.historicoParametros.unshift({ id: ++this.seq, parametroId: id, dataHora: agora(), usuario: this.usuario(r).nome, operacao: c.vigenteAPartir > hoje() ? 'PROGRAMACAO' : 'ALTERACAO', valorAnterior: anterior, valorNovo: c.valor, vigencia: c.vigenteAPartir ?? hoje(), justificativa: c.justificativa });
    return p;
  }
  private resumoIntegracoes() {
    const m: Record<string, number> = { PENDENTE: 0, EM_EXECUCAO: 0, CONCLUIDA: 0, ERRO: 0, CANCELADA: 0 };
    this.d.solicitacoes.forEach((s) => (m[s.status] = (m[s.status] ?? 0) + 1));
    return m;
  }
  private usuariosAdmin(q: URLSearchParams) {
    const f = q.get('filtro') ? normalizar(q.get('filtro')!) : null;
    return paginar(this.d.usuarios.filter((u) => !f || normalizar(u.nome + ' ' + u.login + ' ' + (u.matricula ?? '')).includes(f)), q, 20);
  }
}
