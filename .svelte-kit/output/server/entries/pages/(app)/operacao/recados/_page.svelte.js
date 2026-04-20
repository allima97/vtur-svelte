import { h as head, t as ensure_array_like, e as escape_html, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { P as Plus } from "../../../../../chunks/plus.js";
import { M as Message_circle } from "../../../../../chunks/message-circle.js";
import { U as Users } from "../../../../../chunks/users.js";
import { T as Trash_2 } from "../../../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let recados = [];
    let usuarios = [];
    let loading = true;
    let modalOpen = false;
    let sending = false;
    let deletingId = "";
    let form = { receiver_id: "", assunto: "", conteudo: "" };
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/operacao/recados");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        recados = payload.items || [];
        usuarios = payload.usuarios || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar recados.");
      } finally {
        loading = false;
      }
    }
    async function send() {
      if (!form.conteudo.trim()) {
        toast.error("Informe o conteúdo do recado.");
        return;
      }
      sending = true;
      try {
        const response = await fetch("/api/v1/operacao/recados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        if (!response.ok) throw new Error(await response.text());
        toast.success("Recado enviado.");
        modalOpen = false;
        form = { receiver_id: "", assunto: "", conteudo: "" };
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao enviar recado.");
      } finally {
        sending = false;
      }
    }
    function formatDate(value) {
      return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function getNome(u) {
      return u?.nome_completo || u?.email || "Usuário";
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("d7ji4e", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Mural de Recados | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Mural de Recados",
        subtitle: "Troca de mensagens internas entre membros da equipe.",
        color: "operacao",
        breadcrumbs: [
          { label: "Operação", href: "/operacao" },
          { label: "Recados" }
        ],
        actions: [
          {
            label: "Atualizar",
            onClick: load,
            variant: "secondary",
            icon: Refresh_cw
          },
          {
            label: "Novo Recado",
            onClick: () => modalOpen = true,
            variant: "primary",
            icon: Plus
          }
        ]
      });
      $$renderer3.push(`<!----> `);
      if (loading) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
      } else if (recados.length === 0) {
        $$renderer3.push("<!--[1-->");
        Card($$renderer3, {
          color: "operacao",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="flex flex-col items-center justify-center py-16 text-slate-500">`);
            Message_circle($$renderer4, { size: 48, class: "mb-4 opacity-30" });
            $$renderer4.push(`<!----> <p class="font-medium">Nenhum recado encontrado.</p> <p class="mt-1 text-sm">Clique em "Novo Recado" para enviar uma mensagem.</p></div>`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="space-y-4"><!--[-->`);
        const each_array = ensure_array_like(recados);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let recado = each_array[$$index];
          Card($$renderer3, {
            color: "operacao",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="flex items-start justify-between gap-4"><div class="flex items-start gap-3 flex-1 min-w-0"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-operacao-100 text-operacao-700 font-semibold text-sm flex-shrink-0">${escape_html(getNome(recado.sender).slice(0, 2).toUpperCase())}</div> <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2 mb-1"><span class="font-semibold text-slate-900">${escape_html(getNome(recado.sender))}</span> `);
              if (recado.receiver) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="text-slate-400">→</span> <span class="font-medium text-slate-700">${escape_html(getNome(recado.receiver))}</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<span class="inline-flex rounded-full bg-operacao-100 px-2 py-0.5 text-xs font-medium text-operacao-700">`);
                Users($$renderer4, { size: 12, class: "mr-1 mt-0.5" });
                $$renderer4.push(`<!----> Todos</span>`);
              }
              $$renderer4.push(`<!--]--> <span class="text-xs text-slate-400">${escape_html(formatDate(recado.created_at))}</span></div> `);
              if (recado.assunto) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<p class="text-sm font-medium text-slate-800 mb-1">${escape_html(recado.assunto)}</p>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--> <p class="text-sm text-slate-700 whitespace-pre-wrap">${escape_html(recado.conteudo)}</p></div></div> <button class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 flex-shrink-0" title="Excluir"${attr("disabled", deletingId === recado.id, true)}>`);
              Trash_2($$renderer4, { size: 15 });
              $$renderer4.push(`<!----></button></div>`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Novo Recado",
        color: "operacao",
        size: "md",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Enviar",
        loading: sending,
        onConfirm: send,
        onCancel: () => modalOpen = false,
        get open() {
          return modalOpen;
        },
        set open($$value) {
          modalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="recado-para">Para</label> `);
          $$renderer4.select(
            {
              id: "recado-para",
              value: form.receiver_id,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`Todos da equipe`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(usuarios);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let u = each_array_1[$$index_1];
                $$renderer5.option({ value: u.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(u.nome_completo || u.email)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="recado-assunto">Assunto</label> <input id="recado-assunto"${attr("value", form.assunto)} class="vtur-input w-full" placeholder="Assunto opcional"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="recado-conteudo">Mensagem *</label> <textarea id="recado-conteudo" rows="5" class="vtur-input w-full" placeholder="Digite sua mensagem...">`);
          const $$body = escape_html(form.conteudo);
          if ($$body) {
            $$renderer4.push(`${$$body}`);
          }
          $$renderer4.push(`</textarea></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
