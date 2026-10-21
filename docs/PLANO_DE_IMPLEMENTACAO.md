# Plano de implementação · reconstrução independente

Este plano é uma sugestão de ordem e prioridade. **As estimativas são indicativas [I]**: consideram 2 desenvolvedores full-stack em TypeScript e devem ser revistas pelo time depois de ler o código e a documentação.

---

## 1. Princípios

1. **Paridade primeiro, melhorias depois.** A versão 1 reproduz o que a agência usa hoje (requisitos P1). As novidades (P3) vêm depois da troca.
2. **Regras no servidor desde o primeiro dia.** Portar `proposta/dominio/regras.ts` para `packages/dominio` e usá-lo na API. Os testes desse pacote são a referência de comportamento.
3. **Uma transação por ação de negócio.** Exemplos: fechar negócio, concluir etapa, registrar follow-up.
4. **Comparar com o protótipo.** O protótipo continua disponível para consulta. Para cada tela, comparar com a captura em `referencia/telas/` e com o comportamento descrito em `DOCUMENTACAO_FUNCIONAL.md`.
5. **Não reconstruir o legado:** telas antigas, marcos de projeto e modo local.

---

## 2. Fases

| Fase | Entregas | Requisitos | Estimativa [I] |
|---|---|---|---|
| **0. Fundação** | Monorepo; CI (lint, tipos, testes); docker-compose (PostgreSQL, MinIO); migração inicial a partir de `schema.sql` + `seed_catalogos.sql`; `packages/dominio` com os testes atuais passando; layout base (barra lateral, barra inferior no celular, temas, tokens de cor e fontes do protótipo); componentes genéricos (Modal, FormBuilder com Zod, ConfirmButton, Toast, Tabs, Chips) | RNF-01, 13, 14, 16, 17 | 2 semanas |
| **1. Acesso e equipe** | Login (OIDC + senha), sessão, papéis, guards; vínculo por e-mail; Equipe (pessoas, cadastro, perfil, foto); upload de arquivos (S3); auditoria básica | RF-01 a 06, RNF-02, 09 | 2 semanas |
| **2. Clientes e comercial** | CRUD de clientes e leads; ficha; funil kanban; cadência; passagem de bastão (transação); perda e cancelamento; conversão; onboarding; logo | RF-10 a 22 | 3 semanas |
| **3. Produção** | Tarefas (formulário, status com todas as regras, comentários, histórico); prova de aprovação; projetos com etapas; fluxo padrão e editor; distribuição por carga; capacidade; quadro kanban | RF-40 a 47 | 3 semanas |
| **4. Relacionamento e estratégia** | Follow-ups (todos os tipos, automáticos, janela); convite e confirmação de videochamada; reunião de devolutiva; registro do follow; resultados mensais; área Estratégia (busca, ficha, perfil, follow quinzenal, entregas, atualizações) | RF-30 a 38 | 2,5 semanas |
| **5. Planejamento, criativos e agenda** | Calendário de datas (qualquer ano); campanhas; catálogo mensal; datas por segmento; recomendações em 45 dias; sugestões por regras (portar `playbook()` e textos); radar (lista, manual, combinação, criar tarefa); criativos (galeria, upload, status); agenda | RF-50 a 54, 56, 58, 60 a 62 | 3 semanas |
| **6. Painéis, chat e tempo real** | Meu dia; Painel (KPIs admin e equipe); ranking; "em execução agora"; chat com não lidas sincronizadas; 24 mensagens automáticas; SSE e invalidação | RF-63, 64, 66, 67, RNF-06 | 2 semanas |
| **7. IA, radar automático e apresentações** | Endpoint de IA (mesmo prompt, validação, limite); job do radar às 06h50; apresentações em slides | RF-55, 57, 65 | 1,5 semana |
| **8. Migração, homologação e troca** | Script de importação do export; comparação de números; homologação com a agência; treinamento; virada; protótipo em modo leitura | §5 | 1,5 semana |
| **9. Melhorias** | Notificações, relatórios, integrações de agenda e anúncios, auditoria consultável | RF-80 a 84 | a definir |

**Total até a troca:** cerca de **20 semanas** com 2 pessoas [I]. As fases 2 a 5 podem correr em paralelo depois da fase 1, se houver mais gente.

### 2.1 Ordem de prioridade dentro do P1

Se for preciso entregar em partes:
- **Primeiro:** Comercial + Clientes + Produção. É o fluxo venda → passagem de bastão → kickoff → tarefas.
- **Depois:** Relacionamento e Estratégia.
- **Por último:** Planejamento e Radar.

---

## 3. Itens que dependem de decisão da agência [C]

Resolver antes ou durante a fase indicada:

| Item | Fase | Referência |
|---|---|---|
| Provedor de login (Google Workspace, Microsoft ou senha) | 1 | ARQUITETURA §5 |
| Permissões finas da equipe (editar clientes de outros responsáveis? apagar mensagens?) | 1 | DF §8 item 2 |
| Política de exclusão de cliente e integrante | 2 | DF §8 item 1 |
| Pesos da saúde da conta e capacidade padrão | 2–3 | DF §5.1, §5.5 |
| Provedor e orçamento de IA; manter o radar automático? fontes do radar | 7 | DF §8 itens 9–10 |
| Retenção de dados pessoais (LGPD) | 2 | DF §8 item 12 |
| Hospedagem (provedor, região, orçamento) | 0 | ARQUITETURA §7 |

---

## 4. Plano de testes

### 4.1 Unitários (`packages/dominio`)

- **Já entregues:** 9 grupos em `proposta/dominio/regras.test.ts` (datas, família de segmento, estado de prazo, capacidade, saúde da conta, follow-up e cadência, radar, conversão, utilitários) e o script `paridade-com-prototipo.ts` (595 datas e 30 segmentos comparados com o código original, 0 divergências).
- **A acrescentar:**
  - Portar `playbook()` com testes de "snapshot" comparando com a saída do protótipo para 10 combinações de data e família.
  - Ordenações (Hoje, tarefas, follow-ups).
  - Lista "aguardando o cliente".
  - Renovações.
  - Resultados pendentes.
  - Ranking.

### 4.2 Integração (API + PostgreSQL em contêiner)

| Cenário | Verifica |
|---|---|
| Criar lead | cliente + 4 follow-ups de cadência com as datas certas |
| Registrar contato "Não tem interesse" | cadência removida, lead Perdido, `lost_at`, nota no cliente |
| Passagem de bastão | todas as gravações de RF-13; falha simulada no meio não grava nada |
| Concluir a última etapa | projeto concluído, follow de resultado criado uma única vez (rodar 2×) |
| Duas tarefas "Em execução" | a anterior passa para "Em andamento"; o índice único impede inconsistência |
| Edição concorrente | o segundo `PATCH` com versão antiga recebe 409 |
| Upload | tipo ou tamanho inválido recusado; URL pré-assinada expira |
| Radar job | não duplica título + data; arquiva itens com mais de 30 dias |
| Fuso | uma tarefa com prazo hoje às 23h30 em São Paulo não aparece como atrasada no servidor em UTC |

### 4.3 Permissões

Uma matriz automatizada **papel × rota de gravação**, com owner, admin, member, viewer e responsável × não responsável da tarefa. O resultado esperado vem de DF §2.2–2.4 e ARQUITETURA §5.2. Toda rota nova entra na matriz.

### 4.4 Ponta a ponta (Playwright)

Os fluxos críticos, com dados de demonstração:

1. Login → vínculo por e-mail → abre Meu dia.
2. Novo lead → registrar contatos de cadência → fechar negócio → kickoff aparece no Meu dia do Relacionamento.
3. Projeto pelo fluxo padrão → cada etapa com responsável → concluir etapas até o fim → follow de resultado aparece.
4. Tarefa → "Aguardando cliente" (com o que falta) → aparece em "Aguardando o cliente" → "Aprovado" pede a prova → prova aparece na ficha.
5. "+ Follow-up" → convite por WhatsApp (o link `wa.me` é gerado com o texto) → registrar reunião → confirmação → registrar a conversa → próximo follow criado.
6. Radar → "+ Criar tarefa" → tarefa pré-preenchida para o designer.
7. Sugestões de conteúdo para uma data → "Usar em campanha" → campanha com projeto e item no catálogo.
8. Upload de criativo → "Aprovado" com prova → "Publicado" → follow criado.
9. Chat: mensagem com @nome destaca o destinatário; não lida sincroniza entre duas sessões.
10. Responsivo: os fluxos 1, 2 e 4 em 390 px de largura.

### 4.5 Comparação com o protótipo (migração)

Depois de importar o export, comparar, para cada cliente:
- Saúde (nota e motivos).
- Tarefas abertas e atrasadas.
- Follow-ups pendentes.
- Última data de contato.

E na equipe: carga semanal por pessoa e ranking do mês. **Critério:** 100% iguais, ou diferença explicada por uma decisão registrada (por exemplo, o fuso).

### 4.6 Aceite da agência (homologação)

Uma semana de uso paralelo por 2 a 3 integrantes (Relacionamento, Comercial, Design), com checklist por área baseado na DF §4, e coleta de ajustes antes da virada.

---

## 5. Migração e virada

1. **Congelar estrutura:** a partir da fase 8, nada de mudanças novas no protótipo (só uso).
2. **Ensaio:** exportar o banco do artifact (INVENTARIO §4) → importar em homologação → rodar §4.5 → corrigir o script.
3. **Dia da virada (fora do expediente):**
   - Avisar a equipe.
   - Exportar de novo e importar em produção.
   - Copiar os arquivos (`/_blob/`) para o S3.
   - Conferir as contagens.
   - Liberar o acesso.
4. **Depois:** desligar a tarefa agendada do radar no Claude, para não gravar no banco antigo. O protótipo fica só para consulta por 30 dias.
5. **Plano de volta:** se a versão nova falhar no 1º dia, a equipe volta ao protótipo, que não foi alterado, e os dados do dia são digitados de novo.

---

## 6. Riscos do projeto

| Risco | Mitigação |
|---|---|
| Regra escondida em função sobrescrita passar despercebida | Usar DF + `regras.ts` como referência; testes de comparação (§4.5); conferir sempre a **última** declaração da função no `crm.html` |
| Escopo crescer com melhorias antes da paridade | P3 só depois da virada |
| Custo de IA e busca imprevisível | Limite diário; o radar pode começar com curadoria manual + IA só para o texto |
| Pouca massa de dados real para validar | Usar os dados de demonstração das capturas e cadastrar clientes reais em homologação |
| Equipe da agência acostumada ao protótipo | Manter nomes, cores e disposição das telas; treinamento curto por área |
