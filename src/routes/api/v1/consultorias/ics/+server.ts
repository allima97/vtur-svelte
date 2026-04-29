import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid, requireAuthenticatedUser } from '$lib/server/v1';

function toIcsDate(value: Date) {
  const iso = value.toISOString().replace(/[-:]/g, "").split(".")[0];
  return `${iso}Z`;
}

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    await requireAuthenticatedUser({ locals } as any);

    const id = url.searchParams.get("id") || "";
    if (id && !isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400 });
    }

    const client = locals.supabase;

    const baseQuery = client
      .from("consultorias_online")
      .select("id, cliente_nome, data_hora, destino")
      .order("data_hora", { ascending: true });

    const { data: rows, error } = id
      ? await baseQuery.eq("id", id).limit(1)
      : await baseQuery.limit(500);

    if (error) {
      return json({ error: "Erro ao carregar consultorias." }, { status: 500 });
    }

    const items = (rows || []).filter((row: any) => {
      const start = new Date(row?.data_hora || "");
      return !Number.isNaN(start.getTime());
    });

    if (items.length === 0) {
      return json({ error: "Nenhuma consultoria valida para exportar." }, { status: 404 });
    }

    const events = items
      .map((item: any) => {
        const start = new Date(item.data_hora);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const summary = `Consultoria - ${item.cliente_nome || "Cliente"}`;
        const description = item.destino ? `Destino: ${item.destino}` : "Consultoria";

        return [
          "BEGIN:VEVENT",
          `UID:consultoria-${item.id}@vtur.app`,
          `DTSTAMP:${toIcsDate(new Date())}`,
          `DTSTART:${toIcsDate(start)}`,
          `DTEND:${toIcsDate(end)}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          "LOCATION:Consultoria",
          "END:VEVENT"
        ].join("\r\n");
      })
      .join("\r\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//vtur//Consultoria//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      events,
      "END:VCALENDAR",
    ].join("\r\n");

    const fileName = id && items[0]?.id
      ? `consultoria-${items[0].id}.ics`
      : `consultorias-${new Date().toISOString().slice(0, 10)}.ics`;

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
