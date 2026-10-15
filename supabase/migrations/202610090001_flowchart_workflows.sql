alter table public.orders
  add column if not exists cancelled boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles (id) on delete set null,
  add column if not exists intake_verified_at timestamptz,
  add column if not exists intake_verified_by uuid references public.profiles (id) on delete set null,
  add column if not exists intake_notes text not null default '',
  add column if not exists quoted_price numeric(14, 2) check (quoted_price >= 0),
  add column if not exists manifest_id uuid;

alter table public.invoices
  add column if not exists cancelled boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles (id) on delete set null;

revoke update, delete on public.invoices from public, anon, authenticated;
grant update (sent_at) on public.invoices to authenticated;

create table if not exists public.shipment_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_number text not null unique default (
    'SJ-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  origin_city text not null,
  destination_city text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_manifest_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_manifest_id_fkey
      foreign key (manifest_id) references public.shipment_manifests (id) on delete restrict;
  end if;
end;
$$;

revoke update, delete on public.orders from public, anon, authenticated;
grant update (
  customer_name,
  origin_city,
  destination_city,
  weight_kg,
  service_type,
  status,
  payment_type,
  quoted_price,
  sender_description,
  recipient_address,
  order_items,
  notes,
  packing
) on public.orders to authenticated;
drop policy if exists "Admins can delete orders" on public.orders;

create or replace function public.protect_order_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.cancelled then
    raise exception 'Cancelled shipments cannot be changed';
  end if;
  if old.manifest_id is not null and (
    old.customer_name is distinct from new.customer_name
    or old.origin_city is distinct from new.origin_city
    or old.destination_city is distinct from new.destination_city
    or old.weight_kg is distinct from new.weight_kg
    or old.service_type is distinct from new.service_type
    or old.payment_type is distinct from new.payment_type
    or old.quoted_price is distinct from new.quoted_price
    or old.sender_description is distinct from new.sender_description
    or old.recipient_address is distinct from new.recipient_address
    or old.order_items is distinct from new.order_items
    or old.notes is distinct from new.notes
    or old.packing is distinct from new.packing
  ) then
    raise exception 'Shipment details cannot be changed after manifest assignment';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_order_lifecycle on public.orders;
create trigger protect_order_lifecycle
  before update on public.orders
  for each row execute function public.protect_order_lifecycle();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_name_unique
  on public.customers (lower(name));

insert into public.customers (name)
select distinct trim(customer_name)
from public.orders
where nullif(trim(customer_name), '') is not null
on conflict (lower(name)) do nothing;

create table if not exists public.workflow_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'order_intake_verified',
    'order_cancelled',
    'shipment_manifest_created',
    'invoice_cancelled',
    'customer_created',
    'customer_updated',
    'customer_deleted',
    'staff_role_updated'
  )),
  entity_id text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_manifest_id_idx on public.orders (manifest_id);
create index if not exists workflow_audit_logs_created_at_idx on public.workflow_audit_logs (created_at desc);

alter table public.shipment_manifests enable row level security;
alter table public.customers enable row level security;
alter table public.workflow_audit_logs enable row level security;

revoke all on public.shipment_manifests, public.customers, public.workflow_audit_logs
  from anon, authenticated;
grant select on public.shipment_manifests to authenticated;
grant select on public.customers, public.workflow_audit_logs to authenticated;

drop policy if exists "Admins can read shipment manifests" on public.shipment_manifests;
create policy "Admins can read shipment manifests"
  on public.shipment_manifests for select to authenticated
  using ((select public.current_staff_role()) = 'Admin');

drop policy if exists "Admins can read customers" on public.customers;
create policy "Admins can read customers"
  on public.customers for select to authenticated
  using ((select public.current_staff_role()) = 'Admin');

drop policy if exists "Staff can read workflow audit logs" on public.workflow_audit_logs;
create policy "Staff can read workflow audit logs"
  on public.workflow_audit_logs for select to authenticated
  using ((select public.current_staff_role()) in ('Admin', 'Staf Keuangan'));

create or replace function public.admin_verify_order_intake(p_resi text, p_notes text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can verify received goods';
  end if;

  select *
  into order_row
  from public.orders
  where upper(resi) = upper(trim(p_resi))
  for update;

  if not found then
    raise exception 'Shipment was not found';
  end if;
  if order_row.cancelled then
    raise exception 'Cancelled shipments cannot be verified';
  end if;
  if order_row.manifest_id is not null then
    raise exception 'Shipment is already assigned to a manifest';
  end if;
  if order_row.intake_verified_at is not null then
    raise exception 'Shipment intake has already been verified';
  end if;

  update public.orders
  set intake_verified_at = now(),
      intake_verified_by = (select auth.uid()),
      intake_notes = coalesce(trim(p_notes), '')
  where id = order_row.id;

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    'order_intake_verified',
    order_row.resi::text,
    (select auth.uid()),
    jsonb_build_object('notes', coalesce(trim(p_notes), ''), 'previous_status', order_row.status)
  );
end;
$$;

create or replace function public.admin_cancel_order(p_resi text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can cancel shipments';
  end if;

  select *
  into order_row
  from public.orders
  where upper(resi) = upper(trim(p_resi))
  for update;

  if not found then
    raise exception 'Shipment was not found';
  end if;
  if order_row.cancelled then
    raise exception 'Shipment is already cancelled';
  end if;
  if order_row.manifest_id is not null then
    raise exception 'Shipment cannot be cancelled after it has entered a manifest';
  end if;

  update public.orders
  set cancelled = true,
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  where id = order_row.id;

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    'order_cancelled',
    order_row.resi::text,
    (select auth.uid()),
    jsonb_build_object('previous_status', order_row.status, 'manifest_id', order_row.manifest_id)
  );
end;
$$;

create or replace function public.admin_create_shipment_manifest(p_order_resis text[])
returns table (id uuid, manifest_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_count integer;
  valid_count integer;
  first_order public.orders%rowtype;
  new_manifest_id uuid;
  new_manifest_number text;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can create shipment manifests';
  end if;
  if p_order_resis is null or cardinality(p_order_resis) = 0 then
    raise exception 'Select at least one shipment for the manifest';
  end if;
  if cardinality(p_order_resis) <> (
    select count(distinct upper(trim(resi)))
    from unnest(p_order_resis) as selected(resi)
  ) then
    raise exception 'A shipment can only be selected once';
  end if;

  select count(*)
  into selected_count
  from public.orders
  where upper(resi) = any (
    select upper(trim(resi)) from unnest(p_order_resis) as selected(resi)
  );
  if selected_count <> cardinality(p_order_resis) then
    raise exception 'One or more shipments were not found';
  end if;

  perform 1
  from public.orders
  where upper(resi) = any (
    select upper(trim(resi)) from unnest(p_order_resis) as selected(resi)
  )
  order by resi
  for update;

  select *
  into first_order
  from public.orders
  where upper(resi) = upper(trim(p_order_resis[1]));

  select count(*)
  into valid_count
  from public.orders
  where upper(resi) = any (
    select upper(trim(resi)) from unnest(p_order_resis) as selected(resi)
  )
    and cancelled = false
    and intake_verified_at is not null
    and manifest_id is null
    and origin_city = first_order.origin_city
    and destination_city = first_order.destination_city;

  if valid_count <> cardinality(p_order_resis) then
    raise exception 'Every shipment must be received, verified, not cancelled, unassigned, and on the same route';
  end if;

  insert into public.shipment_manifests (origin_city, destination_city, created_by)
  values (first_order.origin_city, first_order.destination_city, (select auth.uid()))
  returning shipment_manifests.id, shipment_manifests.manifest_number
  into new_manifest_id, new_manifest_number;

  update public.orders
  set manifest_id = new_manifest_id,
      status = 'Dalam Perjalanan'
  where upper(resi) = any (
    select upper(trim(resi)) from unnest(p_order_resis) as selected(resi)
  );

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    'shipment_manifest_created',
    new_manifest_number,
    (select auth.uid()),
    jsonb_build_object(
      'order_resis', to_jsonb(p_order_resis),
      'origin_city', first_order.origin_city,
      'destination_city', first_order.destination_city
    )
  );

  return query select new_manifest_id, new_manifest_number;
end;
$$;

create or replace function public.finance_cancel_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Staf Keuangan' then
    raise exception 'Only finance staff can cancel invoices';
  end if;

  select *
  into invoice_row
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice was not found';
  end if;
  if invoice_row.cancelled then
    raise exception 'Invoice is already cancelled';
  end if;
  if exists (select 1 from public.invoice_payments where invoice_id = p_invoice_id)
     or exists (select 1 from public.cod_remittances where invoice_id = p_invoice_id) then
    raise exception 'Invoice cannot be cancelled while a payment or COD remittance exists';
  end if;

  update public.invoices
  set cancelled = true,
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  where id = p_invoice_id;

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    'invoice_cancelled',
    invoice_row.invoice_number,
    (select auth.uid()),
    jsonb_build_object(
      'order_resi', invoice_row.order_resi,
      'total_amount', invoice_row.total_amount,
      'was_sent', invoice_row.sent_at is not null
    )
  );
end;
$$;

create or replace function public.prevent_payment_for_cancelled_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_is_cancelled boolean;
begin
  select cancelled
  into invoice_is_cancelled
  from public.invoices
  where id = new.invoice_id
  for update;

  if invoice_is_cancelled then
    raise exception 'Payments cannot be recorded for a cancelled invoice';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_payment_for_cancelled_invoice on public.invoice_payments;
create trigger prevent_payment_for_cancelled_invoice
  before insert on public.invoice_payments
  for each row execute function public.prevent_payment_for_cancelled_invoice();

drop trigger if exists prevent_cod_for_cancelled_invoice on public.cod_remittances;
create trigger prevent_cod_for_cancelled_invoice
  before insert on public.cod_remittances
  for each row execute function public.prevent_payment_for_cancelled_invoice();

create or replace function public.prevent_cancelled_invoice_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cancelled then
    raise exception 'Cancelled invoices cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_cancelled_invoice_update on public.invoices;
create trigger prevent_cancelled_invoice_update
  before update on public.invoices
  for each row execute function public.prevent_cancelled_invoice_update();

create or replace function public.admin_save_customer(
  p_id uuid,
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  was_update boolean := p_id is not null;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can manage customers';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Customer name is required';
  end if;

  if was_update then
    update public.customers
    set name = trim(p_name),
        phone = coalesce(trim(p_phone), ''),
        email = coalesce(trim(p_email), ''),
        address = coalesce(trim(p_address), ''),
        notes = coalesce(trim(p_notes), ''),
        updated_at = now()
    where id = p_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'Customer was not found';
    end if;
  else
    insert into public.customers (name, phone, email, address, notes)
    values (trim(p_name), coalesce(trim(p_phone), ''), coalesce(trim(p_email), ''), coalesce(trim(p_address), ''), coalesce(trim(p_notes), ''))
    returning id into saved_id;
  end if;

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    case when was_update then 'customer_updated' else 'customer_created' end,
    saved_id::text,
    (select auth.uid()),
    jsonb_build_object('name', trim(p_name))
  );
  return saved_id;
end;
$$;

create or replace function public.admin_delete_customer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can manage customers';
  end if;
  delete from public.customers
  where id = p_id
  returning name into customer_name;
  if customer_name is null then
    raise exception 'Customer was not found';
  end if;

  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values ('customer_deleted', p_id::text, (select auth.uid()), jsonb_build_object('name', customer_name));
end;
$$;

create or replace function public.admin_list_staff()
returns table (id uuid, full_name text, role text, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can manage staff';
  end if;

  return query
  select profile.id, profile.full_name, profile.role, auth_user.email::text, profile.created_at
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  order by profile.created_at desc;
end;
$$;

create or replace function public.admin_update_staff_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can manage staff';
  end if;
  if p_role not in ('Admin', 'Staf Keuangan') then
    raise exception 'Invalid staff role';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role';
  end if;

  perform 1 from public.profiles where role = 'Admin' order by id for update;
  select role into target_role from public.profiles where id = p_user_id for update;
  if target_role is null then
    raise exception 'Staff profile was not found';
  end if;
  if target_role = 'Admin' and p_role <> 'Admin'
     and (select count(*) from public.profiles where role = 'Admin') <= 1 then
    raise exception 'At least one operational admin must remain';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  insert into public.workflow_audit_logs (event_type, entity_id, actor_id, details)
  values (
    'staff_role_updated',
    p_user_id::text,
    (select auth.uid()),
    jsonb_build_object('previous_role', target_role, 'new_role', p_role)
  );
end;
$$;

revoke all on function public.admin_verify_order_intake(text, text) from public, anon;
revoke all on function public.admin_cancel_order(text) from public, anon;
revoke all on function public.admin_create_shipment_manifest(text[]) from public, anon;
revoke all on function public.finance_cancel_invoice(uuid) from public, anon;
revoke all on function public.prevent_payment_for_cancelled_invoice() from public, anon, authenticated;
revoke all on function public.prevent_cancelled_invoice_update() from public, anon, authenticated;
revoke all on function public.protect_order_lifecycle() from public, anon, authenticated;
revoke all on function public.admin_save_customer(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.admin_delete_customer(uuid) from public, anon;
revoke all on function public.admin_list_staff() from public, anon;
revoke all on function public.admin_update_staff_role(uuid, text) from public, anon;

grant execute on function public.admin_verify_order_intake(text, text) to authenticated;
grant execute on function public.admin_cancel_order(text) to authenticated;
grant execute on function public.admin_create_shipment_manifest(text[]) to authenticated;
grant execute on function public.finance_cancel_invoice(uuid) to authenticated;
grant execute on function public.admin_save_customer(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_customer(uuid) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_update_staff_role(uuid, text) to authenticated;

create or replace function public.public_track_order(lookup_resi text)
returns table (
  resi text,
  customer_name text,
  origin_city text,
  destination_city text,
  weight_kg text,
  service_type text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.resi::text,
    o.customer_name::text,
    o.origin_city::text,
    o.destination_city::text,
    o.weight_kg::text,
    o.service_type::text,
    case when o.cancelled then 'Dibatalkan' else o.status::text end
  from public.orders as o
  where upper(o.resi) = upper(trim(lookup_resi))
  limit 1
$$;

notify pgrst, 'reload schema';
