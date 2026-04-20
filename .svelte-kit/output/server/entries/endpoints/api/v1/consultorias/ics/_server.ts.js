import { json } from "@sveltejs/kit";
function toIcsDate(value) {
  const iso = value.toISOString().replace(/[-:]/g, "").split(".")[0];
  return `${iso}Z`;
}
const GET = async ({ url, locals }) => {
  try {
    const id = url.searchParams.get("id") || "";
    if (!id) {
      return json({ error: "Informe o id da consultoria." }, { status: 400 });
    }
    const client = locals.supabase;
    const { data, error } = await client.from("consultorias_online").select("id, cliente_nome, data_hora, destino").eq("id", id).maybeSingle();
    if (error || !data) {
      return json({ error: "Consultoria nao encontrada." }, { status: 404 });
    }
    const start = new Date(data.data_hora);
    if (Number.isNaN(start.getTime())) {
      return json({ error: "Data invalida." }, { status: 400 });
    }
    const end = new Date(start.getTime() + 60 * 60 * 1e3);
    const summary = `Consultoria - ${data.cliente_nome || "Cliente"}`;
    const description = data.destino ? `Destino: ${data.destino}` : "Consultoria";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//vtur//Consultoria//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:consultoria-${data.id}@vtur.app`,
      `DTSTAMP:${toIcsDate(/* @__PURE__ */ new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "LOCATION:Consultoria",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="consultoria-${data.id}.ics"`
      }
    });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  GET
};
