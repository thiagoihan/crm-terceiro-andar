/**
 * Regras de negócio do protótipo, reescritas como funções puras em TypeScript.
 *
 * Cada função indica a função de origem em fonte-original/crm.html. O comportamento
 * foi mantido; as diferenças estão marcadas com "DIFERENÇA".
 * Os testes estão em regras.test.ts (rodar: npx tsx --test proposta/dominio/regras.test.ts).
 *
 * Todas as funções recebem "hoje" (ISODate em America/Sao_Paulo) como parâmetro para
 * serem determinísticas. No protótipo, "hoje" vinha do relógio do navegador.
 */
import type { Client, CommemorativeDate, DateOccurrence, FollowUp, HealthResult, ISODate, RadarItem, SegmentFamily, Task, TaskStatus } from './tipos';

// ---------------------------------------------------------------- datas
export function todayInSaoPaulo(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
const toUTC = (d: ISODate) => { const [y, m, dd] = d.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
const fromUTC = (t: number): ISODate => new Date(t).toISOString().slice(0, 10);
/** daysTo(): dias de "today" até "d" (negativo = passado). */
export function daysBetween(today: ISODate, d: ISODate): number { return Math.round((toUTC(d) - toUTC(today)) / 864e5); }
export function addDays(d: ISODate, n: number): ISODate { return fromUTC(toUTC(d) + n * 864e5); }
const dow = (d: ISODate) => new Date(toUTC(d)).getUTCDay(); // 0 = domingo

// ---------------------------------------------------------------- tarefas
/** tkS(): status legados. */
export function normalizeTaskStatus(s?: string): TaskStatus {
  if (s === 'A fazer') return 'Aberto';
  if (s === 'Fazendo') return 'Em andamento';
  return (s as TaskStatus) || 'Aberto';
}
export type DueState = 'done' | 'late' | 'warn' | 'ok';
/** taskState(): atrasada se passou o dia ou, no próprio dia, passou do horário limite; perto do prazo se faltam até 2 dias. */
export function taskState(t: Pick<Task, 'status' | 'dueDate' | 'dueTime'>, today: ISODate, nowHHMM?: string): DueState {
  if (t.status === 'Concluída') return 'done';
  if (!t.dueDate) return 'ok';
  const n = daysBetween(today, t.dueDate);
  if (n === 0 && t.dueTime && nowHHMM && nowHHMM > t.dueTime) return 'late';
  if (n < 0) return 'late';
  if (n <= 2) return 'warn';
  return 'ok';
}
/** pts(): pontos de capacidade = nível (mínimo 1). */
export const taskPoints = (t: Pick<Task, 'effortLevel'>) => Math.max(1, Number(t.effortLevel) || 1);
/** weekEnd(off): domingo da semana atual (se hoje é domingo, é hoje) + 7*off. */
export function weekEnd(today: ISODate, off = 0): ISODate { return addDays(today, ((7 - dow(today)) % 7) + 7 * off); }
export function weekStart(today: ISODate, off = 0): ISODate { return addDays(weekEnd(today, off), -6); }
/** weekLoad(): semana atual = abertas sem prazo ou com prazo até domingo (inclui atrasadas); próxima = prazo entre os dois domingos. */
export function weekLoad(tasks: Task[], memberId: string, today: ISODate, next = false): number {
  const e0 = weekEnd(today, 0), e1 = weekEnd(today, 1);
  return tasks.filter(t => t.assigneeId === memberId && t.status !== 'Concluída')
    .filter(t => next ? (!!t.dueDate && t.dueDate > e0 && t.dueDate <= e1) : (!t.dueDate || t.dueDate <= e0))
    .reduce((s, t) => s + taskPoints(t), 0);
}
/** capCls(). */
export const capacityClass = (load: number, cap: number) => load > cap ? 'over' : load >= cap * 0.8 ? 'warn' : '';
/** openTasks(): ordenação padrão das listas. */
export function sortOpenTasks(list: Task[], today: ISODate): Task[] {
  const r: Record<DueState, number> = { late: 0, warn: 1, ok: 2, done: 3 };
  return list.filter(t => t.status !== 'Concluída').sort((a, b) =>
    (Number(!!b.urgent) - Number(!!a.urgent)) || r[taskState(a, today)] - r[taskState(b, today)] ||
    (a.dueDate || '9').localeCompare(b.dueDate || '9') || ((Number(b.effortLevel) || 0) - (Number(a.effortLevel) || 0)));
}

// ---------------------------------------------------------------- follow-ups
/** fuState(): atrasado se passou o "fazer até"; "fazer agora" se a janela já abriu. */
export function followState(f: Pick<FollowUp, 'status' | 'dueFrom' | 'dueTo'>, today: ISODate): DueState {
  if (f.status === 'Feito') return 'done';
  const a = daysBetween(today, f.dueFrom), b = daysBetween(today, f.dueTo || f.dueFrom);
  if (b < 0) return 'late';
  if (a <= 0) return 'warn';
  return 'ok';
}
export const CADENCE_STEPS = [1, 3, 7, 15] as const;
/** startCadence(): um contato por passo, com janela de 2 dias. */
export function cadencePlan(today: ISODate) { return CADENCE_STEPS.map(d => ({ step: String(d) as '1' | '3' | '7' | '15', dueFrom: addDays(today, d), dueTo: addDays(today, d + 1) })); }
/** cadenceDo(): resultados que encerram a cadência. */
export const cadenceStops = (result: string, returnOn?: string) => result === 'Respondeu e avançou' || result === 'Não tem interesse' || !!returnOn;
/** ensureFollow(): janela do follow de resultado depois de uma entrega. */
export const resultFollowWindow = (today: ISODate) => ({ dueFrom: addDays(today, 7), dueTo: addDays(today, 15) });
/** followDo(): próximo follow em N dias (janela até N+5). */
export const nextFollowWindow = (today: ISODate, n: number) => ({ dueFrom: addDays(today, n), dueTo: addDays(today, n + 5) });

// ---------------------------------------------------------------- saúde da conta
export interface HealthContext {
  today: ISODate;
  clientTasks: Task[];                 // tarefas do cliente
  lastContact?: ISODate | null;        // máx(follow feito, reunião passada)
  onboardingDone: number;              // itens do checklist feitos
  onboardingTotal: number;             // 12
  latestResultMonth?: ISODate | null;  // 'AAAA-MM-01' do último resultado
  nowHHMM?: string;
}
/** health() — versão final (v33). Só para clientes "Fechado". */
export function accountHealth(c: Client, x: HealthContext): HealthResult | null {
  if (c.stage !== 'Fechado') return null;
  let s = 100; const why: string[] = [];
  const open = x.clientTasks.filter(t => t.status !== 'Concluída');
  const late = open.filter(t => normalizeTaskStatus(t.status) !== 'Aguardando cliente' && taskState(t, x.today, x.nowHHMM) === 'late').length;
  if (late) { s -= Math.min(45, late * 15); why.push(`${late} tarefa${late > 1 ? 's' : ''} atrasada${late > 1 ? 's' : ''}`); }
  const w = open.filter(t => normalizeTaskStatus(t.status) === 'Aguardando cliente' && t.waitingSince && -daysBetween(x.today, t.waitingSince) > 5).length;
  if (w) { s -= Math.min(30, w * 10); why.push(`${w} item${w > 1 ? 's' : ''} parado${w > 1 ? 's' : ''} com o cliente há mais de 5 dias`); }
  const base = x.lastContact || c.closedAt || c.createdAt?.slice(0, 10);
  const ds = base ? -daysBetween(x.today, base) : null;
  if (ds !== null && ds > 60) { s -= 25; why.push(x.lastContact ? `último contato há ${ds} dias` : 'nenhum contato registrado'); }
  else if (ds !== null && ds > 30) { s -= 15; why.push(x.lastContact ? `último contato há ${ds} dias` : 'nenhum contato registrado'); }
  const pen = ({ 1: 40, 2: 30, 3: 15, 4: 5 } as Record<number, number>)[Number(c.satisfaction) || 0] || 0;
  if (pen) { s -= pen; why.push(`satisfação ${c.satisfaction}/5`); }
  if (c.closedAt && -daysBetween(x.today, c.closedAt) > 30 && x.onboardingDone < x.onboardingTotal) { s -= 10; why.push(`onboarding incompleto (${x.onboardingDone}/${x.onboardingTotal})`); }
  if (c.contractEnd) { const ce = daysBetween(x.today, c.contractEnd); if (ce <= 30) { s -= 10; why.push(ce < 0 ? `contrato vencido há ${-ce} dias` : `contrato vence em ${ce} dias`); } }
  if (c.closedAt && -daysBetween(x.today, c.closedAt) > 45) {
    const twoMonthsAgo = addMonths(x.today.slice(0, 7) + '-01', -2);
    if (!x.latestResultMonth || x.latestResultMonth < twoMonthsAgo) { s -= 5; why.push('sem resultados registrados nos últimos meses'); }
  }
  s = Math.max(0, Math.min(100, s));
  const [level, label] = s >= 75 ? ['ok', 'Saudável'] as const : s >= 50 ? ['warn', 'Atenção'] as const : ['risk', 'Em risco'] as const;
  return { score: s, level, label, reasons: why };
}
function addMonths(firstOfMonth: ISODate, n: number): ISODate {
  const [y, m] = firstOfMonth.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- responsáveis padrão
interface MemberLite { id: string; area: string }
/** relOwner() v33. */
export function relationshipOwner(c: Pick<Client, 'relationshipOwnerId' | 'stage' | 'commercialOwnerId'>, members: MemberLite[]): string {
  const ids = new Set(members.map(m => m.id));
  const rel = members.find(m => m.area === 'Relacionamento')?.id || '';
  if (c.relationshipOwnerId && ids.has(c.relationshipOwnerId)) return c.relationshipOwnerId;
  if (c.stage === 'Fechado' && rel) return rel;
  if (c.commercialOwnerId && ids.has(c.commercialOwnerId)) return c.commercialOwnerId;
  return rel;
}
/** strategistOf(). */
export const strategistOf = (c: Pick<Client, 'strategistId'>, members: MemberLite[]) =>
  (c.strategistId && members.some(m => m.id === c.strategistId)) ? c.strategistId : (members.find(m => m.area === 'Estratégia')?.id || '');
/** pickOwner()/flowItems(): responsável da etapa = dono com menor carga (considerando o lote). */
export function pickLeastLoaded(candidates: string[], loadOf: (id: string) => number, extra: Record<string, number> = {}): string {
  if (!candidates.length) return '';
  return candidates.slice().sort((a, b) => (loadOf(a) + (extra[a] || 0)) - (loadOf(b) + (extra[b] || 0)))[0];
}

// ---------------------------------------------------------------- segmentos, datas e radar
/** famOf(): primeira família (na ordem de prioridade) com palavra-chave contida em " segmento nome ". */
export function segmentFamilyOf(segment: string | undefined, name: string | undefined, families: SegmentFamily[]): string {
  const hay = ' ' + ((segment || '') + ' ' + (name || '')).toLowerCase() + ' ';
  const ordered = families.filter(f => f.key !== 'geral').sort((a, b) => a.priority - b.priority);
  for (const f of ordered) if (f.keywords.some(w => hay.includes(w))) return f.key;
  return 'geral';
}
/** relevantTo(): data personalizada do cliente, ou palavra-chave da data no segmento/nome. */
export function dateRelevantTo(d: DateOccurrence, c: Pick<Client, 'id' | 'segment' | 'name'>): boolean {
  if (d.clientId) return d.clientId === c.id;
  const hay = ((c.segment || '') + ' ' + (c.name || '')).toLowerCase();
  return d.keywords.some(k => k && hay.includes(k));
}
/** radarMatch(). DIFERENÇA: recebe a família já calculada. */
export function radarMatches(r: Pick<RadarItem, 'clientIds' | 'segments' | 'title' | 'summary' | 'why' | 'tags'>, clientId: string, clientFamily: string, audience?: string): boolean {
  if (r.clientIds.includes(clientId)) return true;
  if (r.segments.includes('todos') || r.segments.includes(clientFamily)) return true;
  const hay = [r.title, r.summary, r.why, r.tags.join(' ')].join(' ').toLowerCase();
  return String(audience || '').split(/[,;\n]/).map(x => x.trim().toLowerCase()).some(k => k.length > 2 && hay.includes(k));
}

/** easterOf(): algoritmo de Meeus/Jones/Butcher (domingo de Páscoa). */
export function easter(y: number): ISODate {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return fromUTC(Date.UTC(y, month - 1, day));
}
function nthSunday(y: number, month: number, n: number): ISODate {
  const first = fromUTC(Date.UTC(y, month - 1, 1)); return addDays(first, ((7 - dow(first)) % 7) + 7 * (n - 1));
}
/** blackFriday(): sexta-feira seguinte à 4ª quinta-feira de novembro. */
export function blackFriday(y: number): ISODate {
  const first = fromUTC(Date.UTC(y, 10, 1)); const firstThu = ((4 - dow(first)) + 7) % 7; return addDays(first, firstThu + 21 + 1);
}
/** datesFor(): resolve a regra de uma data num ano. */
export function resolveDate(d: CommemorativeDate, y: number): DateOccurrence {
  let date: ISODate; let isMonth = false; const r = d.rule;
  if (r.startsWith('M:')) { date = `${y}-${r.slice(2).padStart(2, '0')}-01`; isMonth = true; }
  else if (r[0] === 'E') date = addDays(easter(y), Number(r.slice(1)));
  else if (r === 'MAES') date = nthSunday(y, 5, 2);
  else if (r === 'PAIS') date = nthSunday(y, 8, 2);
  else if (r === 'BF') date = blackFriday(y);
  else if (r === 'CM') date = addDays(blackFriday(y), 3);
  else if (r === 'D256') date = addDays(`${y}-01-01`, 255);
  else { const [mm, dd] = r.split('-'); date = `${y}-${mm}-${dd}`; }
  return { key: `${date}:${d.code}`, code: d.code, date, name: d.name, category: d.category, keywords: d.keywords, tip: d.tip, isMonth };
}

// ---------------------------------------------------------------- comercial
interface LeadLite { createdAt?: string; closedAt?: string; lostAt?: string; churnedAt?: string; stage: string; monthlyValue?: number }
/** convStats(): indicadores de conversão no período a partir de "from" (vazio = desde o início). */
export function conversionStats(list: LeadLite[], from = '') {
  const inP = (d?: string) => !!d && (!from || d >= from);
  const novos = list.filter(c => inP(c.createdAt?.slice(0, 10))).length;
  const fech = list.filter(c => c.closedAt && inP(c.closedAt) && (c.stage === 'Fechado' || c.churnedAt));
  const perd = list.filter(c => c.lostAt && inP(c.lostAt)).length;
  const mrr = fech.reduce((s, c) => s + (Number(c.monthlyValue) || 0), 0);
  const cyc = fech.map(c => c.createdAt && c.closedAt ? Math.max(0, daysBetween(c.createdAt.slice(0, 10), c.closedAt)) : null).filter((x): x is number => x !== null);
  return {
    novos, fechados: fech.length, perdidos: perd,
    conversao: fech.length + perd ? Math.round(fech.length / (fech.length + perd) * 100) : null,
    receitaFechada: mrr, ticketMedio: fech.length ? mrr / fech.length : 0,
    cicloMedioDias: cyc.length ? Math.round(cyc.reduce((a, b) => a + b, 0) / cyc.length) : null,
  };
}
/** stageFix(): datas que mudam com a etapa. */
export function applyStageChange(prev: Partial<Client>, next: Partial<Client>, today: ISODate, onboardingAnyDone: boolean): Partial<Client> {
  const was = prev.stage, now = next.stage; const rec: Partial<Client> = { ...next };
  if (was !== now) rec.stageAt = today;
  if (now === 'Fechado' && was !== 'Fechado') { rec.closedAt = today; rec.onboarding = { checklist: {}, answers: {}, ...(prev.onboarding || {}), startedOn: prev.onboarding?.startedOn || today }; delete rec.lostAt; delete rec.churnedAt; }
  if (was === 'Fechado' && now !== 'Fechado') {
    if (now === 'Perdido') rec.churnedAt = today;
    else { delete rec.closedAt; if (!onboardingAnyDone && rec.onboarding) rec.onboarding = { ...rec.onboarding, startedOn: undefined }; }
  }
  if (now === 'Perdido' && was !== 'Perdido' && was !== 'Fechado') rec.lostAt = today;
  if (was === 'Perdido' && now !== 'Perdido') { delete rec.lostAt; delete rec.churnedAt; }
  return rec;
}
/** handoffForm(): padrões de contrato. */
export const contractDefaults = (start: ISODate) => ({ contractEnd: addDays(start, 365), adjustmentDate: addDays(start, 365) });

// ---------------------------------------------------------------- resultados
/** cpl(): custo por lead. */
export const costPerLead = (r: { adSpend?: number | null; leads?: number | null }) => (Number(r.adSpend) && Number(r.leads)) ? Number(r.adSpend) / Number(r.leads) : null;
/** CNPJ: o protótipo exige 14 dígitos e formata. DIFERENÇA proposta: validar também os dígitos verificadores. */
export function formatCnpj(v: string): string { const d = v.replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : v.trim(); }
export function isValidCnpj(v: string): boolean {
  const d = v.replace(/\D/g, ''); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => { const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
/** waNum(): número para wa.me (acrescenta 55 se tiver até 11 dígitos). */
export function whatsappNumber(p?: string): string { let d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d.length <= 11) d = '55' + d; return d; }
