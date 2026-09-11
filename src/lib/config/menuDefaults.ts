// Itens do menu que ficam ocultos por padrão para quem nunca personalizou o
// menu (nenhuma preferência salva no servidor nem em localStorage ainda).
// O usuário pode reabilitá-los a qualquer momento em "Personalizar Menu"
// (/perfil/personalizar) ou na aba "Personalizar Menu" de Parâmetros.
//
// Módulo neutro (não é `$lib/server/*`) para poder ser importado tanto pelo
// endpoint `/api/v1/menu/prefs` (contexto de servidor) quanto por
// Sidebar.svelte e pelas páginas de configuração (contexto de cliente).
export const DEFAULT_HIDDEN_MENU_KEYS: readonly string[] = [
  'tarefas',
  'recados',
  'controle_sac',
  'campanhas',
  'documentos',
  'consultoria_online',
  'orcamentos'
];
