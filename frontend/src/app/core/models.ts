/** Contratos da API do SIGBEN (espelham os DTOs do back-end Java). */

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface ResultadoLote {
  processados: number;
  ignorados: { id: number; descricao: string; motivo: string }[];
  loteId: number | null;
}

export interface ConfiguracaoCliente {
  cliente: {
    sigla: string;
    nomeOrgao: string;
    nomeCurto: string;
    uf: string;
    municipioSede: string;
    nomeSistema: string;
    sistemaLegado: string;
    canalEletronico: string;
    diarioOficial: string;
    portalContribuinte: string;
    autoridadeHomologadora: string;
    endereco: string;
    tema: { corPrimaria: string; corPrimariaHover: string; logoUrl: string };
  };
  modoAutenticacao: string;
  versao: string;
  /** Presente apenas na versão de demonstração (GitHub Pages). */
  demonstracao?: boolean;
}

export interface PerfilResumo {
  codigo: string;
  nome: string;
}

export interface Sessao {
  login: string;
  nome: string;
  perfilAtivo: string | null;
  perfis: PerfilResumo[];
  permissoes: string[];
  setor: string | null;
}

export interface Contadores {
  caixa: number;
}

// ------------------------------------------------------------------ processo

export type StatusProcesso =
  | 'EM_FORMALIZACAO' | 'RECEBIDO' | 'INFORMACAO_FISCAL' | 'ANALISE_JURIDICA' | 'PARECER_ELABORACAO'
  | 'ATO_ELABORACAO' | 'HOMOLOGACAO' | 'PUBLICACAO' | 'CIENCIA_PENDENTE' | 'ARQUIVAMENTO_PENDENTE'
  | 'CONCEDIDO_ARQUIVADO' | 'VIGENTE'
  // fase 2
  | 'DILIGENCIA' | 'MANIFESTACAO' | 'INSTRUCAO_EXTERNA' | 'TERMO_ACORDO' | 'INDEFERIDO' | 'RECURSO' | 'SUSPENSO' | 'CASSADO' | 'ARQUIVADO';

export type Especie = 'CONCESSAO' | 'PRORROGACAO' | 'ALTERACAO' | 'RENUNCIA';
export type TipoConcessao = 'ATO_DECLARATORIO' | 'PARECER_FISCAL' | 'ESCRITURACAO_FISCAL' | 'PROCESSUAL';

export interface ProcessoResumo {
  id: number;
  numero: string;
  interessadoId: number;
  razaoSocial: string;
  cnpj: string;
  beneficioId: number;
  beneficio: string;
  tipoConcessao: TipoConcessao;
  especie: Especie;
  status: StatusProcesso;
  statusRotulo: string;
  statusPortal: string;
  familia: 'CONTRIBUINTE' | 'SEFAZ' | 'CONCLUIDO' | 'EXTERNO' | 'DESFAVORAVEL' | 'ENCERRADO';
  setor: string | null;
  responsavelId: number | null;
  responsavelNome: string | null;
  prioridade: 'NORMAL' | 'PRIORITARIA' | 'URGENTE';
  valorPretendido: number | null;
  dataSolicitacao: string;
  entradaSetorEm: string;
  diasNoSetor: number;
  diasTotal: number;
  divergenciaCnae: boolean;
  parado: boolean;
}

export interface Interessado {
  id: number;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  porte: string;
  cnaePrincipal: string;
  cnaes: string[];
  atividade: string;
  municipio: string;
}

export interface Beneficio {
  id: number;
  codigo: string;
  assunto: string;
  setorEconomico: string;
  tipoConcessao: TipoConcessao;
  tipoConcessaoRotulo: string;
  geraAto: boolean;
  geraParecer: boolean;
  modalidades: string[];
  finalidade: string;
  convenio: string;
  tipoConvenio: string;
  norma: string;
  statusNorma: string;
  convalidacao: string;
  efeitos: string;
  prazoMeses: number | null;
  ativo: boolean;
  alcance: { rotulo: string; descricao: string }[];
  exigeTermo: boolean;
  exigeInstrucaoExterna: boolean;
}

export interface PecaResumo {
  id: number;
  tipo: 'INFORMACAO_FISCAL' | 'PARECER' | 'ATO_DECLARATORIO' | 'TERMO_ACORDO';
  numero: string;
  situacao: 'RASCUNHO' | 'ASSINADA';
  conclusao: string | null;
  conclusaoRotulo: string | null;
  fundamentacao: string | null;
  observacoes: string | null;
  autorNome: string | null;
  assinadaEm: string | null;
  textoPadrao: string | null;
  corpoFinal: string | null;
}

export interface Contrapartida {
  id: number;
  natureza: 'INVESTIMENTO' | 'EMPREGO' | 'MANUTENCAO_ATIVIDADE';
  meta: number;
  unidade: 'MOEDA' | 'POSTOS' | 'ATIVIDADE';
  prazo: string;
  periodicidade: 'UNICA' | 'SEMESTRAL' | 'ANUAL';
  realizado: number;
  descricao: string;
}

export interface Documento {
  id: number;
  documentoExigidoId: number | null;
  descricao: string;
  nomeArquivo: string;
  tamanho: number | null;
  situacao: 'ENVIADO' | 'ACEITO' | 'RECUSADO' | 'SUBSTITUIDO';
  motivoRecusa: string | null;
  origem: 'PORTAL' | 'INTERNO';
  enviadoEm: string;
  enviadoPor: string;
  analisadoEm: string | null;
}

export interface ItemDocumental {
  documentoExigidoId: number | null;
  descricao: string;
  obrigatorio: boolean;
  atual: Documento | null;
}

export interface ItemElegibilidade {
  item: string;
  resultado: 'OK' | 'ALERTA' | 'FALHA' | 'NAO_VERIFICADO';
  detalhe: string;
}

export interface AbaProcesso {
  id: string;
  rotulo: string;
  habilitada: boolean;
  motivo: string | null;
  pendente: boolean;
}

export interface Acao {
  habilitada: boolean;
  motivo: string | null;
}

export interface ProcessoDetalhe {
  resumo: ProcessoResumo;
  interessado: Interessado;
  beneficio: Beneficio;
  taxaFaixa: string;
  taxaValor: number;
  taxaPaga: boolean;
  taxaConferidaEm: string | null;
  requerimento: string | null;
  solicitante: string | null;
  dataFormalizacao: string | null;
  protocoloLegado: string | null;
  elegibilidadeEm: string | null;
  elegibilidade: ItemElegibilidade[];
  homologadoEm: string | null;
  homologadoPor: string | null;
  publicacao: {
    encaminhadoEm: string | null;
    recebidoEm: string | null;
    aprovadoEm: string | null;
    publicadoEm: string | null;
    edicao: string | null;
    pagina: string | null;
  };
  cienciaEm: string | null;
  cienciaTipo: string | null;
  cienciaPor: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  arquivadoEm: string | null;
  pecas: PecaResumo[];
  contrapartidas: Contrapartida[];
  documentosExigidos: ItemDocumental[];
  documentosPendentes: string[];
  abas: AbaProcesso[];
  acoes: Record<string, Acao>;
  desvios: Desvios;
}

// ------------------------------------------------------------------ fase 2: desvios do fluxo

export interface Diligencia {
  id: number;
  tipo: 'DOCUMENTO' | 'ESCLARECIMENTO';
  descricao: string;
  prazo: string;
  abertaEm: string;
  abertaPor: string;
  resposta: string | null;
  documentoId: number | null;
  respondidaEm: string | null;
  respondidaPor: string | null;
  situacao: 'ABERTA' | 'RESPONDIDA' | 'CANCELADA';
}

export interface Manifestacao {
  id: number;
  setorId: number;
  setor: string;
  pergunta: string;
  prazo: string;
  solicitadaEm: string;
  solicitadaPor: string;
  resposta: string | null;
  respondidaEm: string | null;
  respondidaPor: string | null;
  situacao: 'PENDENTE' | 'RESPONDIDA';
}

export interface Recurso {
  id: number;
  decisaoRecorrida: 'INDEFERIMENTO' | 'SUSPENSAO' | 'CASSACAO';
  razoes: string;
  apresentadoEm: string;
  apresentadoPor: string;
  encaminhadoEm: string | null;
  resultado: 'PROVIDO' | 'NAO_PROVIDO' | null;
  numeroAcordao: string | null;
  fundamento: string | null;
  decididoEm: string | null;
}

export interface Procedimento {
  id: number;
  tipo: 'SUSPENSAO' | 'CASSACAO';
  motivo: string;
  fundamentacao: string;
  prazoRegularizacao: string;
  abertoEm: string;
  abertoPor: string;
  situacao: 'ABERTO' | 'DECIDIDO' | 'ARQUIVADO' | 'RESTABELECIDO';
  decididoEm: string | null;
  decididoPor: string | null;
  encerradoEm: string | null;
  encerramento: string | null;
}

export interface Desvios {
  statusRetorno: string | null;
  motivoDecisao: string | null;
  decisaoEm: string | null;
  decisaoCienciaEm: string | null;
  fimPrazoRecursal: string | null;
  termoEnviadoEm: string | null;
  termoPrazo: string | null;
  termoAssinadoEm: string | null;
  termoTexto: string | null;
  instrucaoEnviadaEm: string | null;
  instrucaoResultado: string | null;
  instrucaoDetalhe: string | null;
  diligencias: Diligencia[];
  manifestacoes: Manifestacao[];
  recursos: Recurso[];
  procedimentos: Procedimento[];
}

export interface Listas {
  motivosIndeferimento: string[];
  motivosProcedimento: string[];
  prazoRegularizacao: number;
}

export interface Evento {
  id: number;
  dataHora: string;
  tipo: string;
  descricao: string;
  usuarioNome: string;
  setorOrigem: string | null;
  setorDestino: string | null;
  statusAnterior: string | null;
  statusNovo: string | null;
}

export interface Comunicacao {
  id: number;
  processoId: number;
  tipo: string;
  assunto: string;
  texto: string;
  enviadaEm: string;
  prazo: string | null;
  numeroDte: string | null;
  cienciaEm: string | null;
  cienciaTipo: string | null;
  marcoProcesso: boolean;
}

// ------------------------------------------------------------------ editor de peças

export interface TagPeca {
  chave: string;
  descricao: string;
  natureza: 'RESOLVIDA' | 'ESCOLHA' | 'PREENCHIMENTO' | 'PARAMETRO';
  origem: string;
  valor: string | null;
  opcoes: string[];
  editavel: boolean;
  pendente: boolean;
}

export interface EditorPeca {
  pecaId: number;
  tipo: string;
  numero: string;
  situacao: 'RASCUNHO' | 'ASSINADA';
  textoPadraoId: number | null;
  textoPadraoNome: string | null;
  textoPadraoTipo: string | null;
  versaoTexto: string | null;
  modelos: { id: number; nome: string; versao: string }[];
  paragrafos: { segmentos: { texto: string | null; tag: string | null }[] }[];
  tags: TagPeca[];
  pendentes: number;
  autorNome: string | null;
  assinadaEm: string | null;
}

// ------------------------------------------------------------------ portal

export interface InteressadoPortal {
  interessado: Interessado;
  pendencias: number;
}

export interface Pendencia {
  id: string;
  processoId: number;
  numeroProcesso: string | null;
  tipo: string;
  titulo: string;
  contexto: string;
  prazo: string | null;
  diasRestantes: number | null;
  acao: string;
  comunicacaoId: number | null;
}

export interface BeneficioPortal {
  beneficio: Beneficio;
  compativel: boolean;
}

export interface PainelPortal {
  interessado: Interessado;
  processos: ProcessoResumo[];
  pendencias: Pendencia[];
  comunicacoes: Comunicacao[];
  fruicaoDireta: BeneficioPortal[];
}

export interface ProcessoPortal {
  resumo: ProcessoResumo;
  beneficio: Beneficio;
  taxaFaixa: string;
  taxaValor: number;
  requerimento: string | null;
  documentos: ItemDocumental[];
  documentosPendentes: string[];
  etapas: { rotulo: string; concluida: boolean; atual: boolean; quando: string | null }[];
  comunicacoes: Comunicacao[];
  atoNumero: string | null;
  atoTexto: string | null;
  publicadoEm: string | null;
  edicao: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  cienciaEm: string | null;
  podeEditar: boolean;
  desvios: Desvios;
  podeResponderDiligencia: boolean;
  podeDevolverTermo: boolean;
  podeRecorrer: boolean;
  cienciaDecisaoPendente: boolean;
}

export interface TaxaCalculada {
  especie: string;
  faixa: string;
  valor: number;
  isento: boolean;
}

// ------------------------------------------------------------------ catálogo e apoio

export interface BeneficioCatalogo {
  beneficio: Beneficio;
  processosEmAndamento: number;
  concessoes: number;
}

export interface Taxa {
  id: number;
  especie: string;
  faixa: string;
  valorMin: number | null;
  valorMax: number | null;
  valor: number;
  isento: boolean;
  ativo: boolean;
}

export interface DocumentoExigido {
  id: number;
  descricao: string;
  obrigatorio: boolean;
  especie: string | null;
  ativo: boolean;
}

export interface TextoPadrao {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  versaoTexto: string;
  corpo: string;
  ativo: boolean;
  tags: string[];
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

export interface TagCatalogo {
  chave: string;
  descricao: string;
  natureza: string;
  origem: string;
  formato: string;
  opcoes: string[];
  obsoleta: boolean;
}

export interface Setor {
  id: number;
  sigla: string;
  nome: string;
  papel: string;
  tipo: 'INTERNO' | 'EXTERNO';
}

export interface UsuarioResumo {
  id: number;
  login: string;
  nome: string;
  cargo: string;
}

export interface Dashboard {
  emAndamento: number;
  concedidos: number;
  parados: number;
  aguardandoContribuinte: number;
  porSituacao: { status: string; rotulo: string; familia: string; quantidade: number }[];
  porSetor: Record<string, number>;
  diasAlerta: number;
}

// ------------------------------------------------------------------ administração (iguais ao Painel de Malhas)

export interface Parametro {
  id: number;
  chave: string;
  aba: string;
  secao: string;
  nome: string;
  natureza: 'FIXO' | 'PROCEDIMENTO' | 'RETORNO' | 'REFERENCIA';
  tipoValor: string;
  valor: string;
  editavel: boolean;
  vigenteDesde?: string;
  valorProgramado?: string;
  vigenciaProgramada?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export interface ParametroHistorico {
  id: number;
  parametroId: number;
  dataHora: string;
  usuario: string;
  operacao: string;
  valorAnterior: string;
  valorNovo: string;
  vigencia: string;
  justificativa: string;
}

export interface EtapaSolicitacao {
  ordem: number;
  servico: string;
  descricao: string;
  caminho: string;
  status: string;
  inicio?: string;
  fim?: string;
  retorno?: string;
  erro?: string;
}

export interface Solicitacao {
  id: number;
  loteId?: number;
  demanda: string;
  demandaDescricao: string;
  processoId?: number;
  status: string;
  etapaAtual: number;
  totalEtapas: number;
  tentativas: number;
  ultimoErro?: string;
  criadoEm: string;
  criadoPor: string;
  atualizadoEm?: string;
  etapas: EtapaSolicitacao[];
}

export interface UsuarioAdmin {
  id: number;
  login: string;
  nome: string;
  cargo: string;
  matricula: string;
  email: string;
  ativo: boolean;
  perfis: string[];
}

export interface PerfilDetalhe {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  permissoes: string[];
}

export interface Permissao {
  codigo: string;
  modulo: string;
  descricao: string;
}

// ------------------------------------------------------------------ fase 3: monitoramento dos beneficiários

export interface CardMonitoramento {
  rotulo: string;
  valor: string;
  detalhe: string;
  alerta: boolean;
}

export type NivelRisco = 'ALTO' | 'MEDIO' | 'BAIXO';

export interface LinhaCadastro {
  interessadoId: number;
  razaoSocial: string;
  cnpj: string;
  processoId: number;
  numeroProcesso: string;
  beneficio: string;
  tipoConcessao: string;
  concessao: string;
  situacao: string;
  situacaoTipo: string;
  encerradoEm: string | null;
  renuncia: number;
  contrapartidas: 'EM_DIA' | 'ATENCAO' | 'ATRASO' | 'SEM_CONTRAPARTIDA' | 'NAO_SE_APLICA';
  risco: NivelRisco;
}

export interface CadastroBeneficiarios {
  cards: CardMonitoramento[];
  linhas: LinhaCadastro[];
}

export interface ContrapartidaMonitorada {
  id: number;
  processoId: number;
  natureza: string;
  meta: number;
  realizado: number;
  unidade: 'MOEDA' | 'POSTOS' | 'ATIVIDADE';
  percentual: number;
  prazo: string;
  periodicidade: string;
  ultimaComprovacao: string | null;
  proximaComprovacao: string | null;
  proximaVencida: boolean;
  situacao: 'DIA' | 'ATENCAO' | 'ATRASO' | 'CUMPRIDA' | 'ENCERRADA';
  descricao: string;
}

export interface CriterioRisco {
  nome: string;
  nivel: NivelRisco;
  detalhe: string;
  motivo: string | null;
  acao: string | null;
}

export interface ConcessaoFicha {
  processoId: number;
  numeroProcesso: string;
  beneficio: string;
  tipoConcessao: string;
  geraAto: boolean;
  status: string;
  situacao: string;
  situacaoTipo: string;
  concessao: string;
  vigenciaFim: string | null;
  encerradoEm: string | null;
  renuncia12: number;
  renunciaAnualEstimada: number | null;
  mesesApurados: number;
}

export interface OcorrenciaMonitoramento {
  id: number;
  processoId: number;
  tipo: string;
  descricao: string;
  resultado: string | null;
  registradaEm: string;
  registradaPor: string;
}

export interface ItemPrestacao {
  contrapartidaId: number;
  natureza: string;
  realizado: number;
  unidade: string;
}

export interface PrestacaoContas {
  id: number;
  processoId: number;
  numeroProcesso: string | null;
  interessadoId: number | null;
  razaoSocial: string | null;
  cnpj: string | null;
  beneficio: string | null;
  protocolo: string;
  periodo: string;
  periodoFim: string;
  prazo: string;
  houveFruicao: boolean;
  enviadaEm: string;
  enviadaPor: string;
  situacao: 'AGUARDANDO_ANALISE' | 'VALIDADA' | 'RECUSADA';
  motivoRecusa: string | null;
  analisadaEm: string | null;
  analisadaPor: string | null;
  itens: ItemPrestacao[];
  documentos: { id: number; descricao: string; nomeArquivo: string }[];
}

export interface FichaBeneficiario {
  interessadoId: number;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  municipio: string;
  porte: string;
  ativo: boolean;
  situacao: string;
  encerradoEm: string | null;
  concessoes: ConcessaoFicha[];
  cards: CardMonitoramento[];
  criterios: CriterioRisco[];
  risco: NivelRisco;
  contrapartidas: ContrapartidaMonitorada[];
  renunciaMensal: { periodo: string; rotulo: string; renuncia: number }[];
  ocorrencias: OcorrenciaMonitoramento[];
  prestacoes: PrestacaoContas[];
  processoAcaoId: number | null;
}

export interface PainelContrapartidas {
  cards: CardMonitoramento[];
  linhas: { interessadoId: number; razaoSocial: string; numeroProcesso: string; contrapartida: ContrapartidaMonitorada }[];
}

export interface SemEntrega {
  processoId: number;
  numeroProcesso: string;
  interessadoId: number;
  razaoSocial: string;
  beneficio: string;
  concessao: string;
  periodo: string;
  prazo: string;
  atrasoDias: number;
  critico: boolean;
  notificadaEm: string | null;
}

export interface SemObrigacao {
  processoId: number;
  numeroProcesso: string;
  interessadoId: number;
  razaoSocial: string;
  beneficio: string;
  detalhe: string;
}

export interface PainelPrestacao {
  recebidas: PrestacaoContas[];
  semEntrega: SemEntrega[];
  semContrapartida: SemObrigacao[];
  naoDevidas: SemObrigacao[];
  encerrados: SemObrigacao[];
  motivosRecusa: string[];
}

export interface ConcessaoApuracao {
  processoId: number;
  numeroProcesso: string;
  interessadoId: number;
  razaoSocial: string;
  beneficio: string;
  periodos: { periodo: string; rotulo: string }[];
}

export interface LinhaConfronto {
  linha: string;
  calculado: number;
  declarado: number;
  diferenca: number;
  percentual: number;
  situacao: 'CONFORME' | 'TOLERAVEL' | 'DIVERGENTE';
}

export interface ApuracaoBeneficio {
  processoId: number;
  numeroProcesso: string;
  interessadoId: number;
  razaoSocial: string;
  beneficio: string;
  periodo: string;
  periodoRotulo: string;
  disponivel: boolean;
  debito: number;
  creditoCalculado: number;
  ajusteCalculado: number;
  impostoSemBeneficio: number;
  impostoComBeneficio: number;
  renunciaPeriodo: number;
  confronto: LinhaConfronto[];
  divergente: boolean;
  inconsistencias: { documento: string; tipo: string; descricao: string; valor: number; afeta: string; ocorrenciaRegistrada: boolean }[];
  situacao: 'APROVADA' | 'EM_VERIFICACAO' | null;
  registradaEm: string | null;
  registradaPor: string | null;
}

export interface BarraMonitoramento {
  rotulo: string;
  valor: number;
  percentual: string;
  interessadoId: number | null;
}

export interface InteligenciaFiscal {
  cards: CardMonitoramento[];
  concentracao: BarraMonitoramento[];
  topo: number;
  porFinalidade: BarraMonitoramento[];
  atencao: { interessadoId: number; razaoSocial: string; risco: NivelRisco; renuncia: number; motivos: string[]; acao: string }[];
}

export interface RelatorioMonitoramento {
  trimestre: string;
  trimestreRotulo: string;
  trimestres: string[];
  secoes: { titulo: string; texto: string }[];
  emissoes: { periodo: string; emitidoEm: string; emitidoPor: string }[];
  recorte: 'ativos' | 'concedidos';
  ano: string;
  anos: string[];
  linhas: { interessadoId: number; razaoSocial: string; beneficio: string; tipoConcessao: string; concessao: string; situacao: string; situacaoTipo: string }[];
}

export interface BeneficioPublico {
  razaoSocial: string;
  cnpj: string;
  beneficio: string;
  modalidades: string;
  fundamento: string;
  concessao: string;
  vigenciaFim: string | null;
}

export interface AcervoLegado {
  id: number;
  numero: string;
  interessadoId: number;
  razaoSocial: string;
  cnpj: string;
  assunto: string;
  situacaoLegado: string;
  dataAbertura: string;
  setorLegado: string | null;
  documentos: number;
  observacoes: string | null;
  migradoEm: string | null;
  migradoPor: string | null;
  processoId: number | null;
}

export interface Migracao {
  beneficioId: number;
  especie: string;
  situacao: string;
  vigenciaInicio?: string | null;
  valorPretendido?: number | null;
  justificativa: string;
}

export interface PeriodoPrestacao {
  rotulo: string;
  inicio: string;
  fim: string;
  prazo: string;
  atrasoDias: number;
}

export interface PrestacaoPortal {
  processoId: number;
  numeroProcesso: string;
  beneficio: string;
  exige: boolean;
  motivo: string | null;
  contrapartidas: { id: number; natureza: string; meta: number; realizado: number; unidade: string; periodicidade: string; prazo: string }[];
  pendente: PeriodoPrestacao | null;
  proximo: PeriodoPrestacao | null;
  historico: PrestacaoContas[];
  documentosExigidos: { chave: string; descricao: string; obrigatorio: boolean }[];
}
