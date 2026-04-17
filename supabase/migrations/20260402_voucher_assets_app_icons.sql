alter table public.voucher_assets
  drop constraint if exists voucher_assets_asset_kind_check;

alter table public.voucher_assets
  add constraint voucher_assets_asset_kind_check
  check (asset_kind in ('logo', 'image', 'app_icon'));
