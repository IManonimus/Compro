-- Migration: 202610120002_fix_orders_status_check.sql
-- Fix check constraint on public.orders.status to permit both 'Dalam Perjalanan' and 'Dalam perjalanan',
-- as well as all operational and driver statuses.

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'Diterima',
      'Digudang',
      'Transit',
      'Dalam perjalanan',
      'Dalam Perjalanan',
      'Sedang Diantar',
      'Out for delivery',
      'Terkirim',
      'Gagal'
    )
  );

-- Re-apply admin_create_shipment_manifest
create or replace function public.admin_create_shipment_manifest(p_order_resis text[])
returns table (
  manifest_id uuid,
  manifest_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_order public.orders%rowtype;
  valid_count integer;
  new_manifest_id uuid;
  new_manifest_number text;
begin
  if coalesce((select public.current_staff_role()), '') <> 'Admin' then
    raise exception 'Only operational admins can create manifests';
  end if;

  if p_order_resis is null or cardinality(p_order_resis) = 0 then
    raise exception 'At least one shipment resi is required';
  end if;

  select *
  into first_order
  from public.orders
  where upper(resi) = upper(trim(p_order_resis[1]));

  if not found then
    raise exception 'First selected shipment was not found';
  end if;

  select count(*)
  into valid_count
  from public.orders
  where upper(resi) = any (
    select upper(trim(resi)) from unnest(p_order_resis) as selected(resi)
  )
    and not coalesce(cancelled, false)
    and manifest_id is null
    and intake_verified_at is not null
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

revoke all on function public.admin_create_shipment_manifest(text[]) from public, anon;
grant execute on function public.admin_create_shipment_manifest(text[]) to authenticated;
