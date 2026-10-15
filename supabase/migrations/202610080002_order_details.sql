alter table public.orders
  add column if not exists sender_description text not null default '',
  add column if not exists recipient_address text not null default '',
  add column if not exists order_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(order_items) = 'array'),
  add column if not exists notes text not null default '',
  add column if not exists packing text not null default '';

notify pgrst, 'reload schema';
