import { writable } from 'svelte/store';
import type { Component } from 'svelte';

/**
 * Fase 5.1: itens do menu que o usuário pode ver, publicados pelo Sidebar.
 *
 * O Sidebar continua sendo a única fonte da regra de quem vê o quê (permissões,
 * papel e "Personalizar Menu"); a busca rápida (Ctrl+K) só lê o resultado.
 */
export type ItemNavegacao = {
  secao: string;
  nome: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: Component<any> | any;
};

export const menuVisivel = writable<ItemNavegacao[]>([]);
