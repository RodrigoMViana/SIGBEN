import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Beneficio, BeneficioCatalogo, BeneficioPortal, Comunicacao, Contadores, Dashboard, DocumentoExigido, EditorPeca, Especie,
  Evento, InteressadoPortal, Pagina, PainelPortal, Parametro, ParametroHistorico, PerfilDetalhe, Permissao, ProcessoDetalhe,
  ProcessoPortal, ProcessoResumo, ResultadoLote, Setor, Solicitacao, TagCatalogo, Taxa, TaxaCalculada, TextoPadrao,
  TipoConcessao, UsuarioAdmin, UsuarioResumo, Listas, CadastroBeneficiarios, FichaBeneficiario, PainelContrapartidas, PainelPrestacao,
  ConcessaoApuracao, ApuracaoBeneficio, InteligenciaFiscal, RelatorioMonitoramento, BeneficioPublico, AcervoLegado, Migracao, PrestacaoPortal,
} from './models';

type Params = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

function params(p: Params = {}): HttpParams {
  let hp = new HttpParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => (hp = hp.append(k, String(x))));
    else hp = hp.set(k, String(v));
  }
  return hp;
}

function arquivo(f: File, extras: Record<string, string | number | null | undefined> = {}): FormData {
  const fd = new FormData();
  fd.append('arquivo', f, f.name);
  for (const [k, v] of Object.entries(extras)) if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
  return fd;
}

/** Cliente tipado da API REST (um ponto único facilita versionamento e testes). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // --------------------------------------------------------------- painel e apoio
  contadores(): Observable<Contadores> {
    return this.http.get<Contadores>('/api/painel/contadores');
  }
  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>('/api/painel/dashboard');
  }
  setores(): Observable<Setor[]> {
    return this.http.get<Setor[]>('/api/setores');
  }
  usuariosComPermissao(permissao: string): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>('/api/usuarios', { params: params({ permissao }) });
  }

  // --------------------------------------------------------------- processos (servidores)
  processos(p: Params): Observable<Pagina<ProcessoResumo>> {
    return this.http.get<Pagina<ProcessoResumo>>('/api/processos', { params: params(p) });
  }
  processo(id: number): Observable<ProcessoDetalhe> {
    return this.http.get<ProcessoDetalhe>(`/api/processos/${id}`);
  }
  historico(id: number): Observable<Evento[]> {
    return this.http.get<Evento[]>(`/api/processos/${id}/historico`);
  }
  comunicacoesProcesso(id: number): Observable<Comunicacao[]> {
    return this.http.get<Comunicacao[]>(`/api/processos/${id}/comunicacoes`);
  }
  urlArquivo(processoId: number, documentoId: number, portal = false): string {
    return `/api/${portal ? 'portal/' : ''}processos/${processoId}/documentos/${documentoId}/arquivo`;
  }
  baixarArquivo(processoId: number, documentoId: number, portal = false): Observable<Blob> {
    return this.http.get(this.urlArquivo(processoId, documentoId, portal), { responseType: 'blob' });
  }
  anexarInterno(id: number, f: File, documentoExigidoId: number | null, descricao: string | null) {
    return this.http.post(`/api/processos/${id}/documentos`, arquivo(f, { documentoExigidoId, descricao }));
  }
  recusarDocumento(id: number, docId: number, motivo: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/documentos/${docId}/recusar`, { motivo });
  }
  aceitarDocumento(id: number, docId: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/documentos/${docId}/aceitar`, {});
  }
  formalizar(id: number, taxaConferida: boolean): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/formalizar`, { taxaConferida });
  }
  emitirInformacaoFiscal(id: number, f: { conclusao: string; fundamentacao: string; observacoes?: string }): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/informacao-fiscal`, f);
  }
  distribuir(processoIds: number[], responsavelId: number | null, prioridade: string | null): Observable<ResultadoLote> {
    return this.http.post<ResultadoLote>('/api/processos/distribuir', { processoIds, responsavelId, prioridade });
  }
  elegibilidade(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/elegibilidade`, {});
  }
  peca(id: number, tipo: 'parecer' | 'ato'): Observable<EditorPeca> {
    return this.http.get<EditorPeca>(`/api/processos/${id}/pecas/${tipo}`);
  }
  salvarPeca(id: number, tipo: 'parecer' | 'ato', textoPadraoId: number | null, valores: Record<string, string>): Observable<EditorPeca> {
    return this.http.put<EditorPeca>(`/api/processos/${id}/pecas/${tipo}`, { textoPadraoId, valores });
  }
  assinarParecer(id: number, motivo?: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/parecer/assinar`, motivo ? { motivo } : {});
  }
  incluirContrapartida(id: number, c: { natureza: string; meta: number; unidade: string; prazo: string; periodicidade: string }): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/contrapartidas`, c);
  }
  excluirContrapartida(id: number, cid: number): Observable<ProcessoDetalhe> {
    return this.http.delete<ProcessoDetalhe>(`/api/processos/${id}/contrapartidas/${cid}`);
  }
  concluirAto(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/ato/concluir`, {});
  }
  homologar(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/homologar`, {});
  }
  publicacao(id: number, fase: 'RECEBIMENTO' | 'APROVACAO' | 'PUBLICACAO', d?: { data: string; edicao: string; pagina?: string }): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/publicacao/${fase}`, d ?? {});
  }
  cienciaPresencial(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/ciencia`, {});
  }
  arquivar(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/arquivar`, {});
  }

  // --------------------------------------------------------------- fase 2: desvios do fluxo
  listas(): Observable<Listas> {
    return this.http.get<Listas>("/api/processos/listas");
  }
  abrirDiligencia(id: number, tipo: string, descricao: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/diligencias`, { tipo, descricao });
  }
  cancelarDiligencia(id: number, did: number, motivo: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/diligencias/${did}/cancelar`, { motivo });
  }
  solicitarManifestacao(id: number, setorId: number, pergunta: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/manifestacoes`, { setorId, pergunta });
  }
  responderManifestacao(id: number, mid: number, texto: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/manifestacoes/${mid}/responder`, { texto });
  }
  encaminharInstrucao(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/instrucao-externa`, {});
  }
  registrarInstrucao(id: number, resultado: string, detalhe: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/instrucao-externa/retorno`, { resultado, detalhe });
  }
  enviarTermo(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/termo/enviar`, {});
  }
  prorrogarTermo(id: number, dias: number, justificativa: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/termo/prorrogar`, { dias, justificativa });
  }
  encaminharRecurso(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/recurso/encaminhar`, {});
  }
  decidirRecurso(id: number, resultado: string, numeroAcordao: string, fundamento: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/recurso/decisao`, { resultado, numeroAcordao, fundamento });
  }
  abrirProcedimento(id: number, p: { tipo: string; motivo: string; fundamentacao: string; prazoDias: number }): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/procedimentos`, p);
  }
  decidirProcedimento(id: number): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/procedimentos/decidir`, {});
  }
  arquivarProcedimento(id: number, motivo: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/procedimentos/arquivar`, { motivo });
  }
  restabelecer(id: number, motivo: string): Observable<ProcessoDetalhe> {
    return this.http.post<ProcessoDetalhe>(`/api/processos/${id}/restabelecer`, { motivo });
  }
  responderDiligenciaPortal(id: number, did: number, resposta: string, f: File | null): Observable<ProcessoPortal> {
    const fd = new FormData();
    if (resposta) fd.append("resposta", resposta);
    if (f) fd.append("arquivo", f, f.name);
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/diligencias/${did}/responder`, fd);
  }
  devolverTermo(id: number, f: File): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/termo/devolver`, arquivo(f));
  }
  recorrer(id: number, razoes: string, cienteSemEfeitoSuspensivo: boolean): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/recurso`, { razoes, cienteSemEfeitoSuspensivo });
  }

  // --------------------------------------------------------------- portal do contribuinte
  interessadosPortal(): Observable<InteressadoPortal[]> {
    return this.http.get<InteressadoPortal[]>('/api/portal/interessados');
  }
  painelPortal(interessadoId: number): Observable<PainelPortal> {
    return this.http.get<PainelPortal>(`/api/portal/interessados/${interessadoId}/painel`);
  }
  beneficiosPortal(interessadoId: number): Observable<BeneficioPortal[]> {
    return this.http.get<BeneficioPortal[]>(`/api/portal/interessados/${interessadoId}/beneficios`);
  }
  taxa(especie: Especie, valor: number | null): Observable<TaxaCalculada> {
    return this.http.get<TaxaCalculada>('/api/portal/taxa', { params: params({ especie, valor }) });
  }
  documentosExigidosPortal(especie: Especie): Observable<{ id: number; descricao: string; obrigatorio: boolean }[]> {
    return this.http.get<{ id: number; descricao: string; obrigatorio: boolean }[]>('/api/portal/documentos-exigidos', { params: params({ especie }) });
  }
  solicitar(interessadoId: number, s: { beneficioId: number; especie: Especie; valorPretendido: number | null; requerimento: string }): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/interessados/${interessadoId}/solicitacoes`, s);
  }
  processoPortal(id: number): Observable<ProcessoPortal> {
    return this.http.get<ProcessoPortal>(`/api/portal/processos/${id}`);
  }
  anexarPortal(id: number, f: File, documentoExigidoId: number | null, descricao: string | null): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/documentos`, arquivo(f, { documentoExigidoId, descricao }));
  }
  removerDocumentoPortal(id: number, docId: number): Observable<ProcessoPortal> {
    return this.http.delete<ProcessoPortal>(`/api/portal/processos/${id}/documentos/${docId}`);
  }
  enviarSolicitacao(id: number): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/enviar`, {});
  }
  cienciaPortal(id: number): Observable<ProcessoPortal> {
    return this.http.post<ProcessoPortal>(`/api/portal/processos/${id}/ciencia`, {});
  }
  cienciaComunicacao(id: number): Observable<void> {
    return this.http.post<void>(`/api/portal/comunicacoes/${id}/ciencia`, {});
  }

  // --------------------------------------------------------------- catálogo
  beneficios(): Observable<BeneficioCatalogo[]> {
    return this.http.get<BeneficioCatalogo[]>('/api/catalogo/beneficios');
  }
  alterarBeneficio(id: number, a: { tipoConcessao?: TipoConcessao; prazoMeses?: number | null; modalidades?: string; ativo?: boolean; exigeTermo?: boolean; exigeInstrucaoExterna?: boolean; justificativa: string }): Observable<Beneficio> {
    return this.http.put<Beneficio>(`/api/catalogo/beneficios/${id}`, a);
  }
  taxas(): Observable<Taxa[]> {
    return this.http.get<Taxa[]>('/api/catalogo/taxas');
  }
  documentosExigidos(): Observable<DocumentoExigido[]> {
    return this.http.get<DocumentoExigido[]>('/api/catalogo/documentos-exigidos');
  }
  textosPadrao(): Observable<TextoPadrao[]> {
    return this.http.get<TextoPadrao[]>('/api/catalogo/textos-padrao');
  }
  alterarTexto(id: number, corpo: string, justificativa: string): Observable<TextoPadrao> {
    return this.http.put<TextoPadrao>(`/api/catalogo/textos-padrao/${id}`, { corpo, justificativa });
  }
  tags(): Observable<TagCatalogo[]> {
    return this.http.get<TagCatalogo[]>('/api/catalogo/tags');
  }

  // --------------------------------------------------------------- parametrizações e integrações (como no Painel de Malhas)
  parametros(aba?: string): Observable<Parametro[]> {
    return this.http.get<Parametro[]>('/api/parametros', { params: params({ aba }) });
  }
  alterarParametro(id: number, a: { valor: string; vigenteAPartir?: string | null; justificativa: string }): Observable<Parametro> {
    return this.http.put<Parametro>(`/api/parametros/${id}`, a);
  }
  cancelarProgramacao(id: number, justificativa: string): Observable<Parametro> {
    return this.http.post<Parametro>(`/api/parametros/${id}/cancelar-programacao`, { justificativa });
  }
  historicoParametros(parametroId?: number): Observable<ParametroHistorico[]> {
    return this.http.get<ParametroHistorico[]>('/api/parametros/historico', { params: params({ parametroId }) });
  }
  previaTexto(texto: string, variaveis: Record<string, string>): Observable<string> {
    return this.http.post('/api/parametros/previa', { texto, variaveis }, { responseType: 'text' });
  }
  solicitacoes(p: Params): Observable<Pagina<Solicitacao>> {
    return this.http.get<Pagina<Solicitacao>>('/api/integracao/solicitacoes', { params: params(p) });
  }
  solicitacao(id: number): Observable<Solicitacao> {
    return this.http.get<Solicitacao>(`/api/integracao/solicitacoes/${id}`);
  }
  reprocessar(id: number): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(`/api/integracao/solicitacoes/${id}/reprocessar`, {});
  }
  executarCiencia(): Observable<{ expressas: number; tacitas: number; processos: number }> {
    return this.http.post<{ expressas: number; tacitas: number; processos: number }>('/api/integracao/ciencia/executar', {});
  }
  resumoIntegracoes(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>('/api/integracao/resumo');
  }

  // --------------------------------------------------------------- administração de permissões
  usuarios(filtro: string, pagina: number, tamanho: number): Observable<Pagina<UsuarioAdmin>> {
    return this.http.get<Pagina<UsuarioAdmin>>('/api/admin/usuarios', { params: params({ filtro, pagina, tamanho }) });
  }
  atualizarPerfisUsuario(id: number, perfis: string[]): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`/api/admin/usuarios/${id}/perfis`, perfis);
  }
  perfisAdmin(): Observable<PerfilDetalhe[]> {
    return this.http.get<PerfilDetalhe[]>('/api/admin/perfis');
  }
  permissoes(): Observable<Permissao[]> {
    return this.http.get<Permissao[]>('/api/admin/permissoes');
  }
  atualizarPermissoesPerfil(codigo: string, permissoes: string[]): Observable<PerfilDetalhe> {
    return this.http.put<PerfilDetalhe>(`/api/admin/perfis/${codigo}/permissoes`, permissoes);
  }

  // --------------------------------------------------------------- fase 3: monitoramento dos beneficiários
  cadastroBeneficiarios(): Observable<CadastroBeneficiarios> {
    return this.http.get<CadastroBeneficiarios>('/api/monitoramento/beneficiarios');
  }
  exportarCadastro(): Observable<Blob> {
    return this.http.get('/api/monitoramento/beneficiarios/exportar', { responseType: 'blob' });
  }
  fichaBeneficiario(interessadoId: number): Observable<FichaBeneficiario> {
    return this.http.get<FichaBeneficiario>(`/api/monitoramento/beneficiarios/${interessadoId}`);
  }
  painelContrapartidas(): Observable<PainelContrapartidas> {
    return this.http.get<PainelContrapartidas>('/api/monitoramento/contrapartidas');
  }
  inteligencia(): Observable<InteligenciaFiscal> {
    return this.http.get<InteligenciaFiscal>('/api/monitoramento/inteligencia');
  }
  painelPrestacoes(): Observable<PainelPrestacao> {
    return this.http.get<PainelPrestacao>('/api/monitoramento/prestacoes');
  }
  validarPrestacao(id: number): Observable<PainelPrestacao> {
    return this.http.post<PainelPrestacao>(`/api/monitoramento/prestacoes/${id}/validar`, {});
  }
  recusarPrestacao(id: number, motivo: string): Observable<PainelPrestacao> {
    return this.http.post<PainelPrestacao>(`/api/monitoramento/prestacoes/${id}/recusar`, { motivo });
  }
  notificarPrestacao(processoId: number): Observable<PainelPrestacao> {
    return this.http.post<PainelPrestacao>(`/api/monitoramento/prestacoes/notificar/${processoId}`, {});
  }
  concessoesApuracao(): Observable<ConcessaoApuracao[]> {
    return this.http.get<ConcessaoApuracao[]>('/api/monitoramento/apuracao');
  }
  apuracao(processoId: number, periodo?: string): Observable<ApuracaoBeneficio> {
    return this.http.get<ApuracaoBeneficio>(`/api/monitoramento/apuracao/${processoId}`, { params: params({ periodo }) });
  }
  aprovarApuracao(processoId: number, periodo: string): Observable<ApuracaoBeneficio> {
    return this.http.post<ApuracaoBeneficio>(`/api/monitoramento/apuracao/${processoId}/${periodo}/aprovar`, {});
  }
  verificacaoApuracao(processoId: number, periodo: string): Observable<ApuracaoBeneficio> {
    return this.http.post<ApuracaoBeneficio>(`/api/monitoramento/apuracao/${processoId}/${periodo}/verificacao`, {});
  }
  ocorrenciaApuracao(processoId: number, periodo: string, documento: string): Observable<ApuracaoBeneficio> {
    return this.http.post<ApuracaoBeneficio>(`/api/monitoramento/apuracao/${processoId}/${periodo}/ocorrencias`, { documento });
  }
  relatorioMonitoramento(p: { trimestre?: string; recorte?: string; ano?: string } = {}): Observable<RelatorioMonitoramento> {
    return this.http.get<RelatorioMonitoramento>('/api/monitoramento/relatorios', { params: params(p) });
  }
  emitirRelatorio(trimestre: string): Observable<RelatorioMonitoramento> {
    return this.http.post<RelatorioMonitoramento>('/api/monitoramento/relatorios/emitir', { trimestre });
  }
  transparencia(busca?: string): Observable<BeneficioPublico[]> {
    return this.http.get<BeneficioPublico[]>('/api/public/beneficiarios', { params: params({ busca }) });
  }
  acervo(): Observable<AcervoLegado[]> {
    return this.http.get<AcervoLegado[]>('/api/acervo');
  }
  migrarAcervo(id: number, m: Migracao): Observable<{ processoId: number; numero: string; acervo: AcervoLegado[] }> {
    return this.http.post<{ processoId: number; numero: string; acervo: AcervoLegado[] }>(`/api/acervo/${id}/migrar`, m);
  }
  prestacaoPortal(processoId: number): Observable<PrestacaoPortal> {
    return this.http.get<PrestacaoPortal>(`/api/portal/processos/${processoId}/prestacao`);
  }
  enviarPrestacao(processoId: number, houveFruicao: boolean, realizados: Record<number, number>, declaracao: boolean,
                  arquivos: Record<string, File | null | undefined>): Observable<PrestacaoPortal> {
    const fd = new FormData();
    fd.append('houveFruicao', String(houveFruicao));
    fd.append('realizados', JSON.stringify(realizados));
    fd.append('declaracao', String(declaracao));
    for (const [k, f] of Object.entries(arquivos)) if (f) fd.append(k, f, f.name);
    return this.http.post<PrestacaoPortal>(`/api/portal/processos/${processoId}/prestacao`, fd);
  }
}
