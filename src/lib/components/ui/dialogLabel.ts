/**
 * Fase 3.6: liga o título (e a descrição) do Dialog ao elemento role="dialog".
 *
 * O Modal do flowbite-svelte 0.48 renderiza o role="dialog" num <div> que não recebe
 * atributos extras ($$restProps vai para o Frame interno). Sem aria-labelledby o leitor
 * de tela anuncia só "caixa de diálogo". Esta action roda no <h3> do título, sobe até
 * o role="dialog" mais próximo e grava aria-labelledby/aria-describedby.
 * Só atributos aria: nenhum comportamento muda.
 */
let seq = 0;

export function nextDialogLabelId() {
  seq += 1;
  return `vtur-dialog-${seq}`;
}

export type DialogLabelParams = {
  labelId: string;
  descriptionId?: string | null;
};

type DialogHost = Pick<Element, 'setAttribute' | 'removeAttribute'>;
type LabelNode = { closest(selector: string): DialogHost | null };

function apply(host: DialogHost, params: DialogLabelParams) {
  host.setAttribute('aria-labelledby', params.labelId);
  if (params.descriptionId) host.setAttribute('aria-describedby', params.descriptionId);
  else host.removeAttribute('aria-describedby');
}

export function dialogLabel(node: LabelNode, params: DialogLabelParams) {
  const host = node.closest('[role="dialog"]');
  if (host) apply(host, params);
  return {
    update(next: DialogLabelParams) {
      if (host) apply(host, next);
    },
    destroy() {
      host?.removeAttribute('aria-labelledby');
      host?.removeAttribute('aria-describedby');
    }
  };
}
