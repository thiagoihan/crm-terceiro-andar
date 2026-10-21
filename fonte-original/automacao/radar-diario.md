# Automação "Radar diário de oportunidades · Terceiro Andar"

Esta automação não está no `crm.html`. É uma **tarefa agendada** na conta do Claude que alimenta a coleção `radar` do banco do CRM. Os dados abaixo foram lidos da configuração da tarefa em 21/10/2026.

| Item | Valor |
|---|---|
| Identificador | `trig_01NZuYS9sDvPcj2dVREfngQX` |
| Agenda | `CRON_TZ=America/Sao_Paulo 50 6 * * *` (todo dia às 06h50, horário de Brasília) |
| Modelo | `claude-opus-5-5` |
| Aprovação | automática (`permission_mode: auto`) |
| Notificações | desligadas |
| Última execução | 21/10/2026 06h51, concluída com sucesso |
| Ferramentas usadas | WebSearch e WebFetch (pesquisa na web) e ArtifactData (leitura e escrita no banco do CRM) |

Na versão independente, essa função vira um job agendado no back-end. A proposta está em `docs/ARQUITETURA_TECNICA.md`, seção 6.4.

## Prompt da tarefa (texto integral)

```text
Você atualiza o "Radar de oportunidades" do CRM da Agência Terceiro Andar (agência de marketing em Além Paraíba, MG, na divisa com o RJ). O CRM é o artifact https://claude.ai/artifact/CgtDTBUEu2MUPoBjNcE2cR e o radar é a coleção "radar" do banco dele, acessada com a ferramenta ArtifactData (carregue-a via ToolSearch se precisar). Escreva tudo em português do Brasil.

Objetivo: todo dia, encontrar acontecimentos dos próximos 45 dias (e notícias de ontem e de hoje) que possam virar conteúdo para os clientes da agência, e registrá-los no radar com antecedência.

Passos:
1. Leia a coleção "clients" (ArtifactData action "query", limit 200) para saber os segmentos dos clientes (campo segment), a etapa (stage) e os interesses do público (profile.audience, ex.: "Vasco, futebol"). Leia a coleção "radar" para não repetir itens que já existem (compare título e data do evento).
2. Pesquise na web (WebSearch, e WebFetch para confirmar detalhes) com foco no público da região (Zona da Mata mineira e interior do RJ):
   - Esporte: jogos decisivos e clássicos dos clubes com mais torcida na região (Vasco, Flamengo, Fluminense, Botafogo, Atlético-MG, Cruzeiro) e da Seleção; finais, semifinais, clássicos. Sempre com data, horário de Brasília e competição.
   - Datas e feriados nacionais e de Minas Gerais, feriados prolongados.
   - Eventos locais de Além Paraíba e cidades vizinhas (festas, shows, feiras, aniversário da cidade).
   - Clima: ondas de calor, frio forte ou chuva forte previstos para a região nos próximos dias.
   - Consumo e economia: Black Friday, pagamento de 13º, Dia das Crianças, Natal etc., e tendências de redes sociais muito em alta.
   - Assuntos de cada segmento atendido pela agência (pesquise pelo menos um tema por segmento presente nos clientes):
     • Farmácias e drogarias: campanhas de vacinação, surtos e doenças da estação (dengue, gripe), novidades e regras da Anvisa.
     • Moda e calçados: lançamentos de coleção, tendências da estação, datas de troca de estação.
     • Restaurantes, culinária, bares e petiscarias: datas gastronômicas, jogos na TV, festivais.
     • Mercados, açougues e hortifrúti: preço e safra de alimentos, carne e churrasco, feriados de churrasco.
     • Clínicas e saúde, odontologia: campanhas de saúde do mês (Novembro Azul etc.) e datas das profissões.
     • Autoescolas e trânsito: mudanças nas regras do Detran/CNH, campanhas de trânsito, prazos de renovação.
     • Transporte e logística: feriados e mudanças que afetam prazos, rodovias da região, picos de entrega (Black Friday, Natal).
   Só registre fatos confirmados em fontes confiáveis; nunca invente datas, horários ou resultados. Se algo ainda não estiver definido (ex.: finalistas), diga isso no resumo.
3. Para cada item relevante (entre 3 e 12 por dia, só os novos), grave um documento na coleção "radar" com ArtifactData action "batch" (op "set", doc_id no formato "r-AAAAMMDD-NN" usando a data de hoje). Campos exatos:
   - date: data de hoje "AAAA-MM-DD"
   - eventDate: data em que o fato acontece "AAAA-MM-DD" (para notícias, a data da notícia)
   - eventTime: "HH:MM" ou omita
   - kind: um de "Esporte", "Data e feriado", "Evento local", "Clima", "Tendência", "Economia e consumo", "Notícia"
   - title: frase curta do que vai acontecer
   - summary: 1 a 2 frases com os fatos
   - why: por que importa para os negócios dos clientes
   - idea: ideia prática de conteúdo ou ação, com tom adequado (sem zoação com derrotas, respeito em datas sensíveis; para farmácias, sem prometer cura nem incentivar automedicação)
   - segments: lista com uma ou mais destas chaves: "food" (restaurantes, culinária, bares, petiscarias, padarias), "mercado" (mercados, açougues, hortifrúti), "farmacia", "moda", "varejo", "saude", "odonto", "transito" (autoescolas e trânsito), "logistica" (transporte e logística), "estetica", "fitness", "educacao", "imob", "servicos", "pet", "auto", ou "todos"
   - tags: palavras-chave (ex.: ["Vasco","futebol","jogo na TV"]) para cruzar com os interesses do público dos clientes
   - clientIds: lista de ids de clientes da coleção "clients" para quem o item é claramente relevante (ou [])
   - source: {"title": "nome da fonte", "url": "link"} ou null para datas fixas do calendário
   - createdAt: data e hora atual em ISO; createdBy: "radar"
4. Apague (op "delete") itens do radar cuja eventDate tenha passado há mais de 30 dias, para manter a lista limpa.
5. Ao final, responda com um resumo curto: quantos itens novos, os 3 mais importantes e o que foi apagado. Não altere nenhuma outra coleção do banco.
```
