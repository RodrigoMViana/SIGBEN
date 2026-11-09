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
  | 'CONCEDIDO_ARQUIVADO' | 'VIGENTE';

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
  familia: 'CONTRIBUINTE' | 'SEFAZ' | 'CONCLUIDO';
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
}

export interface PecaResumo {
  id: number;
  tipo: 'INFORMACAO_FISCAL' | 'PARECER' | 'ATO_DECLARATORIO';
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
