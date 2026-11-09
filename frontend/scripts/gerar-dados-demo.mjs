#!/usr/bin/env node
/**
 * Gera a massa da VERSÃO DE DEMONSTRAÇÃO (GitHub Pages) a partir de um back-end em execução.
 *
 *   node scripts/gerar-dados-demo.mjs [http://localhost:8081] [demo/dados.json]
 *
 * O back-end deve estar no perfil "dev" com a massa fictícia do V900 RECÉM-CRIADA (apague backend/data
 * antes de subir). O arquivo gerado é carregado pelo interceptor de demonstração (src/app/demo) quando o
 * front é compilado com `ng build --configuration demo`. Nenhum dado real deve ser usado aqui.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const SAIDA = process.argv[3] ?? 'demo/dados.json';

async function entrar(login) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, senha: '123456' }) });
  if (!r.ok) throw new Error(`Falha no login de ${login}: ${r.status}`);
  return (await r.json()).token;
}
const demo = await entrar('sigben.demo');
const PERFIS = ['ADMINISTRADOR', 'COORDENACAO', 'ATENDIMENTO', 'FISCALIZACAO', 'TRIBUTACAO', 'SECRETARIO', 'GABINETE', 'MONITORAMENTO', 'MANIFESTACAO', 'CONTRIBUINTE'];

/** GET autenticado, tentando os perfis em ordem até um ter permissão. */
async function get(caminho, token = demo) {
  for (const perfil of PERFIS) {
    const r = await fetch(BASE + caminho, { headers: { Authorization: `Bearer ${token}`, 'X-Perfil': perfil } });
    if (r.status === 403) continue;
    if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
    return r.json();
  }
  throw new Error(`${caminho}: nenhum perfil com permissão`);
}
async function todasPaginas(caminho, tamanho = 200) {
  const itens = [];
  for (let p = 0; ; p++) {
    const sep = caminho.includes('?') ? '&' : '?';
    const pg = await get(`${caminho}${sep}pagina=${p}&tamanho=${tamanho}`);
    itens.push(...pg.itens);
    if (itens.length >= pg.total || pg.itens.length === 0) return itens;
  }
}

const d = {};
d.config = await get('/api/public/config');
d.usuarios = await todasPaginas('/api/admin/usuarios', 100);
d.perfis = await get('/api/admin/perfis');
d.permissoes = await get('/api/admin/permissoes');
d.setores = await get('/api/setores');
d.responsaveis = await get('/api/usuarios?permissao=PARECER_ELABORAR');
d.beneficios = await get('/api/catalogo/beneficios');
d.taxas = await get('/api/catalogo/taxas');
d.documentosExigidos = await get('/api/catalogo/documentos-exigidos');
d.textos = await get('/api/catalogo/textos-padrao');
d.tags = await get('/api/catalogo/tags');
d.parametros = await get('/api/parametros');
d.historicoParametros = await get('/api/parametros/historico');
d.listas = await get('/api/processos/listas');
console.log('catálogo e administração ok');

const lista = await todasPaginas('/api/processos');
d.processos = {};
d.historicos = {};
d.comunicacoes = {};
d.editores = {};
for (const p of lista) {
  d.processos[p.id] = await get(`/api/processos/${p.id}`);
  d.historicos[p.id] = await get(`/api/processos/${p.id}/historico`);
  d.comunicacoes[p.id] = await get(`/api/processos/${p.id}/comunicacoes`);
  for (const t of ['parecer', 'ato']) {
    const tipo = t === 'ato' ? 'ATO_DECLARATORIO' : 'PARECER';
    if (d.processos[p.id].pecas.some((x) => x.tipo === tipo)) (d.editores[p.id] ??= {})[t] = await get(`/api/processos/${p.id}/pecas/${t}`);
  }
}
console.log('processos:', lista.length);

// representações do portal (quem representa quem)
d.representantes = {};
for (const login of ['roberto.lima', 'helena.barbosa', 'sigben.demo']) {
  const t = await entrar(login);
  const r = await fetch(`${BASE}/api/portal/interessados`, { headers: { Authorization: `Bearer ${t}`, 'X-Perfil': 'CONTRIBUINTE' } });
  d.representantes[login] = (await r.json()).map((x) => x.interessado.id);
}
d.setorDe = {};
for (const u of d.usuarios) {
  const t = await entrar(u.login);
  const r = await fetch(`${BASE}/api/auth/sessao`, { headers: { Authorization: `Bearer ${t}` } });
  d.setorDe[u.login] = (await r.json()).setor;
}
d.solicitacoes = [];
for (const s of await todasPaginas('/api/integracao/solicitacoes')) d.solicitacoes.push(await get(`/api/integracao/solicitacoes/${s.id}`));
console.log('portal e integrações ok');

d.config.demonstracao = true;
d.config.cliente.tema.logoUrl = d.config.cliente.tema.logoUrl?.replace(/^\//, '');
d.geradoEm = new Date().toISOString();

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, JSON.stringify(d));
console.log('gerado', SAIDA, Math.round(JSON.stringify(d).length / 1024), 'KB');
