export const BAIXA_RAC_USER_NAME = "Baixa RAC";
export const BAIXA_RAC_DESCRICAO = "BAIXA DE RAC";

export function normalizeBaixaRacText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function isBaixaRacUserName(value?: string | null) {
  return normalizeBaixaRacText(value) === normalizeBaixaRacText(BAIXA_RAC_USER_NAME);
}

export function isBaixaRacDescricao(value?: string | null) {
  return normalizeBaixaRacText(value) === normalizeBaixaRacText(BAIXA_RAC_DESCRICAO);
}

export function isBaixaRacVendorId(vendedorId: string | null | undefined, baixaRacId?: string | null) {
  if (!vendedorId || !baixaRacId) return false;
  return String(vendedorId).trim().toLowerCase() === String(baixaRacId).trim().toLowerCase();
}

export async function findBaixaRacVendedor(client: any, companyId: string | null) {
  if (!companyId) return null;

  const { data, error } = await client
    .from("users")
    .select("id, nome_completo, user_types(name)")
    .eq("company_id", companyId)
    .eq("active", true)
    .ilike("nome_completo", BAIXA_RAC_USER_NAME)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.id) return null;

  return {
    id: String(data.id).trim(),
    nome_completo: String(data.nome_completo || BAIXA_RAC_USER_NAME).trim(),
    user_types: data.user_types || null,
  };
}
