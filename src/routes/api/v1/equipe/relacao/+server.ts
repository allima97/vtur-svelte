import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getAdminClient,
  requireAuthenticatedUser,
  isUuid,
  logServerError,
  resolveUserScope
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;
    const adminClient = getAdminClient();
    const scope = await resolveUserScope(adminClient, user.id);

    const body = await request.json().catch(() => ({}));
    const gestorId = String(body.gestor_id || "").trim();
    const vendedorId = String(body.vendedor_id || "").trim();
    const ativo = body.ativo === true;

    if (!isUuid(gestorId) || !isUuid(vendedorId)) {
      return json({ error: "Gestor ou vendedor invalido." }, { status: 400 });
    }
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json({ error: "Sem permissao para atualizar equipe." }, { status: 403 });
    }

    const { data: scopedUsers, error: scopedErr } = await adminClient
      .from("users")
      .select("id, company_id")
      .in("id", [gestorId, vendedorId]);
    if (scopedErr) throw scopedErr;

    const byId = new Map((scopedUsers || []).map((row: any) => [String(row.id), row]));
    const gestor = byId.get(gestorId) as any;
    const vendedor = byId.get(vendedorId) as any;
    if (!gestor || !vendedor) {
      return json({ error: "Gestor ou vendedor nao encontrado." }, { status: 404 });
    }
    if (!scope.isAdmin) {
      const allowedCompanies = new Set(scope.companyIds);
      const gestorCompanyId = String(gestor.company_id || "");
      const vendedorCompanyId = String(vendedor.company_id || "");
      if (!allowedCompanies.has(gestorCompanyId) || !allowedCompanies.has(vendedorCompanyId)) {
        return json({ error: "Equipe fora do seu escopo." }, { status: 403 });
      }
    }
    if (scope.isGestor && !scope.isAdmin && !scope.isMaster && gestorId !== user.id) {
      return json({ error: "Gestor so pode alterar a propria equipe." }, { status: 403 });
    }

    const { data, error } = await client.rpc("set_gestor_vendedor_relacao", {
      p_gestor_id: gestorId,
      p_vendedor_id: vendedorId,
      p_ativo: ativo,
    });

    if (error) {
      logServerError("[equipe/relacao] falha na RPC", error);
      return json({ error: "Erro ao atualizar equipe." }, { status: 400 });
    }

    return json(data || { ok: true, ativo }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    logServerError("[equipe/relacao] falha ao atualizar equipe", error);
    return json({ error: "Erro ao atualizar equipe." }, { status: 500 });
  }
};
