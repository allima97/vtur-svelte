import { compareISODate, extractISODate, todayISODateLocal } from '$lib/date';

export type StatusViagem = 'pendente' | 'confirmada' | 'em_viagem' | 'concluida' | 'cancelada';

const STATUS_ALIASES: Record<string, StatusViagem> = {
  pendente: 'pendente',
  planejada: 'pendente',
  planejado: 'pendente',
  programada: 'confirmada',
  programado: 'confirmada',
  confirmada: 'confirmada',
  confirmado: 'confirmada',
  em_viagem: 'em_viagem',
  emviagem: 'em_viagem',
  em_andamento: 'em_viagem',
  andamento: 'em_viagem',
  concluida: 'concluida',
  concluido: 'concluida',
  cancelada: 'cancelada',
  cancelado: 'cancelada'
};

function normalizeToken(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeViagemStatus(value: unknown): StatusViagem {
  const token = normalizeToken(value);
  return STATUS_ALIASES[token] || 'pendente';
}

export function isViagemStatusPersisted(rawStatus: unknown, resolvedStatus: StatusViagem) {
  return normalizeToken(rawStatus) === resolvedStatus;
}

export function resolveViagemStatus(input: {
  status?: unknown;
  data_inicio?: string | Date | null;
  data_fim?: string | Date | null;
  hoje?: string | Date | null;
}): StatusViagem {
  const status = normalizeViagemStatus(input.status);
  if (status === 'cancelada') return 'cancelada';

  const inicio = extractISODate(input.data_inicio);
  const fim = extractISODate(input.data_fim);
  const hoje = extractISODate(input.hoje) || todayISODateLocal();

  if (fim && compareISODate(fim, hoje) < 0) return 'concluida';
  if (!inicio) return 'pendente';
  if (compareISODate(inicio, hoje) > 0) return 'confirmada';
  if (!fim || compareISODate(hoje, fim) <= 0) return 'em_viagem';
  return 'concluida';
}

export function formatViagemStatus(status: unknown) {
  const labels: Record<StatusViagem, string> = {
    pendente: 'Pendente',
    confirmada: 'Confirmada',
    em_viagem: 'Em viagem',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
  };
  return labels[normalizeViagemStatus(status)];
}
