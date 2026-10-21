/**
 * Testes das regras de negócio (node:test).
 * Rodar: npx tsx --test proposta/dominio/regras.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as R from './regras';
import type { Client, Task, SegmentFamily, CommemorativeDate } from './tipos';

const cat = (f: string) => JSON.parse(readFileSync(join(__dirname, '../../referencia/catalogos', f), 'utf8'));
const famJson = cat('familias-de-segmento.json');
const families: SegmentFamily[] = Object.entries(famJson.FAMS).map(([key, f]: [string, any]) => ({
  key, label: f.l, keywords: f.kw, priority: famJson.FAM_ORDER.indexOf(key) === -1 ? 99 : famJson.FAM_ORDER.indexOf(key), authority: f.aut || [],
}));

const task = (p: Partial<Task>): Task => ({ id: 'x', title: 't', seq: 0, quantity: 1, workFormat: 'Remoto', urgent: false, status: 'Aberto', openedAt: '', createdAt: '', updatedAt: '', ...p });

test('datas calculadas', () => {
  assert.equal(R.easter(2026), '2026-04-05');
  assert.equal(R.easter(2027), '2027-03-28');
  assert.equal(R.blackFriday(2026), '2026-11-27');
  assert.equal(R.blackFriday(2024), '2024-11-29'); // 5ª sexta do mês: por isso a regra é "sexta após a 4ª quinta"
  const d = (rule: string) => R.resolveDate({ code: 'x', rule, name: 'x', category: 'comercial', keywords: [] } as CommemorativeDate, 2026).date;
  assert.equal(d('MAES'), '2026-05-10');
  assert.equal(d('PAIS'), '2026-08-09');
  assert.equal(d('E-47'), '2026-02-17'); // Carnaval
  assert.equal(d('CM'), '2026-11-30');
  assert.equal(d('D256'), '2026-09-13'); // Dia do Programador
});

test('família de segmento', () => {
  assert.equal(R.segmentFamilyOf('Petiscaria', 'Loukanos', families), 'food');
  assert.equal(R.segmentFamilyOf('Clínica odontológica', '', families), 'odonto');
  assert.equal(R.segmentFamilyOf('Oftalmologista', '', families), 'saude');
  assert.equal(R.segmentFamilyOf('Açougue', 'Garrotão', families), 'mercado');
  assert.equal(R.segmentFamilyOf('Autoescola', '', families), 'transito');
  assert.equal(R.segmentFamilyOf('Pet shop', '', families), 'pet');
  assert.equal(R.segmentFamilyOf('Contabilidade', '', families), 'servicos');
  assert.equal(R.segmentFamilyOf('', 'Empresa X', families), 'geral');
});

test('estado de prazo da tarefa', () => {
  const today = '2026-10-21';
  assert.equal(R.taskState(task({ dueDate: '2026-10-20' }), today), 'late');
  assert.equal(R.taskState(task({ dueDate: '2026-10-21', dueTime: '10:00' }), today, '11:00'), 'late');
  assert.equal(R.taskState(task({ dueDate: '2026-10-23' }), today), 'warn');
  assert.equal(R.taskState(task({ dueDate: '2026-10-24' }), today), 'ok');
  assert.equal(R.taskState(task({ status: 'Concluída', dueDate: '2026-10-01' }), today), 'done');
});

test('capacidade semanal', () => {
  const today = '2026-10-21'; // quarta
  assert.equal(R.weekEnd(today), '2026-10-25');
  assert.equal(R.weekStart(today), '2026-10-19');
  assert.equal(R.weekEnd('2026-10-25'), '2026-10-25'); // domingo
  const ts = [task({ assigneeId: 'm', effortLevel: 3, dueDate: '2026-10-22' }), task({ assigneeId: 'm', effortLevel: 2 }),
    task({ assigneeId: 'm', effortLevel: 1, dueDate: '2026-10-30' }), task({ assigneeId: 'm', status: 'Concluída', effortLevel: 3 })];
  assert.equal(R.weekLoad(ts, 'm', today), 5);
  assert.equal(R.weekLoad(ts, 'm', today, true), 1);
  assert.equal(R.capacityClass(16, 15), 'over');
  assert.equal(R.capacityClass(12, 15), 'warn');
});

test('saúde da conta', () => {
  const today = '2026-10-21';
  const c = { stage: 'Fechado', closedAt: '2026-06-01', createdAt: '2026-05-01T00:00:00Z', satisfaction: 3, contractEnd: '2026-11-10' } as Client;
  const h = R.accountHealth(c, { today, clientTasks: [task({ dueDate: '2026-10-01' })], lastContact: '2026-09-10', onboardingDone: 12, onboardingTotal: 12, latestResultMonth: null })!;
  // 100 −15 (1 atrasada) −15 (contato há 41 dias) −15 (satisfação 3) −10 (contrato em 20 dias) −5 (sem resultados) = 40
  assert.equal(h.score, 40);
  assert.equal(h.label, 'Em risco');
  assert.equal(R.accountHealth({ ...c, stage: 'Negociação' } as Client, { today, clientTasks: [], onboardingDone: 0, onboardingTotal: 12 }), null);
});

test('follow-up e cadência', () => {
  const today = '2026-10-21';
  assert.equal(R.followState({ status: 'Pendente', dueFrom: '2026-10-10', dueTo: '2026-10-20' }, today), 'late');
  assert.equal(R.followState({ status: 'Pendente', dueFrom: '2026-10-21', dueTo: '2026-10-25' }, today), 'warn');
  assert.deepEqual(R.cadencePlan(today).map(x => x.dueFrom), ['2026-10-22', '2026-10-24', '2026-10-28', '2026-11-05']);
  assert.ok(R.cadenceStops('Não tem interesse'));
  assert.ok(!R.cadenceStops('Sem resposta'));
  assert.deepEqual(R.resultFollowWindow(today), { dueFrom: '2026-10-28', dueTo: '2026-11-05' });
});

test('radar combina com cliente', () => {
  const r = { clientIds: [], segments: ['food'], title: 'Vasco x Flamengo', summary: '', why: '', tags: ['futebol'] };
  assert.ok(R.radarMatches(r, 'c1', 'food'));
  assert.ok(R.radarMatches({ ...r, segments: ['mercado'] }, 'c1', 'odonto', 'Vasco, novela'));
  assert.ok(!R.radarMatches({ ...r, segments: ['mercado'] }, 'c1', 'odonto', 'novela'));
});

test('conversão comercial', () => {
  const s = R.conversionStats([
    { stage: 'Fechado', createdAt: '2026-09-01', closedAt: '2026-09-21', monthlyValue: 2000 },
    { stage: 'Perdido', createdAt: '2026-09-05', lostAt: '2026-09-30' },
    { stage: 'Prospecção', createdAt: '2026-10-01' },
  ], '2026-09-01');
  assert.equal(s.conversao, 50);
  assert.equal(s.receitaFechada, 2000);
  assert.equal(s.cicloMedioDias, 20);
});

test('utilitários', () => {
  assert.equal(R.formatCnpj('11222333000181'), '11.222.333/0001-81');
  assert.ok(R.isValidCnpj('11.222.333/0001-81'));
  assert.ok(!R.isValidCnpj('11.222.333/0001-82'));
  assert.equal(R.whatsappNumber('(32) 98888-7777'), '5532988887777');
  assert.equal(R.costPerLead({ adSpend: 1500, leads: 30 }), 50);
});
