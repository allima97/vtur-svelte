# VTUR Svelte

Nova versão do sistema VTUR migrada para SvelteKit + Flowbite-Svelte.

## Stack Tecnológica

- **Framework**: SvelteKit 2.x
- **UI Library**: Flowbite-Svelte
- **Estilização**: Tailwind CSS 3.x
- **Backend/Auth**: Supabase
- **Cache Local**: Dexie.js (IndexedDB)
- **API**: Hono (compatibilidade com APIs existentes)
- **Deploy**: Cloudflare Workers

## Estrutura

```
src/
├── lib/
│   ├── components/     # Componentes Svelte
│   ├── stores/         # Svelte Stores
│   ├── db/             # Dexie + Supabase
│   ├── api/            # Cliente API
│   ├── theme/          # Cores e tema
│   └── utils/          # Utilitários
├── routes/             # Rotas SvelteKit
└── app.html            # Template HTML
```

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Migração do VTUR Original

Esta é uma reescrita completa do sistema VTUR (Astro + React) para SvelteKit.
Mantém:
- Lógica de negócio (APIs Hono)
- Banco de dados Supabase
- Identidade visual (cores por módulo)
- Funcionalidades existentes

## Cores por Módulo

- **Clientes**: Azul (#2563eb)
- **Financeiro/Parâmetros**: Laranja (#f97316)
- **Vendas**: Verde (#16a34a)
