import { normalizeText } from '$lib/normalizeText';
import { supabase as supabaseBrowser } from '$lib/db/supabase';
import {
  calcularNaoComissionavelPorVenda as calcularNaoComissionavelPorVendaShared,
  calcularNaoComissionavelResumo,
} from '$lib/naoComissionavel';

const DEFAULT_NAO_COMISSIONAVEIS = [
  "credito diversos",
  "credito pax",
  "credito passageiro",
  "credito de viagem",
  "credipax",
  "vale viagem",
  "carta de credito",
  "ficha cvc",
  "cvc ficha",
  "credito",
];

const DEFAULT_NAO_COMISSIONAVEIS_NORMALIZED = DEFAULT_NAO_COMISSIONAVEIS.map((termo) =>
  normalizeText(termo, { trim: true, collapseWhitespace: true })
).filter(Boolean);

let cachedTermosNaoComissionaveis: string[] | null = null;
let termosLoadPromise: Promise<string[]> | null = null;

function normalizeTerm(value?: string | null) {
  return normalizeText(value || "", { trim: true, collapseWhitespace: true });
}

export async function carregarTermosNaoComissionaveis(options: { force?: boolean } = {}) {
  const { force = false } = options;
  if (!force && cachedTermosNaoComissionaveis) return cachedTermosNaoComissionaveis;
  if (!force && termosLoadPromise) return termosLoadPromise;

  termosLoadPromise = (async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("parametros_pagamentos_nao_comissionaveis")
        .select("termo, termo_normalizado, ativo")
        .eq("ativo", true)
        .order("termo", { ascending: true });
      if (error) throw error;
      const termos: string[] = (data || [])
        .map((row: any) => normalizeTerm(row?.termo_normalizado || row?.termo))
        .filter((t: string) => Boolean(t));
      const unique: string[] = Array.from(new Set(termos));
      cachedTermosNaoComissionaveis = unique;
      return unique;
    } catch (err) {
      console.warn("[pagamentoUtils] Falha ao carregar termos nao comissionaveis.", err);
    } finally {
      termosLoadPromise = null;
    }
    cachedTermosNaoComissionaveis = DEFAULT_NAO_COMISSIONAVEIS_NORMALIZED;
    return cachedTermosNaoComissionaveis as string[];
  })() as Promise<string[]>;

  return termosLoadPromise;
}

export function isFormaNaoComissionavel(nome?: string | null, termos?: string[] | null) {
  const normalized = normalizeTerm(nome);
  if (!normalized) return false;
  if (normalized.includes("cartao") && normalized.includes("credito")) return false;
  const lista =
    termos && termos.length
      ? termos
      : cachedTermosNaoComissionaveis || DEFAULT_NAO_COMISSIONAVEIS_NORMALIZED;
  return lista.some((termo) => termo && normalized.includes(termo));
}

export function calcularNaoComissionavelPorVenda(
  pagamentos: {
    venda_id: string;
    venda_recibo_id?: string | null;
    valor_total?: number | null;
    valor_bruto?: number | null;
    desconto_valor?: number | null;
    paga_comissao?: boolean | null;
    forma_nome?: string | null;
    operacao?: string | null;
    plano?: string | null;
    forma?: { nome?: string | null; paga_comissao?: boolean | null } | null;
  }[],
  termos?: string[] | null
) {
  return calcularNaoComissionavelPorVendaShared(pagamentos, termos);
}

export { calcularNaoComissionavelResumo };
