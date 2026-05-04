-- Remove project-specific Supabase storage URLs from persisted CRM themes.
-- The application derives the public asset URL from storage_path and PUBLIC_SUPABASE_URL.

update public.user_message_template_themes
set asset_url = storage_path
where storage_path is not null
  and btrim(storage_path) <> ''
  and asset_url ~* '^https://[^/]+/storage/v1/object/public/message-template-themes/';
