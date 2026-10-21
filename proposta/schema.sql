-- =====================================================================
-- CRM Marketing & Processos · Agência Terceiro Andar
-- Esquema PROPOSTO para PostgreSQL 15+ (versão independente do Claude)
--
-- Origem: modelo de documentos do protótipo (crm.html), normalizado.
-- Veja docs/MODELO_DE_DADOS.md para o mapeamento campo a campo.
--
-- Convenções:
--  * Chaves primárias UUID (gen_random_uuid). As tabelas que recebem dados
--    migrados guardam o id antigo em "legacy_id".
--  * Enumerações como TEXT + CHECK, o que facilita migrar para MySQL e
--    ampliar listas sem ALTER TYPE.
--  * Datas sem hora em DATE; instantes em TIMESTAMPTZ (UTC). O "hoje" do
--    negócio é America/Sao_Paulo (ver ARQUITETURA_TECNICA.md).
--  * Exclusão lógica (deleted_at) nas entidades principais.
--  * Colunas de auditoria em todas as tabelas de negócio.
-- =====================================================================

-- gen_random_uuid() é nativo a partir do PostgreSQL 13.
CREATE EXTENSION IF NOT EXISTS citext;     -- e-mail sem diferenciar maiúsculas
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- busca por trecho de texto

-- ---------------------------------------------------------------------
-- 1. Identidade, equipe e acesso
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT NOT NULL UNIQUE,
  name           TEXT   NOT NULL,
  password_hash  TEXT,                       -- nulo quando o login é só por SSO (Google/Microsoft)
  sso_provider   TEXT,
  sso_subject    TEXT,
  role           TEXT   NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sso_provider, sso_subject)
);

CREATE TABLE files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key   TEXT NOT NULL UNIQUE,         -- chave no armazenamento de objetos (S3/R2/MinIO)
  content_type  TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL CHECK (size_bytes >= 0),
  original_name TEXT,
  purpose       TEXT NOT NULL CHECK (purpose IN ('member_photo','client_logo','creative','attachment')),
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id        TEXT UNIQUE,
  user_id          UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,  -- vínculo conta ↔ cadastro (antigo accountId)
  name             TEXT NOT NULL,
  area             TEXT NOT NULL CHECK (area IN ('Relacionamento','Estratégia','Audiovisual','Design','Social media','Tráfego pago','Copywriting','Comercial','Desenvolvimento interno','Gestão')),
  role_title       TEXT,                     -- "Função"
  email            CITEXT,
  phone            TEXT,
  is_admin         BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_ranking  BOOLEAN NOT NULL DEFAULT TRUE,     -- antigo hideRank invertido
  weekly_capacity  SMALLINT NOT NULL DEFAULT 15 CHECK (weekly_capacity > 0),
  color            TEXT,
  photo_file_id    UUID REFERENCES files(id),
  skills           TEXT[] NOT NULL DEFAULT '{}',
  bio              TEXT,
  booking_url      TEXT CHECK (booking_url IS NULL OR booking_url ~* '^https?://'),
  meet_url         TEXT CHECK (meet_url IS NULL OR meet_url ~* '^https?://'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       UUID REFERENCES users(id),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX members_area_idx ON members(area) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 2. Catálogos configuráveis
-- ---------------------------------------------------------------------
CREATE TABLE objectives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   TEXT UNIQUE,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,
  name            TEXT NOT NULL,
  tagline         TEXT,
  what            TEXT,
  why_items       TEXT[] NOT NULL DEFAULT '{}',   -- antes: texto, um item por linha
  for_who         TEXT[] NOT NULL DEFAULT '{}',
  deliverables    TEXT[] NOT NULL DEFAULT '{}',
  metrics         TEXT[] NOT NULL DEFAULT '{}',
  time_to_result  TEXT,
  questions       TEXT[] NOT NULL DEFAULT '{}',
  default_steps   TEXT[] NOT NULL DEFAULT '{}',   -- antes: "etapas"
  sort_order      INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE flow_stages (                      -- antes: process/flow.stages
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,          -- ex.: s-brief, s-aprov (regras dependem de s-aprov)
  name           TEXT NOT NULL,
  area           TEXT NOT NULL,
  sla_days       SMALLINT NOT NULL DEFAULT 2 CHECK (sla_days >= 0),
  description    TEXT,                          -- "O que fazer"
  done_criteria  TEXT,                          -- "Pronto quando"
  sort_order     INT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     UUID REFERENCES users(id)
);
CREATE TABLE flow_stage_owners (
  stage_id   UUID NOT NULL REFERENCES flow_stages(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (stage_id, member_id)
);

CREATE TABLE segment_families (                 -- antes: constante FAMS no código
  key          TEXT PRIMARY KEY,                -- saude, odonto, food, mercado, ...
  label        TEXT NOT NULL,
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  priority     INT NOT NULL,                    -- ordem de detecção (FAM_ORDER)
  audience     TEXT, audience_singular TEXT,
  pain TEXT, desire TEXT, product TEXT, offer TEXT, gift TEXT, proof TEXT,
  authority    TEXT[] NOT NULL DEFAULT '{}',
  regulatory_warning TEXT
);

CREATE TABLE commemorative_dates (              -- antes: constante DT_LIST
  code       TEXT PRIMARY KEY,
  rule       TEXT NOT NULL,                     -- 'MM-DD' | 'M:MM' | 'E±n' | 'MAES' | 'PAIS' | 'BF' | 'CM' | 'D256'
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('comercial','feriado','prof','saude','cultura','mes')),
  keywords   TEXT[] NOT NULL DEFAULT '{}',
  tip        TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE checklist_items (                  -- antes: constante CHECK (onboarding)
  code TEXT PRIMARY KEY, label TEXT NOT NULL,
  responsible TEXT NOT NULL CHECK (responsible IN ('agencia','cliente')),
  sort_order INT NOT NULL
);
CREATE TABLE diagnostic_questions (             -- antes: constante DIAG
  code TEXT PRIMARY KEY, label TEXT NOT NULL, sort_order INT NOT NULL
);

-- ---------------------------------------------------------------------
-- 3. Clientes e leads
-- ---------------------------------------------------------------------
CREATE TABLE clients (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id              TEXT UNIQUE,
  name                   TEXT NOT NULL,
  legal_name             TEXT,
  cnpj                   CHAR(14) UNIQUE CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),  -- só dígitos; formatação na tela
  segment                TEXT,
  segment_family         TEXT REFERENCES segment_families(key),   -- calculado no back-end a partir de segment+name
  address                TEXT,
  contact_name           TEXT,
  phone                  TEXT,
  email                  CITEXT,
  other_contacts         TEXT,
  stage                  TEXT NOT NULL DEFAULT 'Prospecção' CHECK (stage IN ('Prospecção','Primeiro contato','Diagnóstico','Proposta enviada','Negociação','Fechado','Perdido')),
  stage_at               DATE,
  monthly_value          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_value >= 0),
  source                 TEXT CHECK (source IS NULL OR source IN ('Indicação','Instagram','Site','Prospecção ativa','Evento','Tráfego pago','Outro')),
  commercial_owner_id    UUID REFERENCES members(id),   -- antes ownerId
  relationship_owner_id  UUID REFERENCES members(id),   -- antes relId
  strategist_id          UUID REFERENCES members(id),
  primary_objective_id   UUID REFERENCES objectives(id),
  next_step              TEXT,
  next_step_date         DATE,
  folder_url             TEXT CHECK (folder_url IS NULL OR folder_url ~* '^https?://'),
  upload_url             TEXT CHECK (upload_url IS NULL OR upload_url ~* '^https?://'),
  last_material_at       DATE,                          -- antes lastReceived
  last_touch_at          DATE,                          -- último contato de cadência
  logo_file_id           UUID REFERENCES files(id),
  satisfaction           SMALLINT CHECK (satisfaction BETWEEN 1 AND 5),
  contract_start         DATE,
  contract_end           DATE,
  adjustment_date        DATE,                          -- reajuste
  package_notes          TEXT,
  closed_at              DATE,
  lost_at                DATE,
  churned_at             DATE,
  lost_reason            TEXT,
  lost_note              TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID REFERENCES users(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by             UUID REFERENCES users(id),
  deleted_at             TIMESTAMPTZ,
  CHECK (contract_end IS NULL OR contract_start IS NULL OR contract_end >= contract_start)
);
CREATE INDEX clients_stage_idx ON clients(stage) WHERE deleted_at IS NULL;
CREATE INDEX clients_search_idx ON clients USING gin ((coalesce(name,'')||' '||coalesce(legal_name,'')||' '||coalesce(contact_name,'')||' '||coalesce(segment,'')) gin_trgm_ops);

CREATE TABLE client_objectives (
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  objective_id  UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, objective_id)
);
CREATE TABLE client_objective_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  changed_on            DATE NOT NULL,
  primary_objective_id  UUID REFERENCES objectives(id),
  objective_ids         UUID[] NOT NULL DEFAULT '{}'
);
CREATE TABLE client_services (                   -- serviços contratados (antes onboarding.services)
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id),
  PRIMARY KEY (client_id, service_id)
);
CREATE TABLE client_notes (                      -- "Observações"
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  noted_on    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TABLE client_relationship (               -- ficha de relacionamento (antes clients.rel)
  client_id         UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  contact_birthday  DATE,
  family            TEXT,
  interests         TEXT,
  service_prefs     TEXT,                        -- "Como prefere ser atendido"
  business          TEXT,  business_at DATE,
  life              TEXT,  life_at     DATE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID REFERENCES users(id)
);
CREATE TABLE client_profiles (                   -- perfil estratégico (antes clients.profile)
  client_id          UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  style              TEXT CHECK (style IS NULL OR style IN ('analitico','direto','relacional','expressivo')),
  tone               TEXT CHECK (tone IS NULL OR tone IN ('Formal','Informal','Próximo, mas profissional')),
  channel            TEXT,
  best_time          TEXT,
  values_text        TEXT,
  audience           TEXT,                        -- texto livre como digitado
  audience_keywords  TEXT[] NOT NULL DEFAULT '{}',-- derivado: split por , ; ou quebra de linha, minúsculas, >2 letras
  care               TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_member  UUID REFERENCES members(id)
);
CREATE TABLE client_handoffs (                   -- passagem de bastão (antes clients.handoff)
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  decision_maker  TEXT NOT NULL,
  channel         TEXT,
  expectations    TEXT NOT NULL,
  promises        TEXT,
  personal_notes  TEXT,
  seller_id       UUID REFERENCES members(id),
  registered_by   UUID REFERENCES members(id),
  registered_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX client_handoffs_client_idx ON client_handoffs(client_id, created_at DESC);

CREATE TABLE onboardings (
  client_id   UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  started_on  DATE
);
CREATE TABLE onboarding_checklist (
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  item_code  TEXT NOT NULL REFERENCES checklist_items(code),
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  done_on    DATE,
  PRIMARY KEY (client_id, item_code)
);
CREATE TABLE onboarding_answers (
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  question_code  TEXT NOT NULL REFERENCES diagnostic_questions(code),
  answer         TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, question_code)
);

-- ---------------------------------------------------------------------
-- 4. Produção: projetos, tarefas, aprovações
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id    TEXT UNIQUE,
  title        TEXT NOT NULL,
  client_id    UUID REFERENCES clients(id),            -- nulo = interno
  leader_id    UUID REFERENCES members(id),
  service_id   UUID REFERENCES services(id),
  priority     TEXT NOT NULL DEFAULT 'medio' CHECK (priority IN ('critico','alto','medio','baixo')),
  due_date     DATE,
  status       TEXT NOT NULL DEFAULT 'Em andamento' CHECK (status IN ('Em andamento','Concluído')),
  done_on      DATE,
  helpdesk_ref TEXT,
  description  TEXT,
  campaign_id  UUID,                                    -- FK adicionada após campaigns
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES users(id),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE approvals (                                 -- prova de aprovação do cliente
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id),
  label           TEXT NOT NULL,                          -- o que foi aprovado
  approved_by     TEXT NOT NULL,                          -- nome da pessoa no cliente
  channel         TEXT NOT NULL CHECK (channel IN ('WhatsApp','E-mail','Reunião','Ligação','Helpdesk','Pessoalmente')),
  approved_on     DATE NOT NULL,
  evidence_url    TEXT CHECK (evidence_url IS NULL OR evidence_url ~* '^https?://'),
  notes           TEXT,
  registered_by   UUID REFERENCES members(id),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (                                     -- antes: todos (tarefa avulsa ou etapa de projeto)
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id      TEXT UNIQUE,
  title          TEXT NOT NULL,
  requester      TEXT,
  client_id      UUID REFERENCES clients(id),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  flow_stage_id  UUID REFERENCES flow_stages(id),
  seq            INT NOT NULL DEFAULT 0,                  -- ordem dentro do projeto
  assignee_id    UUID REFERENCES members(id),
  service_type   TEXT,                                     -- "Tipo de atendimento" (TK_TIPOS)
  category       TEXT,                                     -- TK_CATS
  subcategory    TEXT,                                     -- TK_SUBS
  effort_level   SMALLINT CHECK (effort_level BETWEEN 1 AND 3),   -- pontos de capacidade (nulo conta 1)
  quantity       INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  work_format    TEXT NOT NULL DEFAULT 'Remoto' CHECK (work_format IN ('Remoto','Presencial')),
  urgent         BOOLEAN NOT NULL DEFAULT FALSE,
  due_date       DATE,
  due_time       TIME,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto','Em execução','Em andamento','Em espera','Aguardando cliente','Aguardando aprovação','Aprovado','Concluída')),
  opened_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_on     DATE,
  exec_started_at TIMESTAMPTZ,
  waiting_since  DATE,
  waiting_what   TEXT,
  done_on        DATE,
  approval_id    UUID REFERENCES approvals(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES users(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     UUID REFERENCES users(id),
  deleted_at     TIMESTAMPTZ,
  CHECK (status <> 'Aguardando cliente' OR waiting_since IS NOT NULL),
  CHECK (status <> 'Concluída' OR done_on IS NOT NULL)
);
CREATE INDEX tasks_open_assignee_idx ON tasks(assignee_id, due_date) WHERE status <> 'Concluída' AND deleted_at IS NULL;
CREATE INDEX tasks_client_idx  ON tasks(client_id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_project_idx ON tasks(project_id, seq);
CREATE INDEX tasks_done_idx    ON tasks(done_on) WHERE status = 'Concluída';
-- Regra de negócio: no máximo 1 tarefa "Em execução" por pessoa
CREATE UNIQUE INDEX tasks_one_exec_per_member ON tasks(assignee_id) WHERE status = 'Em execução' AND deleted_at IS NULL;

CREATE TABLE task_status_history (
  id         BIGSERIAL PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES users(id)
);
CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. Relacionamento: follow-ups, convites, reuniões, resultados
-- ---------------------------------------------------------------------
CREATE TABLE meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     TEXT UNIQUE,
  scope         TEXT NOT NULL CHECK (scope IN ('externa','interna')),
  client_id     UUID REFERENCES clients(id),
  title         TEXT NOT NULL,
  kind          TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  duration_min  INT NOT NULL DEFAULT 30,
  priority      TEXT NOT NULL DEFAULT 'medio' CHECK (priority IN ('critico','alto','medio','baixo')),
  place         TEXT,
  notes         TEXT,
  follow_up_id  UUID,                                   -- FK após follow_ups
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  CHECK (scope = 'interna' OR client_id IS NOT NULL)
);
CREATE TABLE meeting_participants (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, member_id)
);
CREATE INDEX meetings_starts_idx ON meetings(starts_at) WHERE deleted_at IS NULL;

CREATE TABLE follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  type            TEXT NOT NULL CHECK (type IN ('Follow-up estratégico','Resultado da entrega','Relacionamento','Pós-venda','Renovação','Data especial do cliente','Cadência comercial')),
  cadence_step    TEXT CHECK (cadence_step IS NULL OR cadence_step IN ('1','3','7','15','R')),
  due_from        DATE NOT NULL,
  due_to          DATE,
  owner_id        UUID REFERENCES members(id),
  owner2_id       UUID REFERENCES members(id),
  goal            TEXT,
  status          TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Feito')),
  is_auto         BOOLEAN NOT NULL DEFAULT FALSE,
  source_kind     TEXT CHECK (source_kind IS NULL OR source_kind IN ('project','creative')),
  source_id       UUID,
  source_label    TEXT,
  -- registro do contato
  done_on         DATE,
  done_by_user    UUID REFERENCES users(id),
  done_by_member  UUID REFERENCES members(id),
  channel         TEXT,
  result          TEXT,                                 -- FU_RES ou CAD_RES
  satisfaction    SMALLINT CHECK (satisfaction BETWEEN 1 AND 5),
  notes           TEXT,
  business        TEXT,
  life            TEXT,
  opportunity     TEXT,
  moved_to_stage  TEXT,
  return_on       DATE,
  meeting_id      UUID REFERENCES meetings(id),
  invited_on      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  CHECK (due_to IS NULL OR due_to >= due_from),
  CHECK (owner2_id IS NULL OR owner2_id <> owner_id)
);
CREATE INDEX follow_ups_pending_idx ON follow_ups(owner_id, due_from) WHERE status = 'Pendente' AND deleted_at IS NULL;
CREATE INDEX follow_ups_client_idx  ON follow_ups(client_id, type);
-- Não duplicar follow-up automático da mesma origem
CREATE UNIQUE INDEX follow_ups_auto_source_uq ON follow_ups(source_kind, source_id) WHERE source_id IS NOT NULL;
ALTER TABLE meetings ADD CONSTRAINT meetings_follow_up_fk FOREIGN KEY (follow_up_id) REFERENCES follow_ups(id);

CREATE TABLE invites (                                   -- convites de videochamada enviados
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id),
  follow_up_id  UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('WhatsApp','E-mail','Copiado')),
  sent_on       DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_by       UUID REFERENCES members(id),
  message       TEXT
);

CREATE TABLE monthly_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month         DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),   -- 1º dia do mês
  leads         INT, conversations INT, reach INT, new_followers INT,
  ad_spend      NUMERIC(12,2), sales INT, revenue NUMERIC(14,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES users(id),
  UNIQUE (client_id, month)
);

CREATE TABLE strategic_updates (                          -- antes: updates/<conta>/items
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('Atualização','Resultado','Estratégia','Combinado com o cliente','Ponto de atenção','Elogio')),
  text             TEXT NOT NULL,
  author_user_id   UUID NOT NULL REFERENCES users(id),
  author_member_id UUID REFERENCES members(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at        TIMESTAMPTZ,
  edited_by        UUID REFERENCES users(id),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX strategic_updates_client_idx ON strategic_updates(client_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 6. Planejamento: catálogo, datas, campanhas, sugestões, radar
-- ---------------------------------------------------------------------
CREATE TABLE custom_dates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  date       DATE NOT NULL,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,   -- nulo = vale para todos
  tip        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id),
  date_key         TEXT NOT NULL,                        -- 'AAAA-MM-DD:codigo' (ou ':c-<custom_id>')
  date             DATE NOT NULL,
  date_name        TEXT NOT NULL,
  name             TEXT NOT NULL,
  objective_id     UUID REFERENCES objectives(id),
  status           TEXT NOT NULL DEFAULT 'Ideia' CHECK (status IN ('Ideia','Planejando','Em produção','Aprovada','No ar','Encerrada')),
  owner_id         UUID REFERENCES members(id),
  prep_start       DATE,
  channels         TEXT[] NOT NULL DEFAULT '{}',
  formats          TEXT[] NOT NULL DEFAULT '{}',
  offer            TEXT,
  briefing         TEXT,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       UUID REFERENCES users(id),
  deleted_at       TIMESTAMPTZ
);
ALTER TABLE projects ADD CONSTRAINT projects_campaign_fk FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE TABLE catalog_items (                              -- antes: catalog/<cliente>__<mês>.items[]
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  publish_date  DATE NOT NULL,
  format        TEXT NOT NULL,
  theme         TEXT NOT NULL,
  channel       TEXT,
  objective_id  UUID REFERENCES objectives(id),
  assignee_id   UUID REFERENCES members(id),
  status        TEXT NOT NULL DEFAULT 'Planejado' CHECK (status IN ('Planejado','Em produção','Aprovado','Publicado')),
  copy          TEXT,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES users(id)
);
CREATE INDEX catalog_items_month_idx ON catalog_items(client_id, publish_date);

CREATE TABLE content_suggestions (                        -- resultado da IA "sob medida"
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date_key      TEXT NOT NULL,
  strategy      TEXT,
  offer         TEXT,
  ideas         JSONB NOT NULL,                           -- [{fmt,etapa,t,g,e,cta}]
  schedule      JSONB NOT NULL DEFAULT '[]',              -- [{quando,acao}]
  model         TEXT,                                     -- modelo de IA usado
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by  UUID REFERENCES users(id),
  UNIQUE (client_id, date_key)
);

CREATE TABLE radar_items (
  id            TEXT PRIMARY KEY,                         -- mantém o formato r-AAAAMMDD-NN
  found_on      DATE NOT NULL,                            -- antes "date"
  event_date    DATE NOT NULL,
  event_time    TIME,
  kind          TEXT NOT NULL CHECK (kind IN ('Esporte','Data e feriado','Evento local','Clima','Tendência','Economia e consumo','Notícia')),
  title         TEXT NOT NULL,
  summary       TEXT,
  why           TEXT,
  idea          TEXT,
  segments      TEXT[] NOT NULL DEFAULT '{}',             -- chaves de segment_families ou 'todos'
  tags          TEXT[] NOT NULL DEFAULT '{}',
  source_title  TEXT,
  source_url    TEXT CHECK (source_url IS NULL OR source_url ~* '^https?://'),
  is_manual     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT NOT NULL,                            -- 'radar' (job) ou id do usuário
  archived_at   TIMESTAMPTZ
);
CREATE INDEX radar_event_idx ON radar_items(event_date) WHERE archived_at IS NULL;
CREATE INDEX radar_segments_idx ON radar_items USING gin (segments);
CREATE TABLE radar_item_clients (
  radar_id   TEXT NOT NULL REFERENCES radar_items(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (radar_id, client_id)
);

-- ---------------------------------------------------------------------
-- 7. Biblioteca de criativos
-- ---------------------------------------------------------------------
CREATE TABLE creatives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id      TEXT UNIQUE,
  client_id      UUID REFERENCES clients(id),             -- nulo = agência
  title          TEXT NOT NULL,
  file_id        UUID REFERENCES files(id),
  link_url       TEXT CHECK (link_url IS NULL OR link_url ~* '^https?://'),
  format         TEXT,
  status         TEXT NOT NULL DEFAULT 'Em criação' CHECK (status IN ('Em criação','Em aprovação','Ajustes solicitados','Aprovado','Publicado')),
  status_on      DATE,
  member_id      UUID REFERENCES members(id),             -- quem criou
  campaign_label TEXT,
  use_month      DATE,
  notes          TEXT,
  approval_id    UUID REFERENCES approvals(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES users(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     UUID REFERENCES users(id),
  deleted_at     TIMESTAMPTZ,
  CHECK ((file_id IS NOT NULL) <> (link_url IS NOT NULL))
);
CREATE INDEX creatives_client_idx ON creatives(client_id, created_at DESC) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 8. Chat e auditoria
-- ---------------------------------------------------------------------
CREATE TABLE chat_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          TEXT NOT NULL DEFAULT 'geral',
  author_member_id UUID REFERENCES members(id),            -- nulo = sistema
  text             TEXT NOT NULL CHECK (char_length(text) <= 4000),
  is_system        BOOLEAN NOT NULL DEFAULT FALSE,
  link_action      TEXT,                                   -- ex.: task-open, open-client
  link_target_id   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX chat_channel_time_idx ON chat_messages(channel, created_at DESC);
CREATE TABLE chat_reads (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  last_read_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, channel)
);

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('create','update','delete','login','export')),
  changes     JSONB,
  ip          INET,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_log(entity, entity_id, at DESC);

-- ---------------------------------------------------------------------
-- 9. Visões de apoio (equivalentes aos cálculos do protótipo)
-- ---------------------------------------------------------------------
-- Carga semanal em pontos (semana de segunda a domingo, fuso America/Sao_Paulo)
CREATE OR REPLACE VIEW v_member_week_load AS
WITH ref AS (
  SELECT (date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo')::date) + INTERVAL '6 day')::date AS week_end
)
SELECT m.id AS member_id, m.weekly_capacity,
  COALESCE(SUM(GREATEST(COALESCE(t.effort_level,1),1)) FILTER (WHERE t.due_date IS NULL OR t.due_date <= ref.week_end),0) AS load_this_week,
  COALESCE(SUM(GREATEST(COALESCE(t.effort_level,1),1)) FILTER (WHERE t.due_date > ref.week_end AND t.due_date <= ref.week_end + 7),0) AS load_next_week
FROM members m CROSS JOIN ref
LEFT JOIN tasks t ON t.assignee_id = m.id AND t.status <> 'Concluída' AND t.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.weekly_capacity, ref.week_end;
