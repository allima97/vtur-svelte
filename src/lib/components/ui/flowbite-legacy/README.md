# flowbite-legacy

Cópia fiel de componentes do **Flowbite-Svelte 0.48.6** (licença MIT, ver `LICENSE`), mantida no
projeto na Fase 4.2, quando o pacote `flowbite-svelte` foi atualizado para 1.x.

## Por quê

No 1.x estes componentes mudaram de aparência ou de comportamento:

- Select ganha uma `div` em volta; Textarea também;
- Checkbox, Radio e Toggle mudam classes, cores e espaçamento;
- Badge e Alert mudam as cores;
- Input muda o foco e o ícone;
- Button deixa de repassar `on:click` e muda as cores teal/orange/purple;
- Modal passa a usar `<dialog>` nativo (outro foco, outra rolagem, outro fundo);
- Dropdown e Tooltip passam a usar a Popover API (outro jeito de abrir e fechar).

Para as telas continuarem exatamente iguais, os wrappers de `ui/` usam estas cópias.
Do pacote 1.x o sistema usa hoje só a tabela (`SimpleTable` → `flowbite-svelte/Table.svelte`),
cuja saída é a mesma. Um teste em `src/lib/testing/guards.test.ts` impede importar o pacote 1.x
pelo índice.

## O que mudou em relação ao original

Só duas coisas:

1. caminhos de import (tudo nesta pasta);
2. um comentário `// @ts-nocheck` no início dos scripts (os originais são JavaScript sem tipos).

## Arquivos

- Componentes: Alert, Badge, Button, Checkbox, CloseButton, Dropdown, DropdownDivider,
  DropdownItem, Fileupload, Frame, Helper, Input, Label, Modal, Popper, Radio, Select, Textarea,
  Toggle, ToolbarButton, Tooltip, TransitionFrame, Wrapper; e `focusTrap.js`.
- `tailwind-classes-0.48.txt`: classes que o Tailwind gerava ao ler o pacote 0.48 inteiro
  (inclusive componentes não usados). O `src/app.css` lê este arquivo com `@source`, e assim o
  CSS final continua idêntico, byte a byte, ao de antes da atualização.

Dependências usadas pelas cópias: `tailwind-merge` e `@floating-ui/dom` (as mesmas que o 0.48 usava).
