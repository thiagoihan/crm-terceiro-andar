# Documentação funcional · CRM Marketing & Processos (Agência Terceiro Andar)

Este documento descreve módulos, telas, fluxos, regras de negócio, cálculos e automações do protótipo **como ele está hoje**. A base é a leitura do código-fonte (`fonte-original/crm.html`, SHA-256 `e11f435a…ead`) e a navegação pelo sistema com dados de demonstração. As telas estão em `referencia/telas/` e os catálogos de dados (datas, segmentos, serviços, fluxo, listas) em `referencia/catalogos/`.

**Legenda de confiabilidade**, usada em todo o documento:

- **[V] Verificado:** lido no código e/ou observado funcionando.
- **[I] Inferido:** conclusão a partir do código, sem teste de ponta a ponta com usuários reais.
- **[C] A confirmar:** depende de decisão da agência ou de informação fora do código.

Quando não há marcação, vale **[V]**.

---

## 1. Objetivo do sistema

O CRM é a ferramenta interna da Agência Terceiro Andar, uma agência de marketing de Além Paraíba (MG). Ele reúne num só lugar:

1. **Comercial:** leads, funil, cadência de contatos, passagem do cliente fechado para o atendimento ("passagem de bastão") e indicadores de conversão.
2. **Atendimento e relacionamento:** carteira de clientes, saúde da conta, follow-ups, convites para reunião de devolutiva por vídeo, contratos, renovações e resultados mensais.
3. **Estratégia:** ficha estratégica do cliente, perfil de comunicação, follow-up quinzenal e histórico de atualizações com autor.
4. **Produção:** tarefas, projetos com etapas, fluxo padrão de produção, capacidade semanal da equipe e prova de aprovação do cliente.
5. **Planejamento de conteúdo:** catálogo mensal por cliente, calendário de datas comemorativas, campanhas, sugestões de conteúdo (por regras e por IA) e o Radar de oportunidades diário.
6. **Equipe:** cadastro de integrantes, perfis, ranking de entregas, chat interno e avisos automáticos.

**Problemas que ele resolve** [I], a partir dos textos da própria interface:

- Informação de venda que se perdia na passagem para o atendimento.
- Falta de rotina de contato com o cliente depois das entregas.
- Falta de visão de carga da equipe.
- Pendências paradas com o cliente sem cobrança.
- Conteúdo de datas comemorativas e de acontecimentos (jogos, feriados) preparado em cima da hora.
- Ausência de registro de quem aprovou o quê.

---

## 2. Perfis de usuário e permissões

### 2.1 Como a pessoa é identificada

- **Identidade:** o login é a conta do Claude da pessoa. O CRM recebe da plataforma `id`, `email`, `name`, `avatarUrl`, `isOwner` (dono do artifact) e `canEdit` (tem acesso de Editor).
- **Vínculo com o cadastro:** a conta é ligada a um integrante (`members.accountId`) de duas formas.
  - Automática, quando o e-mail da conta é igual ao `members.email` de um cadastro ainda sem vínculo.
  - Manual, pelo quadro **"Quem é você na equipe?"**, com os botões "Sou [nome]", "Não estou na lista" (cria o próprio cadastro) e "Agora não" (esconde o quadro até fechar a aba).
- **Proteção do vínculo:** um cadastro já ligado a outra conta não pode ser assumido. Só o dono ou um administrador desvincula. A própria pessoa pode "Trocar" (desvincular a si mesma) com confirmação em dois cliques.

### 2.2 Perfis

| Perfil | Como se torna | O que vê ao abrir | Poderes |
|---|---|---|---|
| **Administrador** | Dono do artifact, **ou** acesso de Editor no compartilhamento, **ou** `members.admin = true` | Painel | Tudo: atribuir tarefas a qualquer pessoa, editar e excluir tarefas de outros, gerir equipe, editar fluxo, serviços e objetivos, editar dados e perfil estratégico do cliente, editar e excluir atualizações de outros, editar e arquivar itens do radar, agendar follows estratégicos em massa, ver "Em execução agora" e os KPIs financeiros do Painel |
| **Equipe** (Colaborador) | Qualquer conta vinculada sem os critérios acima | Meu dia, com filtros "só os meus" ligados | Criar tarefas (para si), trabalhar nas tarefas atribuídas, criar e editar clientes, leads, reuniões, follow-ups, criativos, campanhas e catálogo, publicar atualizações, editar o próprio perfil |
| **Sem vínculo** | Conta do Claude ainda não ligada a um cadastro | Quadro de vínculo; Meu dia vazio | Navega e lê. Algumas ações exigem vínculo (chat, atualizações em modo db) |
| **Modo local** | CRM aberto fora do Claude (sem banco) | Painel | Tudo é tratado como administrador; os dados ficam **só no navegador** |

### 2.3 Onde as permissões são aplicadas

- **No servidor (regras do banco da plataforma)** [V]:
  - `process`, `services` e `objectives`: só administrador grava.
  - `updates/*`: leitura para quem visualiza, gravação de administrador.
  - `updates/{própria conta}/items`: cada pessoa grava na própria pasta.
  - Upload de arquivos: qualquer pessoa com acesso de uso.
  - Ver `fonte-original/plataforma/capacidades-e-regras-de-acesso.json`.
- **Só na interface** [V]: todas as demais regras da tabela acima, por exemplo "só admin edita dados do cliente" e "só quem criou ou admin exclui a tarefa". Pelo banco, qualquer pessoa com acesso de uso conseguiria gravar nessas coleções. **Na versão própria, essas regras precisam ir para o back-end** (ver `ESPECIFICACAO_REQUISITOS.md`, RNF-SEG).

### 2.4 Regras de tarefa

- **Gerenciar** (editar, excluir) = administrador **ou** quem criou a tarefa.
- **Trabalhar** (mudar status, concluir, comentar) = quem pode gerenciar **ou** o responsável.
- Um não administrador que cria tarefa fica automaticamente como responsável. Ele não escolhe outra pessoa.

---

## 3. Navegação

### 3.1 Menu principal (lateral no computador, barra inferior no celular)

| Ordem | Área | Rótulo no celular | Indicador (número vermelho) |
|---|---|---|---|
| 1 | Meu dia | Meu dia | minhas tarefas atrasadas ou perto do prazo + meus follow-ups atrasados |
| 2 | Painel | Painel | — |
| 3 | Produção | Produção | tarefas atrasadas (todas para admin; as minhas para equipe) |
| 4 | Clientes | Clientes | follow-ups de relacionamento atrasados |
| 5 | Estratégia | Estratégia | follows estratégicos atrasados |
| 6 | Comercial | Comercial | contatos de cadência na janela ou atrasados |
| 7 | Planejamento | Planejar | itens do radar com data de hoje |
| 8 | Criativos | Artes | — |
| 9 | Agenda | Agenda | — |
| 10 | Equipe | Equipe | — |

- **Topo do menu:** cartão "quem sou eu" com foto, nome, área e "Administrador". Tocar nele abre o perfil; o botão "Trocar" desvincula.
- **Rodapé:** status de sincronização ("Sincronizado com a equipe", "Conexão perdida…" ou "Modo local…").
- **Sempre visível:** botão flutuante **Chat** no canto inferior direito.
- **Última área aberta:** é lembrada no navegador. A tela é atualizada sozinha a cada 60 segundos quando nada está em edição.
- **Endereços antigos** (legado, redirecionados): Tarefas, Projetos e Processos levam a Produção; Follow-up e Onboarding a Clientes; Catálogo e Datas a Planejamento; Chat a Meu dia.

### 3.2 Padrões de interface (para reproduzir)

- **Janelas modais:** formulários, fichas e detalhes abrem em modal. O modal tem "Voltar" quando veio de outra ficha, fecha com ×, com "Esc" ou com clique fora.
- **Exclusão:** sempre em dois cliques. O botão vira "Confirmar…" e volta ao normal em 3 a 4 segundos.
- **Avisos curtos (toast):** aparecem embaixo por cerca de 2,6 segundos.
- **Validação:** campo obrigatório vazio mostra "Preencha "[campo]"." e foca o campo. Links precisam começar com `http://` ou `https://`.
- **Busca:** filtra enquanto digita, com espera de 120 a 150 ms.
- **Tema:** claro e escuro conforme o sistema. A barra lateral é preta com a marca. Cores e fontes estão na seção `<style>` do arquivo original (Sora, Figtree e JetBrains Mono).
- **Celular:** layout responsivo com barra de navegação inferior.

---

## 4. Módulos

### 4.1 Meu dia (`vMeuDia`) — tela `01-meudia.png`

É a tela inicial de quem não é administrador. Mostra só o que é da pessoa.

| Bloco | Conteúdo e regra |
|---|---|
| Cabeçalho | Foto, nome, função, **pontos da semana / capacidade** (vermelho se acima). Botões: Meu perfil ou Adicionar minha foto, + Interna (reunião interna), ↑ Enviar arte, + Tarefa |
| **Hoje** | Lista única ordenada por atrasado > urgente > data > hora. Inclui: tarefas e etapas com prazo até hoje; follow-ups e contatos de cadência na janela ou atrasados; itens do catálogo não publicados com data entre hoje−7 e hoje; criativos com "Ajustes solicitados" (vermelho se pedido há 2+ dias); reuniões de hoje (as passadas ficam esmaecidas). Mostra "X para hoje · Y atrasados" |
| Minhas próximas tarefas | Até 10 tarefas abertas com prazo futuro, com caixa para concluir. Mostra quantas foram concluídas hoje |
| No radar · próximos 10 dias | Até 6 itens do radar, primeiro os que combinam com os clientes da pessoa |
| Ranking de entregas | Ver 4.12.3 |
| Em execução agora | Só administrador. Ver 4.12.4 |
| Minhas reuniões · 7 dias | Reuniões em que participa, de 1 hora atrás até 7 dias à frente |
| Meus criativos em andamento | Criativos dela em "Em criação", "Em aprovação" ou "Ajustes solicitados" (os ajustes primeiro) |
| Conteúdos do catálogo · 14 dias | Itens do catálogo dela, não publicados, com data até hoje+14 |
| Cobrar dos meus clientes | Pendências "aguardando o cliente" dos clientes em que ela é responsável |
| Meus clientes (ou Meus leads e clientes, para o Comercial) | Clientes fechados em que ela é responsável pelo relacionamento, mais leads em que é responsável comercial, com saúde e próximo passo |

Sem vínculo, a tela mostra "Vincule a sua conta para ver o seu dia".

### 4.2 Painel (`vPainel`) — tela `02-painel.png`

**KPIs do administrador (8 cartões):**

| Cartão | Cálculo |
|---|---|
| Receita recorrente | Σ `value` dos clientes "Fechado" |
| Novos no mês | clientes com `closedAt` no mês atual, e o valor somado |
| Cancelados no mês | clientes com `churnedAt` no mês atual, e o valor perdido |
| Renovações e reajustes | contratos ou reajustes entre hoje−30 e hoje+60 (alerta se algum ≤ 30 dias) |
| Capacidade da equipe | Σ carga da semana ÷ Σ capacidade de quem participa do ranking (alerta se alguém acima) |
| Funil comercial | leads em aberto e valor potencial mensal |
| Contas em risco | clientes com saúde "Em risco" (ver 5.1) |
| Aguardando cliente | pendências paradas com o cliente, e quantos resultados do mês faltam registrar |

**KPIs da equipe (4 cartões):** clientes ativos, contas em risco, aguardando cliente, capacidade.

**Blocos seguintes:**
- Tarefas da equipe (admin) ou Minhas tarefas: até 12, com "Ver todas e concluídas".
- Ranking de entregas.
- Em execução agora (admin).
- Clientes com campanha ou projeto ativo: tabela com cliente, saúde, campanha ou projeto com % concluída, etapa atual, responsável agora e prazo.
- Alerta "Ninguém na área de Estratégia", quando não há integrante dessa área.
- Reuniões · 7 dias, com filtro por nível de criticidade.
- Saúde das contas: as 8 piores, com motivos.
- Aguardando o cliente: as 8 mais antigas.
- Funil comercial: barras por etapa.
- **Atalhos:** + Reunião, + Projeto, + Cliente, + Tarefa.

### 4.3 Produção (`vProducao`) — telas `03` a `06`

Tarefas avulsas e etapas de projeto são **a mesma entidade** (`todos`): aparecem juntas, contam na capacidade e no ranking.

#### 4.3.1 Aba Tarefas (`vTarefas`)

- **Cartões de status** (clicáveis, filtram a lista): Total em aberto; Aberto; Em execução; Em andamento; Em espera; Aguardando cliente; Aguardando aprovação; Aprovado; Concluídas no mês.
- **Agora em execução:** um cartão por pessoa, com a tarefa em execução e há quanto tempo, ou a contagem das outras tarefas por status.
- **Tabela por integrante:** contagem por status, atrasadas e concluídas no mês. Clicar na linha filtra a lista pela pessoa.
- **Lista** filtrável por pessoa e "Histórico de tarefas" (modal com abertas e as últimas 40 concluídas).

**Status de tarefa** (ordem fixa): Aberto → Em execução → Em andamento → Em espera → Aguardando cliente → Aguardando aprovação → Aprovado → Concluída. Valores antigos são lidos como: "A fazer" = Aberto, "Fazendo" = Em andamento.

**Regras de mudança de status** (`setTaskStatus`):

1. **Em execução:**
   - Grava `execAt`.
   - Qualquer outra tarefa da mesma pessoa que estava "Em execução" passa para "Em andamento". Cada pessoa tem **no máximo 1 tarefa em execução**.
2. **Aguardando cliente:**
   - Antes de gravar, pede "O que falta do cliente".
   - Grava `waitingSince` (hoje) e `waitingWhat`.
   - Ao sair desse status, os dois campos são apagados.
3. **Aprovado, ou Concluída na etapa "Aprovação do cliente" (`stageId = s-aprov`):**
   - Se a tarefa tem cliente e ainda não tem prova de aprovação, abre o formulário de **prova de aprovação** (4.3.6) antes de gravar.
4. **Primeira saída de "Aberto"** para um status diferente de Concluída grava `startedAt`.
5. **Concluída:**
   - Grava `doneAt`, com a data de hoje.
   - Se a tarefa é etapa de projeto:
     - A próxima etapa aberta recebe `startedAt`, e o chat avisa quem é o próximo.
     - Se não há próxima, o projeto é **concluído automaticamente** e cria-se um follow-up de resultado (ver 4.4.4).
6. **Reabrir uma etapa concluída** reabre o projeto, se ele estava concluído.
7. **Histórico:** cada mudança entra em `history` (as últimas 30, com status, data e hora, e autor).
8. **Chat:** há mensagem automática para "enviou para aprovação", "registrou a aprovação", "concluiu", "colocou em espera" e "marcou como aguardando o cliente".

**Estado de prazo** (`taskState`): concluída; **atrasada** se o prazo passou, ou se vence hoje e já passou do `dueTime`; **perto do prazo** se faltam ≤ 2 dias; **ok** nos demais casos.

**Ordenação** das listas: urgentes primeiro, depois atrasadas, perto do prazo, ok, depois data limite e por fim nível (maior primeiro).

#### 4.3.2 Formulário de tarefa (`taskForm`) — tela `29-modal-nova-tarefa.png`

| Campo | Tipo | Regra |
|---|---|---|
| Tarefa (ou "Etapa / tarefa" em projeto) | texto | **obrigatório** |
| Solicitante | texto com sugestões (clientes, contatos, integrantes) | — |
| Cliente | seleção | "Nenhum / interno" |
| Projeto | seleção (projetos abertos) | "Tarefa avulsa"; se escolhido e sem cliente, herda o cliente do projeto e vai para o fim da sequência |
| Especialista (responsável) | seleção mostrando "Nome · Área · X/15 pts na semana" | **obrigatório**, só aparece para admin |
| Tipo de atendimento | seleção (14 opções: Banner, Outdoor, Encarte…) | — |
| Categoria | Edição de foto, Edição de vídeo, Captação de foto, Captação de vídeo, Arte, Não se aplica | — |
| Subcategoria | Feed, Stories, Feed e stories, Reels, Site, Não se aplica | — |
| Nível de esforço | 1 simples (1 ponto), 2 médio (2), 3 complexo (3) | conta na capacidade |
| Quantidade | número (padrão 1) | soma no ranking |
| Formato de atendimento | Remoto / Presencial | padrão Remoto |
| Urgência | marcador "Urgente" | — |
| Data limite | data | **obrigatório**; padrão hoje+3 |
| Horário limite | hora | opcional |
| Detalhes | texto longo | — |

Ao salvar:
- Avisa se a pessoa ficou **acima da capacidade semanal**.
- Se a tarefa é para outra pessoa, publica no chat "**Fulano** criou a tarefa **X** para **Beltrano** · cliente · prazo".

#### 4.3.3 Detalhe da tarefa (`taskDetail`)

- **Informações:** aberta em (data e hora), solicitante, cliente, especialista, tipo, categoria, subcategoria, nível, quantidade, formato.
- **Alertas:** urgente; etapa N de M do projeto; aguardando o cliente há X dias.
- **Ações e registros:** chips de status, prova de aprovação, detalhes, comentários (texto, autor, data e hora) e carimbo "Criado por… · Última alteração por… em…".

#### 4.3.4 Aba Fluxo (`vFluxoBody`) — tela `04`

- **Faixa das etapas do fluxo padrão:** número, nome, responsáveis (fotos), área, prazo em dias e quantos projetos estão nela.
- **Alerta** de etapas sem responsável.
- **Quadro kanban:** uma coluna por etapa, com os projetos cuja **etapa atual** (primeira tarefa aberta) está nela. Há uma coluna "Etapas extras" para tarefas que não são do fluxo.
- **Cartão do projeto:** vermelho se acima do prazo da etapa ou atrasado; laranja se aguardando cliente. Mostra cliente, posição N/M, responsável, prazo e há quantos dias está na etapa, com os botões "Abrir" e "Concluir etapa →" (ou "Concluir ✓" na última).
- **Filtros:** cliente e "Só onde eu sou responsável".
- **Detalhe da etapa:** responsáveis, o que fazer, "pronto quando" e para quem passa.

**Fluxo padrão** (8 etapas; editável por admin; ver `referencia/catalogos/fluxo-padrao.json`):

| # | Etapa | Área | Prazo (dias) |
|---|---|---|---|
| 1 | Briefing com o cliente | Relacionamento | 2 |
| 2 | Estratégia e foco de marketing | Estratégia | 3 |
| 3 | Captação de vídeo e foto | Audiovisual | 3 |
| 4 | Edição do material | Audiovisual | 3 |
| 5 | Design das peças | Design | 3 |
| 6 | Revisão interna | Estratégia | 1 |
| 7 | Aprovação do cliente | Relacionamento | 3 |
| 8 | Publicação e entrega | Relacionamento | 1 |

**Editor do fluxo** (admin):
- Por etapa: nome, área, prazo em dias, responsáveis específicos (opcional), "o que fazer" e "pronto quando".
- Permite subir, descer, excluir (com confirmação; mínimo de 1 etapa), adicionar, "Voltar ao padrão" e salvar.
- As mudanças valem só para os próximos projetos.

**Responsáveis da etapa:** os marcados no editor ou, se nenhum, todos os integrantes da área da etapa.

#### 4.3.5 Aba Projetos e ficha do projeto — tela `05`

- **Lista:** abas Em andamento e Concluídos, com filtros "Toda a equipe / Onde eu participo / pessoa" e cliente (ou Interno).
- **Cartão:** criticidade, cliente, serviço, líder, barra de progresso (concluídas/total), "Agora: etapa · pessoa", prazo, pendências com o cliente e etapas atrasadas.
- **Formulário de projeto:**
  - Campos: nome (**obrigatório**), cliente, líder, serviço, nível de criticidade (Crítico, Alto, Médio, Baixo), prazo final, chamado no helpdesk (número ou link) e descrição.
  - Só na criação, **Etapas do projeto**: fluxo padrão (recomendado, com escolha das etapas), etapas padrão do serviço ou sem etapas.
- **Geração das etapas pelo fluxo** (`flowItems`):
  - Uma tarefa por etapa escolhida.
  - O prazo é acumulado pelos prazos das etapas, a partir de hoje.
  - O responsável é, entre os responsáveis da etapa, o que tem **menor carga em pontos**, contando também as etapas já distribuídas no mesmo lote.
  - Cada tarefa nasce com nível 2, quantidade 1, e o "o que fazer" e o "pronto quando" vão na descrição.
- **Geração pelo serviço:** uma tarefa por linha do campo "Etapas padrão" do serviço, com prazo a cada 3 dias e o líder como responsável.
- **Ficha do projeto:**
  - Mostra criticidade, prazo, status, helpdesk, progresso, descrição e a lista de etapas (tarefas), com "+ Etapa".
  - Botões: "Aplicar fluxo padrão" (se não usa o fluxo; com as opções "manter e adicionar" ou "substituir as abertas"), "Concluir projeto"/"Reabrir projeto" e Editar.
- **Excluir projeto** remove também as etapas abertas.
- **Projeto criado com etapas** gera a mensagem "abriu o projeto…" no chat.

#### 4.3.6 Prova de aprovação do cliente (`approvalForm`)

- **Quando aparece:** ao marcar uma tarefa como Aprovado (ou concluir a etapa de aprovação) e ao marcar um criativo como Aprovado, sempre que houver cliente.
- **Campos:**
  - Quem aprovou: **obrigatório**; vem preenchido com o decisor da passagem de bastão ou o contato.
  - Canal: WhatsApp, E-mail, Reunião, Ligação, Helpdesk ou Pessoalmente.
  - Data: **obrigatória**.
  - Link ou print: tem que ser http(s).
  - Observações.
- **O que grava:** `{by, channel, at, link, notes, regBy, regAt, label}`.
- **Onde aparece:** no detalhe da tarefa ou do criativo e na ficha do cliente, em "Aprovações registradas".

#### 4.3.7 Aba Capacidade (`vCapacidade`) — tela `06`

- **Pontos** = nível da tarefa (1 a 3; mínimo 1). A capacidade padrão é **15 pontos por semana** por pessoa (`members.capacity`).
- **Esta semana** (segunda a domingo): tarefas abertas da pessoa com prazo até o domingo, mais as atrasadas e as sem prazo.
- **Próxima semana:** tarefas com prazo entre o domingo atual e o seguinte.
- **Cor da barra:** vermelha se carga > capacidade; amarela se ≥ 80%.
- **KPIs:** carga da equipe (%), quem está acima da capacidade, quem tem folga (< 50%) e o período da semana.
- **Tabela:** esta semana, próxima, pontos atrasados e total de tarefas.
- **Participantes:** entram os integrantes que participam do ranking ou têm tarefa aberta.

### 4.4 Clientes (`vClientes`) — telas `07` a `10`, `27`, `28`

#### 4.4.1 Carteira

- **Filtros:** Clientes ativos, Leads, Perdidos e ex-clientes, Todos, e busca por nome, contato ou segmento.
- **Ordem:** pior saúde primeiro.
- **Cartão:** logo, nome, etapa, saúde e nota, aviso de contrato (renova em X dias ou vencido), foco de marketing, segmento, valor por mês, responsável (relacionamento se fechado; comercial se lead), projetos em andamento, próxima reunião e motivo da perda.

#### 4.4.2 Cadastro de cliente ou lead (`clientForm`)

**Campos:**
- Nome (**obrigatório**), contato, telefone/WhatsApp, e-mail, segmento (texto livre; é ele que define a família de segmento, ver 5.6), etapa no funil, valor mensal, responsável comercial, origem.
- Se o cliente está fechado, também: responsável pelo relacionamento, início e fim do contrato e data do reajuste.
- Foco atual de marketing, outros objetivos (múltiplos), próximo passo e data, pasta do cliente (link) e link de envio de arquivos para o cliente.

**Regras:**
- O foco principal entra automaticamente na lista de objetivos.
- Cada mudança de foco ou objetivos gera uma entrada em `objHistory` (últimas 20), exibida como "Evolução dos objetivos".
- Escolher **Fechado** no formulário não fecha direto: abre a **passagem de bastão** (4.6.3). Escolher **Perdido** abre o **registro de perda** (4.6.4).
- **Lead novo entra automaticamente na cadência** D+1, D+3, D+7, D+15 (4.6.2).
- **Excluir cliente** cancela a cadência pendente. As tarefas, follow-ups e outros dados ligados **não** são excluídos [V]; ficam órfãos [I].

#### 4.4.3 Ficha do cliente (`clientDetail`) — tela `27`

Seções, na ordem:

1. **Cabeçalho:** logo (trocar ou remover; a imagem é ajustada para 320×320 PNG), nome, contato e telefone.
2. **Etiquetas:** etapa ("ex-cliente" se cancelou), valor, responsável, origem e motivo da perda.
3. **Etapa no funil:** seletor, "Avançar → próxima etapa" (até Negociação) e "Fechou negócio ✓".
4. **Próximo passo.**
5. **Cadência comercial** (leads): etiquetas D+n com estado, e "Registrar contato" ou "Iniciar cadência".
6. **Saúde da conta:** nota, motivos e satisfação de 1 a 5 (clicar no mesmo valor apaga).
7. **Contrato:** valor, início, fim, reajuste, alerta de renovação ≤ 60 dias e passagem de bastão (ver ou registrar).
8. **Resultados do cliente:** último mês × anterior (4.4.6).
9. **Onboarding:** barra de progresso e botão para abrir.
10. **Arquivos do cliente:**
    - Abrir a pasta.
    - Copiar a mensagem com o link de envio. O texto pronto pede os arquivos originais e não pelo WhatsApp.
    - "Material recebido": grava `lastReceived`, avisa no chat e abre uma tarefa pré-preenchida.
11. **Necessidade de marketing agora:** chips de objetivos (liga e desliga) e histórico.
12. **Observações:** texto com data e autor; pode excluir.
13. **Projetos**, com "+ Projeto para este cliente".
14. **Aprovações registradas.**
15. **Criativos:** miniaturas.
16. **Reuniões**, com "+ Reunião com este cliente".
17. **Campanhas em datas comemorativas:** lista, até 4 datas futuras sugeridas pelo segmento e "Ver calendário deste cliente".
18. **Relacionamento:** último contato, próximo follow e atalhos.
19. **Carimbo** de criação e alteração.

#### 4.4.4 Relacionamento (aba) e follow-ups — telas `08`, `32`

- **KPIs:** follow-ups atrasados (e quantos para fazer agora), aguardando o cliente, renovações e reajustes em 60 dias, clientes sem contato há 30+ dias.
- **Blocos:**
  - Follow-ups pendentes, com "Só os meus" e "+ Follow-up".
  - Aguardando o cliente (lista de cobrança).
  - Renovações e reajustes.
  - "Resultados de [mês anterior] para registrar".
  - Carteira de relacionamento: tabela do contato mais antigo ao mais recente, com último contato, próximo follow, satisfação e responsável.

**Follow-up:**
- **Tipos:** Follow-up estratégico, Resultado da entrega, Relacionamento, Pós-venda, Renovação, Data especial do cliente. Os de "Cadência comercial" são tratados no Comercial.
- **Campos:** cliente (**obrigatório**), tipo, fazer a partir de (**obrigatório**), fazer até, quem faz, segunda pessoa (opcional) e objetivo do contato.
- **Janela:** "atrasado" se hoje > fazer até; "fazer agora" se a janela já começou; senão "agendado".
- **Follow-up automático de resultado** (`ensureFollow`):
  - Quando: ao **concluir um projeto** com cliente e ao **publicar um criativo** com cliente.
  - O que cria: um follow-up "Resultado da entrega" com janela de **hoje+7 a hoje+15**, para o responsável pelo relacionamento.
  - Não duplica para a mesma origem e não cria para clientes perdidos. Avisa no chat.
- **"+ Follow-up"** (`newFollowModal`), num só passo:
  - Cria o follow-up e prepara o **convite para a videochamada**, com link de agendamento e mensagem editável.
  - Botões: "Criar e enviar por WhatsApp", "e-mail", "copiar", "Criar e registrar a reunião" e "Só agendar o follow-up".

**Atendimento do follow-up** (`inviteModal`), em 3 passos:

1. **Convidar para a videochamada:**
   - Quem conduz e o link de agendamento. O link vem do perfil da pessoa (Cal.com ou página de agendamento do Google Agenda) e é salvo no perfil se estava vazio.
   - Mensagem padrão: "Olá, [nome]! Aqui é [pessoa], da Agência Terceiro Andar. Queremos marcar uma conversa rápida por vídeo, de uns 20 minutos…".
   - Envio por WhatsApp (`wa.me/55…`), por e-mail (`mailto:`) ou copiando.
   - Validações: a mensagem precisa conter um link; o WhatsApp exige telefone; o e-mail exige e-mail.
   - Cada envio é registrado em `invites` (últimos 10).
2. **O cliente escolheu o horário?**
   - "Registrar reunião" (`devForm`): data e hora, quem conduz, link da videochamada (http(s)) e pauta.
   - Cria a reunião "Devolutiva e acompanhamento" ligada ao follow-up e avisa no chat.
   - Depois abre a **confirmação**: mensagem com dia, hora, link e um link "salvar no Google Agenda" (evento de 30 minutos), enviada por WhatsApp ou e-mail.
3. **Depois da conversa: Registrar** (`followDo`):
   - Campos: como foi o contato (WhatsApp, Ligação, Reunião, E-mail, Visita, Mensagem no Instagram), resultado ("A entrega surtiu efeito?": Ótimo, Bom, Neutro, Abaixo do esperado, Ainda sem dados), satisfação de 1 a 5, o que o cliente disse, como está o negócio, momento de vida, oportunidade identificada e próximo follow-up (7, 15, 30 ou 60 dias, ou não agendar).
   - Ao salvar:
     - O follow-up vira "Feito" (data e autor).
     - Atualiza a **satisfação** do cliente e a ficha de relacionamento (`rel.business` e `rel.life`, com data).
     - Cria o próximo follow-up. O estratégico mantém o tipo e o objetivo; os outros viram "Relacionamento". A janela vai de hoje+N a hoje+N+5.
     - Avisa no chat.

**Ficha de relacionamento e linha do tempo** (`clientTimeline`):
- **Campos editáveis**, salvos ao sair do campo: aniversário do contato, família e pessoas importantes, hobbies e interesses, como prefere ser atendido, como está o negócio, momento de vida.
- **Linha do tempo:** follow-ups feitos, observações, reuniões passadas, projetos entregues, criativos publicados, campanhas e a data de fechamento.

#### 4.4.5 Onboarding — tela `09`

- **Quem aparece:** clientes fechados ou com onboarding iniciado (não perdidos), com progresso, serviços e pendências do cliente.
- **Início:** o onboarding começa sozinho na passagem de bastão, ou com o botão "Iniciar".
- **Checklist de 12 itens**, separados por responsável (ver `referencia/catalogos/onboarding-checklist-e-diagnostico.json`):
  - **Agência:** contrato assinado, kickoff, grupo de comunicação, cadastro no helpdesk, diagnóstico preenchido, catálogo do 1º mês.
  - **Cliente:** 1ª mensalidade, acesso às redes, acesso ao gerenciador de anúncios, logo e manual, fotos e vídeos, acesso ao site e domínio.
  - Cada item guarda feito/não feito e a data.
- **Itens do cliente pendentes** entram na lista "Aguardando o cliente" desde a data de início.
- **Serviços contratados ou de interesse:** chips, com o botão "Criar um projeto no fluxo para cada serviço" (cria 1 projeto por serviço que ainda não tem projeto aberto, com as etapas do fluxo).
- **Diagnóstico:** 9 perguntas abertas, salvas ao sair do campo.
- **Atalhos:** ficha do cliente, apresentação completa, só os serviços.

#### 4.4.6 Resultados mensais (`resultForm`)

- **Campos:** mês de referência (**obrigatório**; padrão o mês anterior), leads gerados, conversas iniciadas, alcance, novos seguidores, investimento em mídia (R$), vendas, faturamento informado (R$) e leitura do mês.
- **Gravação:** 1 documento por cliente e mês (`results/<cliente>__<AAAA-MM>`). Escolher um mês já registrado corrige esse mês.
- **CPL** = investimento ÷ leads (só se ambos > 0).
- **Comparação na ficha:** variação % em relação ao mês anterior, verde para melhora (no CPL, a melhora é queda).
- **Histórico:** tabela de todos os meses.
- **Pendência:** cliente fechado antes do mês atual sem resultado do mês anterior entra em "Resultados para registrar".
- Avisa no chat.

#### 4.4.7 Histórico de contatos — tela `10`

Lista de follow-ups feitos (exceto os de cadência), filtrável por cliente.

### 4.5 Estratégia (`vEstrategia`) — telas `11`, `30`

**Lista:**
- Busca por nome, razão social, contato, segmento, e-mail, endereço ou CNPJ (a partir de 3 dígitos).
- KPIs: follows estratégicos atrasados, nos próximos 7 dias, clientes ativos sem follow agendado, atualizações dos últimos 7 dias.
- Filtro Clientes ativos / Todos.
- Botão admin **"Agendar follow quinzenal para N clientes"**: cria um follow estratégico entre hoje+14 e hoje+16 para cada cliente ativo sem follow agendado. Responsável = relacionamento; segunda pessoa = estrategista.

**Ficha estratégica:**
- **Dados** (edição só admin, `stDataForm`):
  - Nome, razão social ou nome completo, CNPJ (se preenchido, precisa ter **14 dígitos** e é formatado `00.000.000/0000-00`), segmento, endereço, contato principal, WhatsApp (link `wa.me`), e-mail (link `mailto`) e outros contatos.
  - Serviços do pacote, valor mensal, detalhes do pacote, início e fim do contrato.
  - Responsável pelo relacionamento e responsável pela estratégia (padrão: 1º integrante da área).
- **Perfil do cliente · antes de entrar em contato** (edição só admin, `stProfileForm`):
  - Perfil de comunicação:
    - Analítico: decide com dados.
    - Direto ao ponto.
    - Relacional.
    - Visionário.
    - Cada um traz uma orientação de abordagem.
  - Tom (Formal, Informal, Próximo mas profissional), canal preferido, melhor dia e horário, o que valoriza.
  - **Interesses do público** (separados por vírgula; é o que o Radar usa).
  - Cuidados no contato, exibidos em destaque.
- **Follow-up estratégico (a cada 15 dias):**
  - Mostra o próximo (janela, pessoas, abrir) ou "+ Follow-up estratégico", que já vem com o tipo, as pessoas e o objetivo "Mostrar o efeito da última sequência de postagens…".
  - Mostra o último realizado e os **posts e criativos publicados desde o último**.
- **Entregas para o cliente:** tarefas concluídas, com o total do mês (tarefas e peças, pela quantidade), desde o último follow, as 6 mais recentes e "Ver todas" (agrupadas por mês).
- **Atualizações do relacionamento:**
  - **Todos podem publicar.** Tipos: Atualização, Resultado, Estratégia, Combinado com o cliente, Ponto de atenção, Elogio.
  - Cada atualização guarda autor e data e hora, e avisa no chat.
  - Filtros: Tudo, Atualizações, Follow-ups.
  - A linha do tempo junta atualizações, follow-ups feitos (estratégico, comercial ou outros) e observações.
  - **Só administradores editam (marcado "editado") ou excluem.**

### 4.6 Comercial (`vComercial`) — telas `12` a `15`

#### 4.6.1 Funil

- **Filtro:** responsável (integrantes com leads ou da área Comercial).
- **KPIs:** leads em aberto e potencial, fechados no mês e valor, **conversão em 90 dias** (fechados ÷ (fechados + perdidos)), leads sem cadência ("Iniciar para todos").
- **Kanban:** colunas Prospecção, Primeiro contato, Diagnóstico, Proposta enviada e Negociação, mais "Fechados no mês".
- **Cartão do lead:** cor pela cadência, segmento, valor, responsável, origem, próximo contato e dias na etapa. Tem seletor de etapa e o botão "Registrar contato" ou "Iniciar cadência".

#### 4.6.2 Cadência comercial

- **Passos:** D+1, D+3, D+7, D+15, criados de uma vez como follow-ups do tipo "Cadência comercial", cada um com janela de 2 dias.
- **Objetivo de cada passo:**
  - D+1: apresentar a agência e entender o momento.
  - D+3: enviar caso ou conteúdo útil.
  - D+7: propor diagnóstico com data.
  - D+15: último toque, perguntando se faz sentido seguir agora ou em outro momento.
- **Registro do contato** (`cadenceDo`): canal, resultado (Respondeu e avançou; Respondeu, pediu para retornar depois; Sem resposta; Não tem interesse), mover o lead para outra etapa (exceto Fechado), "retornar em" (data) e o que aconteceu.
- **Regras ao registrar:**
  - "Respondeu e avançou", "Não tem interesse" ou retorno pedido **encerram a cadência**: os passos pendentes são excluídos.
  - Retorno pedido cria o passo "R" (retorno) na data informada.
  - Grava `lastTouch` e uma observação no cliente com canal, resultado e texto.
  - "Não tem interesse" sem etapa escolhida move o lead para **Perdido**, com motivo "Sem interesse".
- **Aba Cadência:** KPIs (atrasados, para hoje, contatos feitos no mês e % de resposta, leads sem cadência), grupos Atrasados, Para hoje, Próximos 7 dias e Mais adiante, e a explicação dos passos.

#### 4.6.3 Passagem de bastão (`handoffForm`), quando um lead fecha

**Campos:**
- Serviços contratados: ≥ 1 obrigatório.
- Valor mensal: **obrigatório**.
- Quem assume o relacionamento: **obrigatório**; padrão o 1º integrante de Relacionamento.
- Início do contrato: **obrigatório**; padrão hoje.
- Fim do contrato: padrão início + 365 dias.
- Data do reajuste: padrão o fim.
- Foco de marketing.
- Quem decide e aprova: **obrigatório**.
- Canal preferido.
- O que o cliente espera nos primeiros 90 dias: **obrigatório**.
- O que foi combinado na venda.
- Perfil e pontos de atenção.

**Ao salvar:**
- Etapa vira Fechado, com `closedAt` e início do onboarding.
- Grava `handoff` com a data, quem registrou e o vendedor.
- Grava os serviços no onboarding e **cancela a cadência**.
- Cria a **tarefa "Kickoff com [cliente]"** para quem assume: tipo Reunião, nível 2, prazo hoje+2, com todo o resumo da venda na descrição.
- Mensagem no chat "🎉 [cliente] fechou negócio com [vendedor]. Passagem de bastão para [pessoa]: kickoff em até 2 dias."

#### 4.6.4 Perda e cancelamento (`lossForm`)

- **Lead perdido:** motivo **obrigatório** (Preço, Sem retorno do contato, Escolheu outra agência, Momento / sem verba agora, Não era o perfil, Vai fazer internamente, Outro) e detalhes. Grava `lostAt`.
- **Cliente ativo que cancela:** motivo **obrigatório** (Resultado abaixo do esperado, Preço / corte de custos, Atendimento, Levou para dentro de casa, Fechou ou pausou o negócio, Outro). Grava `churnedAt` e avisa no chat.
- **Nos dois casos:** cancela a cadência.

**Datas de etapa** (`stageFix`):
- Toda mudança de etapa grava `stageAt`.
- Voltar de Perdido apaga `lostAt` e `churnedAt`.
- Sair de Fechado para uma etapa de lead apaga `closedAt` e o início do onboarding, se nenhum item do checklist tiver sido feito.

#### 4.6.5 Conversão (`metricasBody`)

- **Período:** este mês, 30 dias, 90 dias, 12 meses ou desde o início.
- **Tabelas por responsável e por origem do lead**, com:
  - Leads novos: `createdAt` no período.
  - Fechados: `closedAt` no período, ainda fechados ou cancelados depois.
  - Perdidos: `lostAt`.
  - **Conversão** = fechados ÷ (fechados + perdidos).
  - Receita fechada: Σ valor.
  - Ticket médio.
  - Tempo médio até fechar: dias entre `createdAt` e `closedAt`.
  - Por responsável, também: contatos de cadência feitos e taxa de resposta (resultados que começam com "Respondeu").
- **Listas:** motivos de perda de leads e motivos de cancelamento, com contagem.

#### 4.6.6 Apresentar serviços — tela `15`

Grade dos serviços com os botões "▶ Apresentação completa" e "▶ Escolher serviços". Ver 4.12.5.

### 4.7 Planejamento (`vPlanejamento`) — telas `16` a `20`, `31`

Tem 4 abas: **Radar de oportunidades** (padrão), **Catálogo do mês**, **Datas por segmento** e **Calendário e campanhas**.

#### 4.7.1 Radar de oportunidades (`vRadar`)

- **Itens:** acontecimentos que podem virar conteúdo, gravados pela **automação diária** (`fonte-original/automacao/radar-diario.md`) ou manualmente ("+ Oportunidade").
- **Filtros:** período (próximos 15 dias, padrão; 45 dias; tudo, sempre a partir de ontem), tipo (Esporte, Data e feriado, Evento local, Clima, Tendência, Economia e consumo, Notícia) e cliente.
- **Seções:** "Hoje e ontem" e "No radar".
- **Cartão:** dia, dia da semana, mês e hora, "em N dias", tipo, segmentos, título, resumo, "por que importa", ideia de conteúdo, "Combina com: [clientes]" (cada um com "+ Conteúdo"), fonte, **"+ Criar tarefa"** e, para admin, Editar e Arquivar. Arquivar **exclui** o item.
- **Combinação com o cliente** (`radarMatch`): o item combina se:
  - O cliente está em `clientIds`; **ou**
  - O item é para "todos"; **ou**
  - O item é para a família de segmento do cliente; **ou**
  - Algum interesse do público do cliente (`profile.audience`, palavras com mais de 2 letras) aparece no título, resumo, "por que importa" ou tags.
  - Clientes perdidos não entram, e os fechados aparecem primeiro.
- **"+ Criar tarefa"** abre o formulário de tarefa preenchido com:
  - Título "Conteúdo: …" e briefing (ideia, por que importa, contexto, data e hora, fonte).
  - Cliente, se só um combina.
  - Categoria Arte.
  - Prazo 2 dias antes do evento, ou amanhã se já estiver perto.
  - Urgente se faltam ≤ 2 dias.
  - Solicitante "Radar de oportunidades".
  - O gestor escolhe o responsável.
- **Formulário manual:** o que vai acontecer (**obrigatório**), tipo, quando (**obrigatório**), horário, resumo, por que importa, ideia, segmentos ("Todos" ou famílias), clientes específicos e link da fonte (http(s)). O item manual fica marcado "adicionado pela equipe" e avisa no chat.
- **Recomendações por segmento · 45 dias** (`vRec45`):
  - Um cartão por família de segmento, primeiro as que têm clientes, com filtro por família.
  - Junta itens do radar da família ou "todos", datas do calendário relevantes para a família (★, por palavra-chave) e datas comerciais e feriados com a 1ª ideia do roteiro da família.
  - Ações: Sugerir conteúdo, Fonte, **+ Criar tarefa**, "+ Conteúdo para… [cliente]".

#### 4.7.2 Catálogo do mês (`vCatalogo` + `monthDates`)

- **Seleção:** cliente (ativos primeiro; leads em grupo separado) e mês (‹ ›).
- **Datas do mês para o cliente:** relevantes para o segmento, comerciais, personalizadas ou com campanha. As demais ficam em "Ver as outras". Cada data tem "Sugerir" e "+ Campanha".
- **Tabela:** data, formato, tema/pauta, canal, objetivo, responsável e status. Clicar no status avança Planejado → Em produção → Aprovado → Publicado → Planejado.
- **Contagem por status.** Quando o mês está vazio e o anterior tem itens: "Copiar mês anterior" (copia como Planejado, no mesmo dia do mês, limitado ao último dia).
- **Formulário:** data de publicação (**obrigatório**), formato (**obrigatório**; 11 formatos), tema (**obrigatório**), canal (9), objetivo, responsável, status e legenda ou roteiro.
- **Armazenamento:** 1 documento por cliente e mês com a lista de itens.

#### 4.7.3 Datas por segmento (`segDates`)

- **Conteúdo:** as datas dos próximos 12 meses para uma família de segmento (chips) ou para um cliente específico.
- **Marcação:** ★ para as datas do segmento, junto com as comerciais, feriados e personalizadas, agrupadas por mês, com "Sugerir".

#### 4.7.4 Calendário e campanhas (`vDatas`)

**Calendário:**
- Anos 2026, 2027 e 2028 (**limite fixo no código**).
- Seis próximas datas comerciais, com "preparar até" = data − 30 dias.
- Filtros por categoria (Datas comerciais, Feriados nacionais, Dias das profissões, Saúde e meio ambiente, Cultura e estilo de vida, Meses temáticos, Datas personalizadas), por cliente e "Só as que fazem sentido para [cliente]", e busca.
- Atalhos por mês e, por data, "Sugerir conteúdo" e "+ Campanha".

**Catálogo de datas:** 85 datas fixas ou calculadas (Páscoa, Carnaval, Dia das Mães, Dia dos Pais, Black Friday etc.) em `referencia/catalogos/datas-comemorativas.json`, mais as datas personalizadas da agência (nome, data, cliente opcional, ideia).

**Aba Campanhas do ano:** tabela com data, campanha, cliente, status, responsável e "preparar a partir de".

**Campanha** (`campaignForm`):
- **Campos:** data comemorativa (se não veio pré-definida), clientes (múltiplos; **cria uma campanha por cliente**; ★ nos relevantes), nome (**obrigatório**), objetivo, status (Ideia, Planejando, Em produção, Aprovada, No ar, Encerrada), responsável, começar a preparar em (padrão data − 30), canais, formatos, oferta ou mensagem principal e briefing.
- Na criação, também: "Adicionar ao catálogo" (cria item Planejado na data) e "Criar projeto com etapas".
- **Projeto da campanha:** 4 etapas ligadas ao fluxo:
  - Briefing e ideia aprovados (preparo + 5).
  - Peças produzidas (data − 10).
  - Aprovação do cliente (data − 5).
  - Campanha no ar (na data).
  - Criticidade alta se faltam ≤ 30 dias.
- **Ficha da campanha:** status em chips (No ar e Aprovada avisam no chat), objetivo, responsável, preparo, canais, formatos, mensagem, briefing, e ligações (abrir ou criar projeto, ver ou adicionar no catálogo, criativos do cliente).

#### 4.7.5 Sugestões de conteúdo (`suggestModal`) — tela `31`

- **Seleção:** empresa e tipo de empresa (detectado pelo segmento ou escolhido manualmente).
- **Parte por regras, sem IA** (`playbook`):
  - **Estratégia de venda**, conforme a categoria da data: comercial, profissão, saúde ou mês temático, feriado, cultura.
  - Oferta sugerida, "prova que converte" e aviso regulatório da família (ex.: saúde).
  - **3 a 5 ideias**, cada uma com formato, etapa do funil (Atração, Consideração, Conversão), título, gancho, estrutura e chamada.
  - **Cronograma da campanha:** comercial = 21, 14 e 7 dias antes, no dia e depois; mês temático = semanas 1 a 4; outras = 7 dias antes, no dia, 1 a 2 dias depois.
- **Botões de cada ideia:** **"+ Criar tarefa"** e "Usar em campanha" (abre a campanha com nome, formato, oferta e briefing preenchidos).
- **"Sob medida com IA"** (ver 6.2):
  - Gera de 5 a 6 ideias e um cronograma específicos para o cliente.
  - O resultado fica salvo para toda a equipe (`suggestions/<cliente>__<data>`), com quem gerou e quando.
  - Há "Gerar de novo" e "Parar" durante a geração.
- **Rodapé:** "+ Criar campanha".

### 4.8 Criativos (`vCriativos`) — tela `21`

- **Biblioteca:**
  - Galeria com miniatura (imagem, vídeo, PDF ou link), nome, cliente ("Agência" se interno), formato, status e autor.
  - Filtros: cliente (ou Agência/interno), formato, quem criou ("Meus criativos"), status e busca (nome, campanha, observações, cliente).
  - Ordem: mais recentes primeiro.
  - Mostra "N em aprovação" e um atalho para a pasta do cliente filtrado.
- **Envio de arquivos:** arrastar e soltar ou "Enviar arquivos" (vários).
  - **Aceita PNG, JPG, GIF, WEBP, SVG, MP4, WEBM e PDF até 20 MB.**
  - Arquivos fora disso são recusados com aviso.
  - Envio de vários: um criativo por arquivo, com o nome do arquivo.
- **Por link:** "+ Adicionar link" (Drive, Canva, Figma, WeTransfer…), que precisa ser http(s).
- **Campos:** nome (**obrigatório** no envio de um arquivo só), cliente, formato, status (Em criação, Em aprovação, Ajustes solicitados, Aprovado, Publicado), quem criou, campanha ou projeto, mês de uso e observações.
- **Status:**
  - Aprovado com cliente exige a prova de aprovação.
  - Publicado com cliente cria o follow-up de resultado.
  - Ajustes, Aprovado, Publicado e Em aprovação avisam no chat (o ajuste menciona o autor).
  - Cada mudança grava `statusAt`.
- **Detalhe:** pré-visualização (vídeo com controles), tamanho, status, aprovação, observações, abrir, copiar link, editar e excluir.
- **Exclusão do arquivo:** só quem enviou ou um editor consegue (regra da plataforma: erro `not_uploader`).

### 4.9 Agenda (`vAgenda`) — tela `22`

- **Organização:** abas Externa · clientes e Interna · equipe, com contagem das futuras; Agendadas, agrupadas em Hoje, Amanhã, Próximos 7 dias, Mais adiante e Sem data; Realizadas.
- **Destaques:** "Só as que eu participo" e o aviso de compromissos nas próximas 48 horas.
- **Reunião com cliente** (`meetingForm`):
  - Campos: assunto (se vazio, usa o tipo), cliente (**obrigatório**), tipo (Prospecção, Diagnóstico, Apresentação de proposta, Onboarding/kickoff, Alinhamento de projeto, Aprovação de conteúdo, Resultados do mês, Captação/gravação, Devolutiva e acompanhamento), data e hora (**obrigatório**), criticidade, local ou link, participantes da equipe e pauta e anotações.
- **Reunião interna:** sem cliente. Tipos: Reunião de equipe, Treinamento, Alinhamento de projeto, Planejamento do mês, Brainstorm criativo, Conversa individual (1:1), Revisão de resultados. Vem com toda a equipe marcada.
- **Integração:** as reuniões alimentam o Meu dia, o "último contato" do cliente (reuniões passadas) e a ficha do cliente.
- **Não há integração com Google Agenda ou Outlook** [V]: só o link "salvar no Google Agenda" da confirmação.

### 4.10 Equipe (`vEquipe`) — telas `23` a `26`

- **Pessoas:**
  - Contagem por área, com alerta se Estratégia estiver vazia.
  - Cartão por integrante: foto, nome, Admin, função, área, etapas do fluxo em que é responsável, **capacidade da semana**, vínculo de acesso e Editar/Remover.
  - Também traz o texto "Como funciona o acesso".
- **Cadastro de integrante** (admin):
  - Perfil de acesso (Equipe / Administrador).
  - Ranking (participa / não participa).
  - Capacidade semanal em pontos (padrão 15).
  - Nome (**obrigatório**), área (Relacionamento, Estratégia, Audiovisual, Design, Social media, Tráfego pago, Copywriting, Comercial, Desenvolvimento interno, Gestão), função e e-mail.
  - Novo integrante recebe uma cor de avatar.
- **Remover integrante:** confirmação. As tarefas abertas dele ficam "Sem responsável".
- **Perfil** (próprio ou admin):
  - Foto: recortada em quadrado 480 px JPEG.
  - Nome, função, WhatsApp, e-mail, **link de agendamento** (Cal.com ou Google; usado nos convites), link fixo de videochamada, especialidades (separadas por vírgula) e "sobre você".
  - A visualização mostra as etapas do fluxo, os números do momento, os links e o contato.
- **Fluxo:** a faixa do fluxo padrão (edição em Produção › Fluxo).
- **Serviços** (admin):
  - Lista e edição dos serviços: nome (**obrigatório**), frase de impacto, o que é, por que (um por linha), para quem, o que entregamos, como medimos, quando aparecem os resultados, perguntas para o cliente e etapas padrão do projeto.
  - 5 serviços padrão em `referencia/catalogos/servicos-padrao.json`.
- **Objetivos de marketing** (admin): renomear (salva ao sair), remover (dois cliques), adicionar e "Carregar lista padrão" (14 objetivos).

### 4.11 Chat da equipe (flutuante)

- **Canal único:** "Geral".
- **Funcionamento:**
  - Enter envia; Shift + Enter quebra a linha.
  - Limite de **4.000 caracteres**.
  - Menções @primeiro-nome e @todos ou @equipe ficam destacadas, e as mensagens para mim recebem destaque.
  - Links viram clicáveis.
  - Mensagens seguidas do mesmo autor em até 5 minutos são agrupadas.
  - Separadores de dia: Hoje, Ontem e data.
- **Histórico:** carrega os últimos 14 dias; "Mensagens mais antigas" estende até 180.
- **Indicadores:** contagem de não lidas no botão (a leitura fica guardada **no navegador**) e aviso (toast) de mensagem nova quando o chat está fechado.
- **Apagar:** só o autor vê o botão de apagar a própria mensagem, com dois cliques. O banco, porém, não impede outra pessoa de gravar no documento.
- **Requisito:** é preciso ter conta vinculada para escrever.
- **Mensagens automáticas** (`sysPost`): ficam no canal Geral com o autor = quem fez a ação e trazem um botão que abre o registro. São 24 eventos:
  - Tarefa criada para outra pessoa.
  - Status de tarefa: aprovação, aprovada, concluída, espera, aguardando cliente.
  - Etapa de projeto concluída e próxima.
  - Projeto aberto.
  - Follow-up agendado, remarcado, automático ou feito.
  - Reunião de devolutiva marcada.
  - Cliente fechou (com passagem de bastão).
  - Contrato encerrado.
  - Material recebido.
  - Criativos enviados.
  - Status de criativo e aprovação.
  - Campanha no ar ou aprovada.
  - Resultados do mês registrados.
  - Atualização estratégica.
  - Item adicionado ao radar.

### 4.12 Recursos transversais

#### 4.12.1 Carimbo de autoria
Todo registro gravado guarda `createdBy`, `updatedBy` e `updatedAt`. As fichas mostram "Criado por X · Última alteração por Y em [data]". Os nomes vêm da plataforma (`USER.profiles`) ou do cadastro.

#### 4.12.2 Lista "Aguardando o cliente" (`waiting`)
Junta as tarefas em "Aguardando cliente" (desde `waitingSince`, com o que falta) e os itens do checklist de onboarding de responsabilidade do cliente (desde o início do onboarding; ignora perdidos). A cor muda pela antiguidade: > 7 dias crítico, > 3 dias alto.

#### 4.12.3 Ranking de entregas (`rankPanel`)
- **Pontuação:** soma da **quantidade** das tarefas concluídas no mês (ou desde o início), por responsável.
- **Desempate:** concluídas no prazo, depois nome.
- **Exibição:** coroa para o 1º lugar, "N tarefas · X% no prazo".
- **Quem fica de fora:** integrantes com "não participa do ranking".

#### 4.12.4 Em execução agora (só admin)
Tarefas "Em execução", com há quanto tempo, e a lista de quem está sem tarefa em execução (com quantas abertas tem).

#### 4.12.5 Apresentações em slides
- **Tipos:**
  - Por serviço: capa, o que é, até 5 motivos, para quem e o que recebe, métricas e prazo de resultado, etapas, próximos passos.
  - Completa da agência: capa, quem somos (equipe com fotos, por área), fluxo de trabalho, soluções, 2 slides por solução, acompanhamento, próximos passos.
- **Opções:** escolher os serviços e personalizar com o nome do cliente na capa.
- **Navegação:** ‹ › e tela cheia; rodapé com logo, rótulo e N/total.
- Tudo é gerado no navegador.

---

## 5. Regras de negócio e cálculos (consolidado)

### 5.1 Saúde da conta (`health`, só clientes Fechados)

A nota começa em **100**, com descontos (mínimo 0, máximo 100):

| Condição | Desconto |
|---|---|
| Tarefas do cliente atrasadas (exceto aguardando cliente) | −15 cada, máximo −45 |
| Tarefas aguardando o cliente há mais de 5 dias | −10 cada, máximo −30 |
| Último contato (follow-up feito ou reunião passada; sem nenhum, desde o fechamento ou o cadastro) > 60 dias | −25 |
| … > 30 dias (e ≤ 60) | −15 |
| Satisfação 1 / 2 / 3 / 4 | −40 / −30 / −15 / −5 |
| Fechado há mais de 30 dias com onboarding incompleto | −10 |
| Contrato vence em ≤ 30 dias (ou já venceu) | −10 |
| Fechado há mais de 45 dias sem resultado registrado nos últimos 2 meses | −5 |

**Faixas:** ≥ 75 **Saudável**; ≥ 50 **Atenção**; < 50 **Em risco**. Cada desconto aparece como motivo.

### 5.2 Responsáveis padrão

- **Relacionamento do cliente** (`relOwner`):
  1. `relId` definido.
  2. Se Fechado, o 1º integrante da área Relacionamento.
  3. O responsável comercial.
- **Estratégia** (`strategistOf`): `strategistId` ou o 1º integrante da área Estratégia.
- **Etapa do fluxo:** quem tem menor carga entre os responsáveis da etapa.

### 5.3 Prazos automáticos

| Situação | Prazo |
|---|---|
| Nova tarefa | hoje + 3 dias |
| Kickoff após fechar | hoje + 2 |
| Etapas do fluxo | acumulado pelo prazo de cada etapa a partir de hoje |
| Etapas do serviço | a cada 3 dias |
| Follow-up de resultado | janela hoje+7 a hoje+15 |
| Follow estratégico em massa | hoje+14 a hoje+16 |
| Novo follow manual | hoje a hoje+3 |
| Cadência | D+1, D+3, D+7, D+15 (janela de 2 dias) |
| Campanha: começar a preparar | data − 30 |
| Contrato | fim = início + 365; reajuste = fim |
| Tarefa criada do radar | evento − 2 dias (ou amanhã) |
| Tarefa criada de data ou sugestão | data − 3 dias (ou amanhã) |

### 5.4 Indicadores comerciais
Ver 4.6.5. **Lead** = qualquer cliente que não está Fechado nem Perdido. As etapas do funil são Prospecção, Primeiro contato, Diagnóstico, Proposta enviada, Negociação, Fechado e Perdido.

### 5.5 Capacidade
Ver 4.3.7. A semana vai de segunda a domingo, com fim no domingo seguinte a hoje.

### 5.6 Família de segmento (`famOf`)
- **Como detecta:** procura palavras-chave no texto " segmento + nome " (minúsculas, com espaços nas pontas), seguindo a ordem de prioridade: odonto, farmácia, trânsito, pet, estética, fitness, mercado, food, moda, imob, educação, saúde, logística, auto, varejo, serviços. Sem correspondência, cai em **geral**.
- **Para que serve:** escolher o roteiro de sugestões, recomendar datas e combinar com o radar.
- **Correção recente:** "pet" sozinho deixou de ser palavra-chave, para "Petiscaria" não cair em Pet.
- Catálogo completo em `referencia/catalogos/familias-de-segmento.json`.

### 5.7 Datas relevantes para um cliente (`relevantTo`)
A data é relevante quando é personalizada desse cliente ou quando alguma palavra-chave da data aparece no segmento ou nome do cliente.

---

## 6. Automações e integrações

| # | Automação | Onde roda hoje | Dependência |
|---|---|---|---|
| 6.1 | Radar diário às 06h50 (pesquisa na web, grava 3 a 12 itens, apaga itens com mais de 30 dias) | Tarefa agendada no Claude | Claude (agente + busca web) |
| 6.2 | Sugestões "sob medida" com IA | Navegador, via `window.claude.use('sample')` (`json(prompt,{onText,signal})`, com streaming) | Claude (modelo da plataforma); exige permissão do usuário |
| 6.3 | Mensagens automáticas no chat | Navegador, no momento da ação | Banco |
| 6.4 | Follow-ups automáticos (resultado, próximo follow, cadência, kickoff) | Navegador, no momento da ação | Banco |
| 6.5 | Vínculo de conta por e-mail | Navegador | Identidade do Claude |
| 6.6 | Atualização periódica da tela (60 s) e sincronização em tempo real | Navegador + `onSnapshot` | Banco da plataforma |
| 6.7 | Convites e confirmações por WhatsApp e e-mail | Navegador abre `wa.me` / `mailto:` | Nenhuma API: o envio é manual pelo app da pessoa |
| 6.8 | Link "salvar no Google Agenda" | URL `calendar.google.com/calendar/render?action=TEMPLATE…` | Nenhuma API |

**Contexto enviado para a IA** [V]: nome, segmento e família, foco e objetivos, serviços contratados, respostas do diagnóstico (até 400 caracteres cada), últimas 6 observações (até 300 caracteres cada), a data (nome, dia, categoria, dias até a data, dica) e o aviso regulatório. O **prompt integral** está em `crm.html`, função `runAI` (por volta da linha 1751), e deve ser migrado para o back-end.

---

## 7. Estado das funcionalidades

| Funcionalidade | Estado | Observação |
|---|---|---|
| Todas as telas e fluxos descritos na seção 4 | **Concluída no protótipo** [V] | Testadas em navegador com dados de demonstração; uso real pela equipe ainda pequeno (banco com poucos dados, ver INVENTARIO §5) |
| Sugestões por regras (`playbook`) | **Simulada / heurística** | Textos-modelo preenchidos por família e categoria de data; não é análise real do cliente |
| Sugestões com IA | Concluída, **dependente do Claude** | Não funciona fora do Claude |
| Radar diário | Concluído, **fora do código** | Depende da tarefa agendada no Claude |
| Envio de WhatsApp e e-mail | **Parcial** | Só abre o app com o texto pronto; não envia nem confirma entrega |
| Agendamento (Cal.com / Google) | **Parcial** | Só usa o link público; não lê os horários marcados, e o registro da reunião é manual |
| Integração com helpdesk | **Não implementada** | Só guarda número ou link do chamado |
| Integração com Meta Ads / Google Ads / Instagram (resultados) | **Não implementada** | Resultados mensais digitados à mão |
| Notificações (push / e-mail) | **Não implementada** | Só avisos no chat interno e toasts na tela |
| Relatórios exportáveis (PDF / planilha) | **Não implementado** | — |
| Datas para além de 2028 | **Não implementado** | Anos fixos 2026 a 2028 |
| Multicanal no chat | Estrutura existe, **só "Geral" ativo** | Há código para um canal "avisos" (só admin publica), mas ele não está na lista |
| Telas antigas (Tarefas, Projetos por marcos, Processos, Follow-up, Onboarding, Catálogo, Datas e Chat como página) | **Legado** | Continuam no código, mas o menu redireciona; os "marcos" de projeto (`projects.milestones`) foram substituídos por tarefas |

---

## 8. Comportamentos que ainda precisam ser definidos [C]

1. **Exclusões em cascata:** o que fazer com tarefas, follow-ups, campanhas, resultados e criativos ao excluir um cliente (hoje ficam órfãos), e com as tarefas ao remover um integrante (hoje ficam "Sem responsável").
2. **Permissões reais por perfil:** quais regras de interface (seção 2.3) devem ser obrigatórias no servidor; se a equipe pode editar clientes e leads de outros responsáveis; se qualquer um pode apagar mensagens do chat.
3. **"Arquivar" do radar:** hoje exclui. Decidir entre arquivar de fato ou excluir.
4. **Fuso e "hoje":** todos os cálculos usam a data do computador de quem está usando. Definir o fuso oficial (America/Sao_Paulo).
5. **Semana de capacidade:** confirmar se a semana de segunda a domingo e os 15 pontos padrão continuam.
6. **Faixas e pesos da saúde da conta** (5.1): confirmar com a gestão.
7. **Mais de um responsável por cliente** (comercial, relacionamento, estratégia): manter os 3 papéis?
8. **Lista de clientes da agência:** quais clientes reais serão migrados (o banco atual está sem clientes; ver INVENTARIO §5).
9. **IA:** fornecedor e custo da IA na versão própria; se as sugestões "por regras" continuam.
10. **Radar:** quem cuida da pesquisa diária fora do Claude (automação com IA via API, curadoria manual ou ambos) e quais fontes são aceitas.
11. **Notificações externas** desejadas (e-mail, WhatsApp Business API, push).
12. **LGPD:** quais dados pessoais de contatos (aniversário, família, momento de vida) podem ser guardados, por quanto tempo e com que base legal.
