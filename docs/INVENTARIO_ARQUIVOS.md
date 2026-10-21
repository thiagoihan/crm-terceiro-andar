# Inventário de arquivos, dependências e pendências

Legenda: **[V]** verificado, **[I]** inferido, **[C]** a confirmar.

---

## 1. O que existe no projeto original

O protótipo é **um único arquivo** publicado como artifact no Claude [V]:

| Item | Valor |
|---|---|
| Arquivo | `crm.html` (cópia integral e sem alterações em `fonte-original/crm.html`) |
| Tamanho | 533.769 bytes · 3.483 linhas |
| SHA-256 | `e11f435a40174d5a89721874a7fd92ffa3c8aaf366ca5d37d857ad34ecee8ead` |
| Versão publicada | 45 (21/10/2026) |
| Endereço do artifact | `https://claude.ai/artifact/CgtDTBUEu2MUPoBjNcE2cR` (privado: só quem foi convidado abre) |
| Conteúdo | CSS (linhas 5 a 470) · marcação (472 a 491) · JavaScript (493 a 3483) |

**Não existem** outros arquivos de código, `package.json`, testes, repositório Git, arquivo de configuração ou `.env` [V]. Dois itens fazem parte do sistema, mas **ficam fora do arquivo**, na conta do Claude:

| Item fora do arquivo | Onde está | Copiado para |
|---|---|---|
| Recursos e regras de acesso declarados na publicação (db, assets, user, sample) | configuração do artifact | `fonte-original/plataforma/capacidades-e-regras-de-acesso.json` |
| Tarefa agendada "Radar diário de oportunidades" (06h50) | tarefas agendadas da conta | `fonte-original/automacao/radar-diario.md` (configuração + prompt integral) |

O arquivo HTML **não tem `<!doctype>`, `<html>`, `<head>` nem `<body>`**. A plataforma acrescenta essa estrutura ao publicar [V]. Para abrir fora do Claude, use `referencia/prototipo-local/preparar.sh`.

---

## 2. Conteúdo deste pacote

| Caminho | Bytes | SHA-256 (12) | O que é | Origem |
|---|---|---|---|---|
| `README.md` | 6.180 | — | visão geral e instruções | escrito nesta auditoria |
| `docs/DOCUMENTACAO_FUNCIONAL.md` | ~60 KB | — | módulos, telas, fluxos, regras | auditoria |
| `docs/ARQUITETURA_TECNICA.md` | ~23 KB | — | arquitetura atual e proposta | auditoria |
| `docs/ESPECIFICACAO_REQUISITOS.md` | ~22 KB | — | requisitos, aceite, API | auditoria |
| `docs/MODELO_DE_DADOS.md` | ~16 KB | — | dados atual e proposto, migração | auditoria |
| `docs/PLANO_DE_IMPLEMENTACAO.md` | ~10 KB | — | fases, testes, virada | auditoria |
| `docs/INVENTARIO_ARQUIVOS.md` | — | — | este arquivo | auditoria |
| `fonte-original/crm.html` | 533.769 | `e11f435a4017` | **código-fonte original** | cópia exata do artifact |
| `fonte-original/crm.html.sha256` | 90 | — | hash para conferência (`sha256sum -c`) | gerado |
| `fonte-original/automacao/radar-diario.md` | 5.643 | — | tarefa agendada do Radar | lida da conta em 21/10/2026 |
| `fonte-original/plataforma/capacidades-e-regras-de-acesso.json` | 939 | — | recursos e regras de acesso | lido da publicação |
| `proposta/schema.sql` | 32.832 | — | esquema PostgreSQL proposto (43 tabelas + 1 visão) | auditoria; **carregado sem erros no PostgreSQL 16** |
| `proposta/seed_catalogos.sql` | 46.976 | — | dados iniciais (17 famílias, 85 datas, 8 etapas, 5 serviços, 14 objetivos, 12 itens de checklist, 9 perguntas) | gerado dos catálogos; **carregado sem erros** |
| `proposta/dominio/tipos.ts` | 8.741 | — | tipos TypeScript | auditoria; `tsc --strict` sem erros |
| `proposta/dominio/regras.ts` | 16.859 | — | regras de negócio portadas | auditoria; `tsc --strict` sem erros |
| `proposta/dominio/regras.test.ts` | 6.055 | — | testes (9 grupos, todos passando) | auditoria |
| `proposta/dominio/paridade-com-prototipo.ts` | 2.901 | — | comparação com o código original (595 datas e 30 segmentos, 0 divergências) | auditoria |
| `referencia/catalogos/*.json` (7 arquivos) | ~52 KB | — | constantes do código no estado final | **extraídas automaticamente** de `crm.html` |
| `referencia/telas/*.png` (32 arquivos) | ~8 MB | — | capturas de todas as telas, abas e modais principais, em 1440 px | geradas com o protótipo em modo local e dados de demonstração |
| `referencia/dados-demonstracao.json` | 21.607 | — | dados fictícios (2 clientes, equipe sem e-mails, 8 itens de radar) | criados para as capturas |
| `referencia/prototipo-local/preparar.sh` | 1.167 | — | gera `index.html` e `carregar-demo.js` para abrir o protótipo no navegador | auditoria; testado |

---

## 3. Dependências

### 3.1 Do protótipo [V]

| Dependência | Tipo | Necessária fora do Claude? |
|---|---|---|
| Google Fonts (Sora, Figtree, JetBrains Mono) | CSS externo | Não. Há fontes de reserva do sistema; pode ser auto-hospedado |
| `window.claude.use('db')` | API da plataforma | **Sim.** Sem ela, o CRM entra em modo local (só navegador) |
| `window.claude.use('assets')` | API da plataforma | Sim, para fotos, logos e criativos |
| `window.claude.use('user')` | API da plataforma | Sim, para identidade |
| `window.claude.use('sample')` | API da plataforma (IA) | Sim, para "Sob medida com IA" |
| Tarefa agendada no Claude | automação externa | Sim, para o Radar diário |
| Navegador moderno (ES2020, `fetch`, `Intl`, `localStorage`, `fullscreen`) | ambiente | Sim |

**Nenhuma biblioteca JavaScript** e nenhum pacote npm [V].

### 3.2 Das ferramentas deste pacote

- **`schema.sql` e `seed_catalogos.sql`:** PostgreSQL 15 ou superior. Testado no 16. Usa as extensões `citext` e `pg_trgm`, nativas do PostgreSQL.
- **`proposta/dominio/*.ts`:** Node.js 20+ e `tsx`; testes com `node:test`, sem outras bibliotecas.
- **`preparar.sh`:** bash e Node.js.

---

## 4. Como obter o que não está no pacote

| Item | Situação | Como obter |
|---|---|---|
| **Dados do banco** (equipe, serviços, objetivos, radar, chat e, no futuro, clientes, tarefas…) | **Não incluídos** de propósito: têm dados pessoais (e-mails da equipe) e mudam com o uso | Opção 1: pedir ao Claude, na conversa do projeto, a exportação do banco do artifact em JSON (um arquivo por documento, por coleção). Opção 2: na versão nova, um script lê esse export (MODELO_DE_DADOS §3). **Repetir a exportação no dia da virada** |
| **Arquivos enviados** (fotos, logos, criativos em `/_blob/<id>`) | Não incluídos | Só abrem com a sessão logada no Claude. Ainda não há exportação em lote: abrir cada criativo no CRM e usar "Abrir arquivo", ou pedir ao Claude uma rotina de exportação na própria página (botão admin) [C]. Hoje há **1 foto de perfil** registrada e nenhum criativo [V] |
| **Atualizações estratégicas** (`updates/<conta>/items`) | 1 registro hoje | Incluir na exportação (uma subcoleção por conta vinculada) |
| **Histórico de versões do protótipo** (1 a 45) | Na plataforma Claude | Pode ser consultado no artifact; não é necessário para a reconstrução (vale a versão 45) |
| **Prompt da IA de sugestões** | **Incluído dentro do código** | `fonte-original/crm.html`, função `runAI` (≈ linhas 1744 a 1774) |
| **Textos das sugestões por regras** | Incluídos no código e nos catálogos | `playbook()` (≈ linhas 1666 a 1710) + `familias-de-segmento.json` |
| **Logo da agência** | Incluído no código como SVG inline | constante `LOGO_SVG` (≈ linha 1603) e marcação da barra lateral (linha 474). O manual de marca não faz parte do projeto [C] |
| **Credenciais, chaves, `.env`** | **Não existem** no protótipo | A versão nova vai precisar das variáveis de ARQUITETURA §6.7, criadas pela empresa |

---

## 5. Itens ausentes, incompletos ou que merecem atenção

| # | Item | Situação |
|---|---|---|
| A1 | Clientes, tarefas, projetos e follow-ups no banco | **Vazios** em 21/10/2026 [V]. Porém **9 reuniões e 1 atualização estratégica apontam para 8 clientes que não existem mais**: os clientes foram cadastrados e depois excluídos [V]. Confirmar com a agência se a exclusão foi intencional (limpeza de testes) ou se é perda de dados. Confirmar também se alguém usou o CRM em **modo local** (dados presos no navegador) [C] |
| A2 | Testes automatizados do protótipo | **Não existem.** Os testes deste pacote cobrem só as regras portadas |
| A3 | Integrações reais (helpdesk, WhatsApp, e-mail, agenda, anúncios) | **Não implementadas**; só links (DOCUMENTACAO §7) |
| A4 | Telas legadas no código (Tarefas, Projetos por marcos, Processos, Follow-up, Onboarding, Catálogo, Datas, Chat como página) | Presentes, mas **inacessíveis** pelo menu; não reconstruir |
| A5 | Calendário depois de 2028 | **Não implementado** (anos fixos) |
| A6 | Canal "Avisos" do chat | Código parcial (regra "só admin publica"), mas **o canal não está na lista** |
| A7 | Política de exclusão em cascata, retenção (LGPD), permissões finas | **A definir** (DOCUMENTACAO §8) |
| A8 | `projects.milestones` (marcos antigos) | Estrutura legada; sem dados no banco atual [V] |

---

## 6. Como conferir a integridade do código entregue

```bash
cd <pasta do pacote>
sha256sum -c fonte-original/crm.html.sha256     # deve responder: fonte-original/crm.html: OK
```
