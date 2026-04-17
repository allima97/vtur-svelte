import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureModuloAccess,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  toISODateLocal,
  type UserScope
} from '$lib/server/v1';

export type TodoStatus = 'novo' | 'agendado' | 'em_andamento' | 'concluido';
export type VisibleTodoStatus = 'novo' | 'agendado' | 'em_andamento';
export type TodoPrioridade = 'alta' | 'media' | 'baixa';

export type TodoCategoria = {
  id: string;
  nome: string;
  cor: string | null;
};

export type TodoItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  done: boolean;
  categoria_id: string | null;
  prioridade: TodoPrioridade;
  status: TodoStatus;
  arquivo: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type AgendaEventItem = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  descricao: string | null;
  allDay: boolean;
  source?: 'evento' | 'birthday';
};

export type FollowUpItem = {
  id: string;
  venda_id: string | null;
  cliente_id: string | null;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  cliente_telefone: string | null;
  destino_nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_embarque: string | null;
  data_final: string | null;
  vendedor_id: string | null;
  follow_up_fechado: boolean;
  follow_up_text: string | null;
  updated_at: string | null;
};

export function ensureAgendaAccess(scope: UserScope, minLevel: number, message: string) {
  if (scope.isAdmin) return;
  ensureModuloAccess(scope, ['operacao_agenda', 'agenda', 'operacao'], minLevel, message);
}

export function ensureTodoAccess(scope: UserScope, minLevel: number, message: string) {
  if (scope.isAdmin) return;
  ensureModuloAccess(scope, ['operacao_todo', 'todo', 'tarefas', 'operacao'], minLevel, message);
}

export function ensureFollowUpAccess(scope: UserScope, minLevel: number, message: string) {
  if (scope.isAdmin) return;
  ensureModuloAccess(
    scope,
    ['dashboard', 'follow_up', 'operacao', 'viagens', 'agenda', 'operacao_todo'],
    minLevel,
    message
  );
}

export function isIsoDate(value?: string | null) {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value || '').trim());
}

export function normalizeTodoStatus(value: unknown): TodoStatus {
  const raw = String(value || '').trim();
  if (raw === 'agendado' || raw === 'em_andamento' || raw === 'concluido') return raw;
  return 'novo';
}

export function normalizeVisibleTodoStatus(value: unknown): VisibleTodoStatus {
  const status = normalizeTodoStatus(value);
  if (status === 'concluido') return 'em_andamento';
  return status;
}

export function normalizeTodoPriority(value: unknown): TodoPrioridade {
  const raw = String(value || '').trim();
  if (raw === 'alta' || raw === 'baixa') return raw;
  return 'media';
}

export function mapAgendaRowToEvent(row: any): AgendaEventItem | null {
  const id = String(row?.id || '').trim();
  const title = String(row?.titulo || '').trim();
  const start = String(row?.start_at || row?.start_date || '').trim();
  const endRaw = row?.end_at || row?.end_date || null;
  const end = endRaw ? String(endRaw).trim() : null;

  if (!id || !title || !start) return null;

  return {
    id,
    title,
    start,
    end,
    descricao: row?.descricao == null ? null : String(row.descricao),
    allDay: row?.all_day == null ? !String(row?.start_at || '').trim() : Boolean(row.all_day),
    source: 'evento'
  };
}

export function parseDateToUTC(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return new Date(NaN);

  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix?.[1]) return new Date(`${isoPrefix[1]}T00:00:00Z`);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  }

  const datePart = raw.split('T')[0].split(' ')[0];
  return new Date(`${datePart}T00:00:00Z`);
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

export function safeISODate(year: number, month: number, day: number) {
  let safeDay = day;
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    safeDay = 28;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function buildAgendaRangeParams(searchParams: URLSearchParams) {
  const inicio = String(searchParams.get('inicio') || searchParams.get('start') || '').trim();
  const fim = String(searchParams.get('fim') || searchParams.get('end') || '').trim();

  return {
    inicio: inicio.includes('T') ? inicio.split('T')[0] : inicio,
    fim: fim.includes('T') ? fim.split('T')[0] : fim
  };
}

export function buildAgendaOverlapFilter(inicio: string, fim: string) {
  return [
    `and(start_date.lte.${fim},end_date.gte.${inicio})`,
    `and(start_date.gte.${inicio},start_date.lte.${fim},end_date.is.null)`
  ].join(',');
}

export function mapTodoRow(row: any): TodoItem | null {
  const id = String(row?.id || '').trim();
  const titulo = String(row?.titulo || '').trim();
  if (!id || !titulo) return null;

  return {
    id,
    titulo,
    descricao: row?.descricao == null ? null : String(row.descricao),
    done: Boolean(row?.done),
    categoria_id: row?.categoria_id ? String(row.categoria_id) : null,
    prioridade: normalizeTodoPriority(row?.prioridade),
    status: normalizeTodoStatus(row?.status),
    arquivo: row?.arquivo ? String(row.arquivo) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null
  };
}

export async function resolveFollowUpFilters(
  client: SupabaseClient,
  scope: UserScope,
  searchParams: URLSearchParams
) {
  const requestedCompanyId = String(searchParams.get('company_id') || '').trim();
  const requestedVendedorIds = String(searchParams.get('vendedor_ids') || '').trim();
  const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
  const vendedorIds = await resolveScopedVendedorIds(client, scope, requestedVendedorIds);

  return {
    companyIds,
    vendedorIds
  };
}

export function getDefaultFollowUpRange() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 30);
  return {
    inicio: toISODateLocal(inicio),
    fim: toISODateLocal(hoje)
  };
}
