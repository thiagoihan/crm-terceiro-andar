/**
 * Tipos de domínio PROPOSTOS para a versão independente (TypeScript).
 * Espelham proposta/schema.sql. Os valores das enumerações vêm do protótipo crm.html
 * (lista completa em referencia/catalogos/enumeracoes.json).
 */

export type UUID = string;
/** Data de calendário 'AAAA-MM-DD' (sem fuso; interpretada em America/Sao_Paulo). */
export type ISODate = string;
/** Instante ISO-8601 em UTC. */
export type ISODateTime = string;

export const AREAS = ['Relacionamento', 'Estratégia', 'Audiovisual', 'Design', 'Social media', 'Tráfego pago', 'Copywriting', 'Comercial', 'Desenvolvimento interno', 'Gestão'] as const;
export type Area = (typeof AREAS)[number];

export const PIPELINE = ['Prospecção', 'Primeiro contato', 'Diagnóstico', 'Proposta enviada', 'Negociação', 'Fechado', 'Perdido'] as const;
export type Stage = (typeof PIPELINE)[number];

export const PRIORITIES = ['critico', 'alto', 'medio', 'baixo'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_STATUS = ['Aberto', 'Em execução', 'Em andamento', 'Em espera', 'Aguardando cliente', 'Aguardando aprovação', 'Aprovado', 'Concluída'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const FOLLOW_TYPES = ['Follow-up estratégico', 'Resultado da entrega', 'Relacionamento', 'Pós-venda', 'Renovação', 'Data especial do cliente', 'Cadência comercial'] as const;
export type FollowType = (typeof FOLLOW_TYPES)[number];

export const CREATIVE_STATUS = ['Em criação', 'Em aprovação', 'Ajustes solicitados', 'Aprovado', 'Publicado'] as const;
export type CreativeStatus = (typeof CREATIVE_STATUS)[number];

export const CAMPAIGN_STATUS = ['Ideia', 'Planejando', 'Em produção', 'Aprovada', 'No ar', 'Encerrada'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const CATALOG_STATUS = ['Planejado', 'Em produção', 'Aprovado', 'Publicado'] as const;
export type CatalogStatus = (typeof CATALOG_STATUS)[number];

export const RADAR_KINDS = ['Esporte', 'Data e feriado', 'Evento local', 'Clima', 'Tendência', 'Economia e consumo', 'Notícia'] as const;
export type RadarKind = (typeof RADAR_KINDS)[number];

export const UPDATE_KINDS = ['Atualização', 'Resultado', 'Estratégia', 'Combinado com o cliente', 'Ponto de atenção', 'Elogio'] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const APPROVAL_CHANNELS = ['WhatsApp', 'E-mail', 'Reunião', 'Ligação', 'Helpdesk', 'Pessoalmente'] as const;
export type ApprovalChannel = (typeof APPROVAL_CHANNELS)[number];

export type DateCategory = 'comercial' | 'feriado' | 'prof' | 'saude' | 'cultura' | 'mes' | 'custom';
export type CommunicationStyle = 'analitico' | 'direto' | 'relacional' | 'expressivo';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

interface Audited {
  createdAt: ISODateTime;
  createdBy?: UUID | null;
  updatedAt: ISODateTime;
  updatedBy?: UUID | null;
}

export interface Member extends Audited {
  id: UUID;
  userId?: UUID | null;
  name: string;
  area: Area;
  roleTitle?: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
  showInRanking: boolean;
  weeklyCapacity: number; // padrão 15
  color?: string;
  photoFileId?: UUID | null;
  skills: string[];
  bio?: string;
  bookingUrl?: string;
  meetUrl?: string;
}

export interface Client extends Audited {
  id: UUID;
  name: string;
  legalName?: string;
  cnpj?: string; // 14 dígitos
  segment?: string;
  segmentFamily?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  otherContacts?: string;
  stage: Stage;
  stageAt?: ISODate;
  monthlyValue: number;
  source?: string;
  commercialOwnerId?: UUID | null;
  relationshipOwnerId?: UUID | null;
  strategistId?: UUID | null;
  primaryObjectiveId?: UUID | null;
  objectiveIds: UUID[];
  nextStep?: string;
  nextStepDate?: ISODate;
  folderUrl?: string;
  uploadUrl?: string;
  lastMaterialAt?: ISODate;
  lastTouchAt?: ISODate;
  logoFileId?: UUID | null;
  satisfaction?: 1 | 2 | 3 | 4 | 5 | null;
  contractStart?: ISODate;
  contractEnd?: ISODate;
  adjustmentDate?: ISODate;
  packageNotes?: string;
  closedAt?: ISODate;
  lostAt?: ISODate;
  churnedAt?: ISODate;
  lostReason?: string;
  lostNote?: string;
  onboarding?: { startedOn?: ISODate; checklist: Record<string, { done: boolean; doneOn?: ISODate }>; answers: Record<string, string> };
  contractedServiceIds: UUID[];
}

export interface Approval {
  id: UUID;
  clientId: UUID;
  label: string;
  approvedBy: string;
  channel: ApprovalChannel;
  approvedOn: ISODate;
  evidenceUrl?: string;
  notes?: string;
  registeredBy?: UUID;
  registeredAt: ISODateTime;
}

export interface Task extends Audited {
  id: UUID;
  title: string;
  requester?: string;
  clientId?: UUID | null;
  projectId?: UUID | null;
  flowStageCode?: string | null; // ex.: 's-aprov'
  seq: number;
  assigneeId?: UUID | null;
  serviceType?: string;
  category?: string;
  subcategory?: string;
  effortLevel?: 1 | 2 | 3 | null;
  quantity: number;
  workFormat: 'Remoto' | 'Presencial';
  urgent: boolean;
  dueDate?: ISODate | null;
  dueTime?: string | null; // 'HH:MM'
  description?: string;
  status: TaskStatus;
  openedAt: ISODateTime;
  startedOn?: ISODate;
  execStartedAt?: ISODateTime;
  waitingSince?: ISODate;
  waitingWhat?: string;
  doneOn?: ISODate;
  approvalId?: UUID | null;
}

export interface Project extends Audited {
  id: UUID;
  title: string;
  clientId?: UUID | null;
  leaderId?: UUID | null;
  serviceId?: UUID | null;
  priority: Priority;
  dueDate?: ISODate;
  status: 'Em andamento' | 'Concluído';
  doneOn?: ISODate;
  helpdeskRef?: string;
  description?: string;
  campaignId?: UUID | null;
}

export interface FlowStage {
  id: UUID;
  code: string;
  name: string;
  area: Area | string;
  slaDays: number;
  description?: string;
  doneCriteria?: string;
  sortOrder: number;
  ownerIds: UUID[]; // vazio = todos da área
}

export interface FollowUp extends Audited {
  id: UUID;
  clientId: UUID;
  type: FollowType;
  cadenceStep?: '1' | '3' | '7' | '15' | 'R';
  dueFrom: ISODate;
  dueTo?: ISODate;
  ownerId?: UUID | null;
  owner2Id?: UUID | null;
  goal?: string;
  status: 'Pendente' | 'Feito';
  isAuto: boolean;
  source?: { kind: 'project' | 'creative'; id: UUID; label: string };
  doneOn?: ISODate;
  doneByMember?: UUID;
  channel?: string;
  result?: string;
  satisfaction?: number;
  notes?: string;
  business?: string;
  life?: string;
  opportunity?: string;
  returnOn?: ISODate;
  meetingId?: UUID;
}

export interface Meeting extends Audited {
  id: UUID;
  scope: 'externa' | 'interna';
  clientId?: UUID | null;
  title: string;
  kind: string;
  startsAt: ISODateTime;
  durationMin: number;
  priority: Priority;
  place?: string;
  notes?: string;
  participantIds: UUID[];
  followUpId?: UUID | null;
}

export interface MonthlyResult {
  id: UUID;
  clientId: UUID;
  month: ISODate; // 1º dia do mês
  leads?: number | null;
  conversations?: number | null;
  reach?: number | null;
  newFollowers?: number | null;
  adSpend?: number | null;
  sales?: number | null;
  revenue?: number | null;
  notes?: string;
}

export interface RadarItem {
  id: string; // r-AAAAMMDD-NN
  foundOn: ISODate;
  eventDate: ISODate;
  eventTime?: string;
  kind: RadarKind;
  title: string;
  summary?: string;
  why?: string;
  idea?: string;
  segments: string[]; // chaves de família ou 'todos'
  tags: string[];
  clientIds: UUID[];
  source?: { title: string; url: string } | null;
  isManual: boolean;
  createdAt: ISODateTime;
  createdBy: string;
}

export interface SegmentFamily {
  key: string;
  label: string;
  keywords: string[];
  priority: number;
  audience?: string;
  pain?: string;
  desire?: string;
  product?: string;
  offer?: string;
  gift?: string;
  proof?: string;
  authority: string[];
  regulatoryWarning?: string;
}

export interface CommemorativeDate {
  code: string;
  rule: string;
  name: string;
  category: Exclude<DateCategory, 'custom'>;
  keywords: string[];
  tip?: string;
}

/** Ocorrência calculada de uma data num ano (equivale ao objeto de datesFor()). */
export interface DateOccurrence {
  key: string; // 'AAAA-MM-DD:codigo'
  code: string;
  date: ISODate;
  name: string;
  category: DateCategory;
  keywords: string[];
  tip?: string;
  isMonth: boolean;
  clientId?: UUID | null;
}

export interface ContentIdea {
  fmt: string;
  etapa: 'Atração' | 'Consideração' | 'Conversão' | string;
  t: string;
  g?: string;
  e?: string;
  cta?: string;
}

export interface HealthResult {
  score: number;
  level: 'ok' | 'warn' | 'risk';
  label: 'Saudável' | 'Atenção' | 'Em risco';
  reasons: string[];
}
