import {
  isViagemStatusPersisted,
  resolveViagemStatus,
  type StatusViagem
} from '$lib/viagens/status';

type ViagemStatusRow = {
  id?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export function resolveStatusFromViagemRow(row: ViagemStatusRow): StatusViagem {
  return resolveViagemStatus({
    status: row?.status,
    data_inicio: row?.data_inicio,
    data_fim: row?.data_fim
  });
}

export async function syncViagemStatusIfNeeded(client: any, row: ViagemStatusRow) {
  const id = String(row?.id || '').trim();
  if (!id) return resolveStatusFromViagemRow(row);

  const resolvedStatus = resolveStatusFromViagemRow(row);
  if (isViagemStatusPersisted(row?.status, resolvedStatus)) return resolvedStatus;

  const { error } = await client
    .from('viagens')
    .update({
      status: resolvedStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.warn('[viagens] falha ao sincronizar status', { id, error });
  } else {
    row.status = resolvedStatus;
  }

  return resolvedStatus;
}

export async function syncViagensStatus(client: any, rows: ViagemStatusRow[]) {
  const statuses = new Map<string, StatusViagem>();
  for (const row of rows || []) {
    const id = String(row?.id || '').trim();
    const status = await syncViagemStatusIfNeeded(client, row);
    if (id) statuses.set(id, status);
  }
  return statuses;
}
