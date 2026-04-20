import { e as ensureModuloAccess, c as toISODateLocal, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds } from "./v1.js";
function ensureAgendaAccess(scope, minLevel, message) {
  if (scope.isAdmin) return;
  ensureModuloAccess(scope, ["operacao_agenda", "agenda", "operacao"], minLevel, message);
}
function ensureTodoAccess(scope, minLevel, message) {
  if (scope.isAdmin) return;
  ensureModuloAccess(scope, ["operacao_todo", "todo", "tarefas", "operacao"], minLevel, message);
}
function isIsoDate(value) {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value || "").trim());
}
function normalizeTodoStatus(value) {
  const raw = String(value || "").trim();
  if (raw === "agendado" || raw === "em_andamento" || raw === "concluido") return raw;
  return "novo";
}
function normalizeVisibleTodoStatus(value) {
  const status = normalizeTodoStatus(value);
  if (status === "concluido") return "em_andamento";
  return status;
}
function normalizeTodoPriority(value) {
  const raw = String(value || "").trim();
  if (raw === "alta" || raw === "baixa") return raw;
  return "media";
}
function mapAgendaRowToEvent(row) {
  const id = String(row?.id || "").trim();
  const title = String(row?.titulo || "").trim();
  const start = String(row?.start_at || row?.start_date || "").trim();
  const endRaw = row?.end_at || row?.end_date || null;
  const end = endRaw ? String(endRaw).trim() : null;
  if (!id || !title || !start) return null;
  return {
    id,
    title,
    start,
    end,
    descricao: row?.descricao == null ? null : String(row.descricao),
    allDay: row?.all_day == null ? !String(row?.start_at || "").trim() : Boolean(row.all_day),
    source: "evento"
  };
}
function parseDateToUTC(value) {
  const raw = String(value || "").trim();
  if (!raw) return /* @__PURE__ */ new Date(NaN);
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix?.[1]) return /* @__PURE__ */ new Date(`${isoPrefix[1]}T00:00:00Z`);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("/");
    return /* @__PURE__ */ new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  }
  const datePart = raw.split("T")[0].split(" ")[0];
  return /* @__PURE__ */ new Date(`${datePart}T00:00:00Z`);
}
function isLeapYear(year) {
  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
}
function safeISODate(year, month, day) {
  let safeDay = day;
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    safeDay = 28;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}
function buildAgendaRangeParams(searchParams) {
  const inicio = String(searchParams.get("inicio") || searchParams.get("start") || "").trim();
  const fim = String(searchParams.get("fim") || searchParams.get("end") || "").trim();
  return {
    inicio: inicio.includes("T") ? inicio.split("T")[0] : inicio,
    fim: fim.includes("T") ? fim.split("T")[0] : fim
  };
}
function buildAgendaOverlapFilter(inicio, fim) {
  return [
    `and(start_date.lte.${fim},end_date.gte.${inicio})`,
    `and(start_date.gte.${inicio},start_date.lte.${fim},end_date.is.null)`
  ].join(",");
}
function mapTodoRow(row) {
  const id = String(row?.id || "").trim();
  const titulo = String(row?.titulo || "").trim();
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
async function resolveFollowUpFilters(client, scope, searchParams) {
  const requestedCompanyId = String(searchParams.get("company_id") || "").trim();
  const requestedVendedorIds = String(searchParams.get("vendedor_ids") || "").trim();
  const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
  const vendedorIds = await resolveScopedVendedorIds(client, scope, requestedVendedorIds);
  return {
    companyIds,
    vendedorIds
  };
}
function getDefaultFollowUpRange() {
  const hoje = /* @__PURE__ */ new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 30);
  return {
    inicio: toISODateLocal(inicio),
    fim: toISODateLocal(hoje)
  };
}
export {
  buildAgendaOverlapFilter as a,
  buildAgendaRangeParams as b,
  ensureTodoAccess as c,
  mapTodoRow as d,
  ensureAgendaAccess as e,
  normalizeTodoStatus as f,
  getDefaultFollowUpRange as g,
  normalizeTodoPriority as h,
  isIsoDate as i,
  mapAgendaRowToEvent as m,
  normalizeVisibleTodoStatus as n,
  parseDateToUTC as p,
  resolveFollowUpFilters as r,
  safeISODate as s
};
