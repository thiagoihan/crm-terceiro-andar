# Especificação de requisitos · versão independente

Este documento define **o que** a versão própria deve fazer para substituir o protótipo sem perder funcionalidade.

- O **comportamento detalhado** de cada tela está em `DOCUMENTACAO_FUNCIONAL.md` (referenciado como DF §x).
- Os **dados** estão em `MODELO_DE_DADOS.md` (MD §x).
- As regras já estão implementadas e testadas em `proposta/dominio/regras.ts` (com paridade conferida contra o código original).

**Prioridade:**
- **P1**: necessário para substituir o protótipo.
- **P2**: importante, logo depois.
- **P3**: melhoria nova.

Critérios de aceitação no formato **Dado / Quando / Então**, resumidos.

---

## 1. Requisitos funcionais

### 1.1 Acesso e equipe

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-01 | Login com conta corporativa (OIDC) ou e-mail e senha | P1 | Dado um usuário ativo, quando faz login, então entra com sessão válida por 12 h; senha errada 5 vezes bloqueia por 15 min; usuário inativo não entra |
| RF-02 | Vínculo usuário ↔ integrante pelo e-mail no 1º login; vínculo manual por admin | P1 | Dado `members.email = users.email` sem vínculo, quando a pessoa entra, então fica vinculada e vê "Bem-vindo(a), Nome"; um cadastro já vinculado a outro usuário não pode ser assumido |
| RF-03 | Papéis owner, admin, member e viewer, aplicados **na API** | P1 | Para cada ação de DF §2.2–2.4 existe um teste: member recebe 403 ao editar dados estratégicos, editar fluxo, serviços ou objetivos, excluir atualização de outro ou arquivar radar; viewer recebe 403 em qualquer gravação |
| RF-04 | Abertura por perfil: admin → Painel; equipe → Meu dia com filtros "meus" | P1 | Dado um member, ao entrar pela 1ª vez na sessão, então abre Meu dia com Produção, Criativos, Agenda e Projetos filtrados por ele |
| RF-05 | Cadastro de integrantes (nome, área, função, e-mail, admin, ranking, capacidade semanal) e remoção | P1 | Ao remover, as tarefas abertas ficam sem responsável e aparecem para reatribuir; a capacidade padrão é 15 |
| RF-06 | Perfil do integrante (foto, WhatsApp, e-mail, link de agendamento, link de videochamada, especialidades, bio) | P1 | Links não http(s) são recusados; a foto é salva recortada em quadrado; a própria pessoa e o admin editam |

### 1.2 Clientes e comercial

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-10 | CRUD de cliente ou lead com os campos de DF §4.4.2 | P1 | Nome obrigatório; ao criar um lead, são gerados 4 follow-ups de cadência (D+1, D+3, D+7, D+15, janela de 2 dias); mudar o foco ou os objetivos grava histórico |
| RF-11 | Funil kanban por etapa, com troca de etapa | P1 | Escolher "Fechado" abre a passagem de bastão (não fecha direto); "Perdido" abre o motivo de perda; toda mudança grava `stage_at` |
| RF-12 | Cadência comercial e registro de contato (DF §4.6.2) | P1 | "Respondeu e avançou", "Não tem interesse" ou data de retorno encerram a cadência; "Não tem interesse" sem etapa escolhida move para Perdido com motivo "Sem interesse"; o retorno cria o passo R |
| RF-13 | Passagem de bastão (DF §4.6.3) em **uma transação** | P1 | Com serviços, valor, responsável, início, decisor e expectativa preenchidos: cliente vira Fechado com `closed_at`; onboarding iniciado; cadência cancelada; tarefa "Kickoff com X" criada para o responsável com prazo hoje+2; mensagem no chat. Se qualquer passo falhar, nada é gravado |
| RF-14 | Perda de lead e cancelamento de cliente com motivo obrigatório | P1 | Lead → `lost_at`; cliente ativo → `churned_at` + aviso no chat; voltar de Perdido limpa as duas datas |
| RF-15 | Indicadores de conversão por responsável e por origem, por período (DF §4.6.5) | P1 | Com os dados do teste `conversão comercial` em `regras.test.ts`, a tela mostra conversão 50%, receita R$ 2.000 e ciclo de 20 dias |
| RF-16 | Ficha do cliente com todas as seções de DF §4.4.3 | P1 | Cada seção aparece conforme a etapa (lead × ativo), como no protótipo |
| RF-17 | Saúde da conta (DF §5.1) | P1 | Com o cenário do teste `saúde da conta`, a nota é 40, "Em risco", com 5 motivos listados |
| RF-18 | Contrato, renovação e reajuste com alertas (≤ 60 dias na ficha e ≤ 30 dias na saúde) | P1 | O cartão do cliente mostra "renova em N d" ou "contrato vencido" |
| RF-19 | Arquivos do cliente: pasta, link de envio, mensagem pronta, "material recebido" | P2 | "Material recebido" grava a data, avisa no chat e abre a tarefa pré-preenchida |
| RF-20 | Onboarding: checklist de 12 itens, serviços, diagnóstico de 9 perguntas, projetos por serviço | P1 | Itens do cliente pendentes entram em "Aguardando o cliente" desde o início; "Criar projeto para cada serviço" não duplica serviço que já tem projeto aberto |
| RF-21 | Logo do cliente (upload ou remoção) | P2 | A imagem é salva em 320×320 PNG; remover apaga o arquivo |
| RF-22 | Excluir cliente com política de cascata **definida** | P1 | [C] Opção recomendada: exclusão lógica do cliente e ocultação dos registros ligados; sem órfãos visíveis |

### 1.3 Relacionamento e estratégia

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-30 | Follow-ups (6 tipos + cadência) com janela, 1 ou 2 responsáveis e estados (DF §4.4.4) | P1 | Atrasado se hoje > fazer até; "fazer agora" dentro da janela |
| RF-31 | Follow-up automático de resultado ao concluir projeto ou publicar criativo | P1 | Janela hoje+7 a hoje+15, responsável = relacionamento; não duplica para a mesma origem; não cria para cliente perdido |
| RF-32 | Convite para videochamada com link de agendamento e mensagem editável; envio por WhatsApp, e-mail ou cópia; registro do envio | P1 | Bloqueia o envio sem link na mensagem, sem telefone (WhatsApp) ou sem e-mail; salva o link no perfil de quem conduz se estava vazio |
| RF-33 | Registrar a reunião de devolutiva e enviar a confirmação com link "salvar no Google Agenda" | P1 | A reunião fica ligada ao follow-up e aparece na Agenda e no Meu dia dos participantes |
| RF-34 | Registrar o follow-up feito (DF §4.4.4, passo 3) | P1 | Atualiza a satisfação do cliente e a ficha de relacionamento; cria o próximo follow (N a N+5 dias) mantendo o tipo estratégico |
| RF-35 | Ficha e linha do tempo de relacionamento | P2 | Campos salvam ao sair; a linha do tempo junta follow-ups, observações, reuniões, projetos, criativos, campanhas e fechamento |
| RF-36 | Resultados mensais com CPL e comparação | P1 | Um registro por cliente e mês (repetir o mês corrige); CPL = investimento ÷ leads; lista de pendentes do mês anterior |
| RF-37 | Área Estratégia: busca (inclui CNPJ), ficha, perfil de comunicação, follow quinzenal, entregas, atualizações (DF §4.5) | P1 | CNPJ com 14 dígitos (P3: validar dígitos verificadores); "Agendar follow quinzenal" cria para cada ativo sem follow (hoje+14 a +16); só admin edita dados e perfil |
| RF-38 | Atualizações do relacionamento com autor; todos publicam; só admin edita ou exclui | P1 | A edição marca "editado em"; a exclusão pede confirmação |

### 1.4 Produção

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-40 | Tarefas com todos os campos de DF §4.3.2 | P1 | Member não escolhe outro responsável; ao salvar, avisa se a pessoa passa da capacidade; tarefa para outra pessoa gera mensagem no chat |
| RF-41 | Status e regras de transição (DF §4.3.1, regras 1 a 8) | P1 | No máximo 1 "Em execução" por pessoa (a anterior vai para "Em andamento"); "Aguardando cliente" exige o que falta; "Aprovado" com cliente exige prova; histórico de mudanças |
| RF-42 | Prova de aprovação do cliente (DF §4.3.6) | P1 | Quem e data obrigatórios; link http(s); aparece na tarefa ou criativo e na ficha do cliente |
| RF-43 | Projetos com etapas = tarefas, criados pelo fluxo padrão ou pelo serviço | P1 | Distribuição pelo menor carga (função `pickLeastLoaded`); concluir a última etapa conclui o projeto e cria o follow; reabrir etapa reabre o projeto |
| RF-44 | Fluxo padrão editável (8 etapas, responsáveis, prazos) e quadro kanban por etapa | P1 | Mudanças valem só para novos projetos; cartão vermelho acima do prazo da etapa |
| RF-45 | Capacidade semanal (DF §4.3.7) | P1 | Com o teste `capacidade semanal`: carga 5 nesta semana e 1 na próxima; cores over e warn |
| RF-46 | Listas, contagens por status, "em execução agora", histórico | P1 | Ordenação = `sortOpenTasks` |
| RF-47 | Comentários na tarefa | P1 | Só quem pode trabalhar na tarefa comenta |

### 1.5 Planejamento

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-50 | Calendário de datas (85 do catálogo + personalizadas) para **qualquer ano** | P1 | As datas calculadas batem com `paridade-com-prototipo.ts` (0 divergências entre 2024 e 2030); o ano não é limitado a 2026–2028 |
| RF-51 | Campanhas por data e cliente, com projeto de 4 etapas e item no catálogo opcionais | P1 | Uma campanha por cliente escolhido; o projeto tem criticidade alta se faltam ≤ 30 dias |
| RF-52 | Catálogo mensal por cliente, status em ciclo, copiar mês anterior | P1 | A cópia vira "Planejado" e o dia é limitado ao último do mês |
| RF-53 | Datas por segmento (12 meses) e recomendações em 45 dias por família | P1 | Família detectada por `segmentFamilyOf` (testes de família passam) |
| RF-54 | Sugestões de conteúdo por regras (playbook) | P1 | Mesmo conteúdo do protótipo para a mesma data e família (portar `playbook()` e os textos de `FAMS`) |
| RF-55 | Sugestões com IA pelo servidor, salvas por cliente e data | P2 | Resposta validada (5 a 8 ideias, cronograma); "Parar" cancela; limite diário por usuário; sem chave configurada, o botão fica oculto |
| RF-56 | Radar: lista, filtros, combinação com clientes, criação manual, edição e arquivamento (admin) | P1 | Combinação = `radarMatches` (teste `radar combina com cliente`) |
| RF-57 | Radar diário automático às 06h50 | P2 | O job grava itens sem repetir título e data, com fonte; falha gera alerta; itens com mais de 30 dias são arquivados |
| RF-58 | "+ Criar tarefa" a partir de item do radar, recomendação ou ideia | P1 | Pré-preenche título, briefing, cliente (se único), categoria pelo formato e prazo (2 ou 3 dias antes, ou amanhã); o gestor escolhe o responsável |

### 1.6 Criativos, agenda, chat, apresentações

| ID | Requisito | P | Critérios de aceitação |
|---|---|---|---|
| RF-60 | Biblioteca de criativos: upload (até 20 MB; png, jpg, gif, webp, svg, mp4, webm, pdf), link, filtros, status | P1 | Arquivo fora do padrão é recusado com aviso; "Aprovado" com cliente exige prova; "Publicado" cria follow |
| RF-61 | Exclusão de criativo e do arquivo | P1 | Só quem enviou ou admin |
| RF-62 | Agenda externa e interna, agrupamentos, "só as que participo", alerta de 48 h | P1 | Reunião externa sem cliente é recusada |
| RF-63 | Chat da equipe com menções, não lidas sincronizadas, histórico, apagar a própria mensagem | P1 | 4.000 caracteres no máximo; a não lida é a mesma no celular e no computador |
| RF-64 | Mensagens automáticas (24 eventos de DF §4.11) com link para o registro | P1 | Cada evento gera exatamente uma mensagem, na mesma transação da ação |
| RF-65 | Apresentações em slides (por serviço e completa) personalizáveis | P2 | Mesmos slides do protótipo; tela cheia |
| RF-66 | Meu dia (DF §4.1) e Painel (DF §4.2) com os mesmos blocos e KPIs | P1 | Os valores batem com o protótipo para o mesmo conjunto de dados (teste de comparação na migração) |
| RF-67 | Ranking de entregas (soma de quantidade, desempate por no prazo) | P1 | Integrante fora do ranking não aparece |
| RF-68 | Serviços e objetivos editáveis (admin) | P1 | Serviços alimentam apresentações e etapas padrão |

### 1.7 Novos (não existem no protótipo)

| ID | Requisito | P |
|---|---|---|
| RF-80 | Notificação por e-mail ou push de tarefa atribuída, follow atrasado, menção no chat [C] | P3 |
| RF-81 | Exportar relatórios (clientes, tarefas, resultados) em CSV e PDF | P3 |
| RF-82 | Integração de agenda (Google ou Microsoft) para ler as reuniões marcadas pelo link de agendamento | P3 |
| RF-83 | Importar resultados do Meta Ads, Google Ads e Instagram | P3 |
| RF-84 | Trilha de auditoria consultável pelo owner | P2 |

---

## 2. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Linguagem e stack | TypeScript (strict) no front e no back; PostgreSQL 16 (ou MySQL 8 com os ajustes de MD §2.5) |
| RNF-02 | Segurança (RNF-SEG) | Toda regra de permissão aplicada na API; sessões HttpOnly; CSRF; rate limit no login e na IA; CSP; validação Zod em 100% das rotas; segredos fora do código |
| RNF-03 | Fuso e datas | "Hoje" e prazos calculados em America/Sao_Paulo no servidor; datas de calendário como DATE; instantes em UTC |
| RNF-04 | Concorrência | Gravação com controle de versão (409 em conflito); operações compostas em transação |
| RNF-05 | Desempenho | Listas paginadas; p95 < 300 ms nas consultas de tela com 1.000 clientes e 20.000 tarefas; primeira carga do app < 2 s em 4G |
| RNF-06 | Tempo real | Mudanças de outros usuários aparecem em até 5 s (SSE) |
| RNF-07 | Disponibilidade | 99,5% em horário comercial; reinício automático |
| RNF-08 | Backup | Diário + PITR de 7 dias; teste de restauração trimestral; arquivos com versionamento |
| RNF-09 | Auditoria | Criação, alteração e exclusão das entidades principais registradas com autor, data e alterações |
| RNF-10 | Privacidade (LGPD) | Inventário de dados pessoais; retenção definida; exportação e exclusão a pedido |
| RNF-11 | Acessibilidade | Navegação por teclado; rótulos em todos os campos (o protótipo já usa `aria-label` em botões de ícone); contraste AA nos dois temas |
| RNF-12 | Responsivo | Layout funcional a partir de 360 px, com barra inferior no celular (como hoje) |
| RNF-13 | Tema | Claro e escuro com os tokens de cor do protótipo (`:root` em `crm.html`) |
| RNF-14 | Idioma | Português do Brasil; formatos de data `dd/mm`, `dd/mm/aaaa` e moeda BRL |
| RNF-15 | Observabilidade | Logs JSON com id de requisição; Sentry; métricas de jobs (radar) |
| RNF-16 | Qualidade | Cobertura ≥ 80% em `packages/dominio`; testes de permissão para toda rota de gravação; testes ponta a ponta dos fluxos críticos (PLANO §4) |
| RNF-17 | Manutenibilidade | Uma implementação por regra (fim das funções sobrescritas); lint e formatação no CI |

---

## 3. Módulos e componentes

| Módulo (back-end) | Entidades | Telas (front-end) | Componentes reutilizáveis |
|---|---|---|---|
| auth | users, sessões | Login, vínculo | — |
| membros | members, files | Equipe › Pessoas, Perfil | Avatar, CapacityBar |
| clientes | clients, client_* | Clientes › Carteira e Ficha | ClientCard, HealthTag, ClientLogo |
| comercial | clients (leads), follow_ups (cadência), client_handoffs | Comercial › Funil, Cadência, Conversão | KanbanBoard, LeadCard, CadenceChips |
| relacionamento | follow_ups, invites, meetings, monthly_results | Clientes › Relacionamento, Onboarding, Histórico | FollowRow, InviteComposer, ResultsGrid |
| estrategia | client_profiles, strategic_updates | Estratégia | ProfileCard, Timeline |
| producao | tasks, projects, flow_stages, approvals | Produção › Tarefas, Fluxo, Projetos, Capacidade | TaskRow, StatusChips, ApprovalForm, FlowStrip |
| planejamento | catalog_items, campaigns, custom_dates, commemorative_dates, content_suggestions | Planejamento › Catálogo, Datas por segmento, Calendário | DateCard, IdeaCard, SuggestionModal |
| radar | radar_items | Planejamento › Radar, Recomendações 45 dias | RadarCard |
| criativos | creatives, files | Criativos | Gallery, FileDrop, Preview |
| agenda | meetings | Agenda | MeetingRow |
| chat | chat_messages, chat_reads | Chat flutuante | ChatPanel |
| ia | content_suggestions | (dentro de Sugestões) | — |
| apresentacoes | services, members | Apresentação em tela cheia | SlideDeck |
| painel | (consultas) | Meu dia, Painel | KpiCard, RankPanel, TodayList |
| auditoria | audit_log | Configurações (owner) | — |

**Componentes genéricos:** Modal (com "Voltar"), FormBuilder (a partir de esquema Zod), ConfirmButton (dois cliques), Toast, Tabs, Chips (seleção múltipla), DateInput, EmptyState.

---

## 4. Diferenças entre o protótipo e a versão de produção

| Tema | Protótipo | Produção |
|---|---|---|
| Hospedagem | artifact no Claude | infraestrutura da empresa |
| Login | conta do Claude + compartilhamento | OIDC ou senha, com papéis próprios |
| Permissões | interface + 4 regras no banco | todas na API, com testes |
| Banco | documentos, leitura total, sem integridade | relacional, paginado, com FKs, transações e versão |
| Regras e automações | no navegador de quem age | no servidor, em transação |
| Tempo real | `onSnapshot` de todas as coleções | SSE com eventos filtrados |
| IA | modelo da plataforma pelo navegador | API pelo servidor, com chave e limite |
| Radar | tarefa agendada no Claude | job pg-boss |
| Arquivos | `/_blob/` da plataforma | S3 com URL pré-assinada |
| Fuso | relógio do usuário | America/Sao_Paulo no servidor |
| Calendário | anos 2026–2028 | qualquer ano |
| Catálogos (segmentos, datas, checklist) | constantes no código | tabelas, com tela de manutenção (P2) |
| Testes | nenhum | unitários, integração, E2E, permissões |
| Backup e logs | da plataforma, sem acesso | sob controle da empresa |
| Telas legadas e marcos de projeto | ainda no código | não reconstruir |
| Modo local (sem banco) | existe | não reconstruir |

---

## 5. Contratos de API (resumo)

Base `/api/v1`. Todas as rotas exigem sessão, exceto as de `auth`. Gravações retornam o recurso com `updatedAt`. Erros em `application/problem+json`.

| Recurso | Rotas | Observação |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/oidc/callback`, `GET /me` | `/me` devolve usuário, papel e integrante vinculado |
| Membros | `GET/POST /members`, `GET/PATCH/DELETE /members/:id`, `POST /members/:id/link` (admin) | `DELETE` = exclusão lógica + desatribuir tarefas |
| Clientes | `GET /clients?stage=&q=&owner=&cursor=`, `POST /clients`, `GET/PATCH/DELETE /clients/:id` | `POST` de lead cria a cadência na mesma transação |
| Ações de cliente | `POST /clients/:id/stage` `{stage}` → 409 se exigir formulário; `POST /clients/:id/handoff`; `POST /clients/:id/loss`; `POST /clients/:id/notes`; `PUT /clients/:id/profile`; `PUT /clients/:id/relationship`; `PUT /clients/:id/onboarding/checklist/:code`; `PUT /clients/:id/onboarding/answers/:code`; `POST /clients/:id/material-received` | Cada uma em transação; eventos de chat gerados no servidor |
| Saúde | `GET /clients/:id/health` (também embutida nas listas) | calculada por `accountHealth` |
| Tarefas | `GET /tasks?assignee=&status=&client=&project=&due_before=&cursor=`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `POST /tasks/:id/status` `{status, waitingWhat?, approval?}`, `POST /tasks/:id/comments` | `status` aplica as regras de DF §4.3.1; 422 `approval_required` quando falta a prova |
| Projetos | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/apply-flow` `{stageCodes, mode}` | criação com `flowMode` gera as etapas |
| Fluxo | `GET /flow`, `PUT /flow` (admin) | substitui a lista de etapas |
| Capacidade | `GET /capacity?week=0\|1` | carga por integrante |
| Follow-ups | `GET /follow-ups?owner=&type=&state=&client=`, `POST /follow-ups`, `PATCH /follow-ups/:id`, `POST /follow-ups/:id/complete`, `POST /follow-ups/:id/invites`, `POST /follow-ups/bulk-strategic` (admin) | `complete` cria o próximo |
| Cadência | `POST /clients/:id/cadence/start`, `POST /cadence/start-all`, `POST /follow-ups/:id/cadence-contact` | regras de DF §4.6.2 |
| Reuniões | `GET /meetings?scope=&from=&to=&mine=`, `POST /meetings`, `PATCH/DELETE /meetings/:id` | — |
| Resultados | `GET /clients/:id/results`, `PUT /clients/:id/results/:month` | upsert pelo mês |
| Estratégia | `GET /strategy/clients?q=`, `GET/POST /clients/:id/updates`, `PATCH/DELETE /updates/:id` (admin) | busca inclui CNPJ |
| Datas | `GET /dates?year=&category=&client=`, `POST/PATCH/DELETE /custom-dates/:id` | as datas do catálogo são calculadas por `resolveDate` |
| Campanhas | `GET/POST /campaigns`, `GET/PATCH/DELETE /campaigns/:id`, `POST /campaigns/:id/project`, `POST /campaigns/:id/catalog` | `POST` com vários clientes cria várias |
| Catálogo | `GET /catalog?client=&month=`, `POST /catalog-items`, `PATCH/DELETE /catalog-items/:id`, `POST /catalog/copy-previous` `{client, month}` | — |
| Sugestões | `GET /suggestions/playbook?dateKey=&family=&client=`, `POST /ai/content-suggestions` `{clientId, dateKey}` (SSE opcional), `GET /clients/:id/suggestions/:dateKey` | — |
| Radar | `GET /radar?days=&kind=&client=`, `POST /radar` (manual), `PATCH /radar/:id` e `POST /radar/:id/archive` (admin), `GET /radar/recommendations?family=&days=45` | — |
| Criativos | `GET /creatives?client=&format=&status=&member=&q=`, `POST /creatives`, `PATCH /creatives/:id`, `POST /creatives/:id/status`, `DELETE /creatives/:id` | — |
| Arquivos | `POST /files/upload-url` `{contentType, size, purpose}`, `POST /files/:id/complete`, `GET /files/:id/url` | valida tipo e tamanho |
| Chat | `GET /chat?channel=&before=`, `POST /chat`, `DELETE /chat/:id` (autor), `PUT /chat/read` `{channel, at}` | — |
| Painel | `GET /dashboard/admin`, `GET /dashboard/me` | KPIs de DF §4.1–4.2 calculados no servidor |
| Eventos | `GET /events` (SSE) | `{entity, id, action}` |
| Catálogos | `GET /catalogs/segment-families`, `/commemorative-dates`, `/checklist`, `/diagnostic`, `/enums` | lidos na inicialização do front |

**Integrações externas** (sem API no protótipo; manter como links):
- `https://wa.me/<55+número>?text=<urlencoded>`
- `mailto:<email>?subject=&body=`
- `https://calendar.google.com/calendar/render?action=TEMPLATE&text=&dates=<inicio>/<fim>&details=`
