# CRM Marketing & Processos · Agência Terceiro Andar

**Pacote de transferência para o time de desenvolvimento.** Auditoria feita em 21/10/2026.

Este pacote reúne:
- O **código-fonte original** do protótipo construído no Claude.
- A **documentação funcional e técnica** do que ele faz.
- Uma **proposta de arquitetura independente** em **TypeScript + PostgreSQL**, com esquema de banco, tipos e regras de negócio já escritos e testados.

## O que é o sistema

Ferramenta interna da agência, usada por 10 integrantes cadastrados. Cobre:

| Área | O que faz |
|---|---|
| Comercial | funil, cadência de contatos, passagem de bastão, conversão |
| Clientes e relacionamento | carteira, saúde da conta, follow-ups, convites de videochamada, contratos, resultados mensais, onboarding |
| Estratégia | ficha e perfil do cliente, follow quinzenal, histórico de atualizações |
| Produção | tarefas, projetos com etapas, fluxo padrão, capacidade semanal, prova de aprovação |
| Planejamento | catálogo mensal, datas comemorativas, campanhas, sugestões de conteúdo (por regras e por IA), radar diário de oportunidades |
| Criativos, Agenda, Equipe, Chat e apresentações em slides | — |

Detalhes em [`docs/DOCUMENTACAO_FUNCIONAL.md`](docs/DOCUMENTACAO_FUNCIONAL.md).

## Situação do protótipo (resumo da auditoria)

- **Código:** um único arquivo `crm.html` (534 KB, 3.483 linhas). HTML, CSS e **JavaScript puro**, sem framework, bibliotecas, build ou testes. 38 funções são redefinidas por módulos acrescentados depois (vale a última).
- **Dependência da plataforma Claude:** banco de dados, login, arquivos, IA e a automação do Radar (tarefa agendada às 06h50). Nenhuma chave ou segredo está no código.
- **Permissões:** quase todas existem **só na interface**. O banco protege 4 coleções.
- **Funcionalidades:** todas as telas e fluxos estão funcionando no protótipo. Algumas partes são **parciais** (WhatsApp e e-mail só abrem o app; o agendamento só usa o link) ou **heurísticas** (sugestões por regras).
- **Dados reais:** em 21/10/2026, o banco tem 10 integrantes, 5 serviços, 14 objetivos, 19 itens de radar, 9 reuniões, 1 atualização e 1 conversa. **Não há clientes, tarefas, projetos nem follow-ups.** As reuniões e a atualização apontam para 8 clientes que foram excluídos (ver INVENTARIO §5, A1).
- **Não está pronto para produção.** Ver os riscos em [`docs/ARQUITETURA_TECNICA.md` §1.6](docs/ARQUITETURA_TECNICA.md).

## Proposta

React + Vite (web) · NestJS (API) · PostgreSQL 16 · Drizzle · pg-boss (jobs) · S3 (arquivos) · OIDC (login) · API de IA pelo servidor. Todas as escolhas estão justificadas em [`docs/ARQUITETURA_TECNICA.md`](docs/ARQUITETURA_TECNICA.md) §4. Se a empresa preferir MySQL 8, os ajustes estão em [`docs/MODELO_DE_DADOS.md`](docs/MODELO_DE_DADOS.md) §2.5.

## Estrutura do pacote

```text
README.md                         este arquivo
docs/
  DOCUMENTACAO_FUNCIONAL.md       módulos, telas, fluxos, regras, cálculos, automações, pendências
  ARQUITETURA_TECNICA.md          arquitetura atual, dependências, riscos e arquitetura proposta
  ESPECIFICACAO_REQUISITOS.md     requisitos funcionais e não funcionais, critérios de aceitação, API
  MODELO_DE_DADOS.md              modelo atual (documentos) e proposto (relacional), mapeamento, migração
  PLANO_DE_IMPLEMENTACAO.md       fases, prioridades, plano de testes, migração e virada
  INVENTARIO_ARQUIVOS.md          todos os arquivos, dependências, ausências e como obter o que falta
fonte-original/
  crm.html                        código-fonte integral do protótipo (versão 45, sem alterações)
  crm.html.sha256                 hash para conferência
  automacao/radar-diario.md       configuração e prompt integral da tarefa agendada do Radar
  plataforma/capacidades-e-regras-de-acesso.json   recursos e regras de acesso declarados na publicação
proposta/
  schema.sql                      esquema PostgreSQL (43 tabelas + 1 visão), testado no PostgreSQL 16
  seed_catalogos.sql              dados iniciais extraídos do código (segmentos, datas, fluxo, serviços…)
  dominio/tipos.ts                tipos de domínio em TypeScript
  dominio/regras.ts               regras de negócio portadas para funções puras
  dominio/regras.test.ts          testes (9 grupos, todos passando)
  dominio/paridade-com-prototipo.ts   compara as regras novas com o código original (0 divergências)
referencia/
  catalogos/*.json                listas, datas, famílias de segmento, serviços e fluxo, extraídos do código
  telas/*.png                     32 capturas de todas as telas, abas e modais principais (dados de demonstração)
  dados-demonstracao.json         dados fictícios usados nas capturas
  prototipo-local/                como abrir o protótipo no navegador, fora do Claude
```

## Como começar (para o time)

1. Leia este README e depois a [`DOCUMENTACAO_FUNCIONAL.md`](docs/DOCUMENTACAO_FUNCIONAL.md), acompanhando as capturas em `referencia/telas/`.
2. **Abra o protótipo localmente** para navegar:
   ```bash
   bash referencia/prototipo-local/preparar.sh
   # abra referencia/prototipo-local/index.html no navegador
   # no console (F12), cole o conteúdo de referencia/prototipo-local/carregar-demo.js
   ```
   Fora do Claude, ele roda em **modo local**: os dados ficam só no navegador e o usuário é tratado como administrador.
3. Rode o banco proposto e as regras:
   ```bash
   createdb crm && psql -d crm -f proposta/schema.sql && psql -d crm -f proposta/seed_catalogos.sql
   npx tsx --test proposta/dominio/regras.test.ts
   npx tsx proposta/dominio/paridade-com-prototipo.ts
   ```
4. Siga o [`PLANO_DE_IMPLEMENTACAO.md`](docs/PLANO_DE_IMPLEMENTACAO.md).

## Convenções da documentação

- **[V] Verificado:** lido no código e/ou observado funcionando.
- **[I] Inferido:** dedução a partir do código, ainda não testada com usuários reais.
- **[C] A confirmar:** depende de decisão da agência.

Nenhum documento contém senhas, tokens, chaves de API ou credenciais. O protótipo não tem nenhuma, porque a autenticação era feita pela plataforma.

## Contato

Responsável pelo protótipo na agência: Thiago Ihan Paulino (Agência Terceiro Andar).
