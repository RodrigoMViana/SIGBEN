# SIGBEN — Sistema de Gestão de Benefícios Fiscais

**Produto Indra** para gestão de benefícios fiscais de ICMS concedidos pelas administrações tributárias estaduais. Primeiro cliente: **SEFAZ/AP**. Produto irmão do [Painel de Malhas Fiscais](https://github.com/RodrigoMViana/SCM), com a mesma stack e as mesmas convenções.

> **Versão experimental de demonstração:** https://rodrigomviana.github.io/SIGBEN/
> Usuário `sigben.demo` (todos os perfis) ou qualquer outro da tela de login, senha `123456`.
> Todos os dados são **fictícios**, e a demonstração roda inteiramente no navegador: as alterações valem até recarregar a página.

O SIGBEN controla o ciclo completo de um benefício:

- solicitação no portal do contribuinte, com cálculo da taxa e envio dos documentos exigidos;
- formalização no Atendimento, com recusa de documento e comunicação oficial;
- Informação Fiscal (viabilidade operacional) e análise jurídica com verificação de elegibilidade;
- parecer e Ato Declaratório redigidos a partir de textos padrão com tags, com contrapartidas estruturadas;
- homologação pelo Secretário, publicação no Diário Oficial, ciência do contribuinte e vigência.

O caminho de cada processo é definido pelo **Tipo de Concessão** do benefício no catálogo (Ato Declaratório, Parecer Fiscal ou fruição direta). Os atos nos sistemas corporativos (protocolo, comunicação pelo DT-e, registro do benefício) são executados por uma fila de integração assíncrona, rastreável e reprocessável.

| | |
|---|---|
| Backend | Java 21 · Spring Boot 4.1.2 · JPA/Hibernate · Flyway · Spring Security (JWT/OIDC) · ShedLock |
| Frontend | Angular 22.2 · NG-ZORRO 22.2 (Ant Design, licença MIT) |
| Banco | Oracle 19c+ (produção) · H2 em modo Oracle (desenvolvimento) |

## O que está neste repositório

Este repositório contém **apenas o necessário para a demonstração no ar**:

```
frontend/              Aplicação Angular
  src/app/demo/        API simulada no navegador (usada só no build "demo")
  demo/dados.json      Massa fictícia da demonstração
  scripts/             Gerador da massa a partir do back-end de desenvolvimento
.github/workflows/     Build e publicação no GitHub Pages
```

O back-end Java, a documentação (arquitetura, manual técnico, manual do usuário, integrações pendentes, relatório de testes) e os materiais do cliente são distribuídos internamente.

## Executando a demonstração localmente

Pré-requisito: Node.js 24. Na pasta `frontend`:

```bash
npm ci
```
```bash
npx ng build --configuration demo
```

O resultado fica em `frontend/dist/frontend/browser` e deve ser servido no caminho `/SIGBEN/`.

Com o back-end Java em execução (porta 8081), `npm start` sobe o front-end em http://localhost:4201 conectado à API real.

## Publicação

Cada push na `main` dispara o workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml), que gera o build de demonstração e publica no GitHub Pages. Na primeira vez, ative em **Settings → Pages → Source: GitHub Actions**.
