alter table public.orders
  add column if not exists quoted_price numeric(14, 2)
  check (quoted_price >= 0);

grant select on public.route_rates, public.service_multipliers, public.finance_settings to authenticated;

drop policy if exists "Operational admins can read route rates" on public.route_rates;
create policy "Operational admins can read route rates"
  on public.route_rates
  for select
  to authenticated
  using ((select public.current_staff_role()) = 'Admin');

drop policy if exists "Operational admins can read service multipliers" on public.service_multipliers;
create policy "Operational admins can read service multipliers"
  on public.service_multipliers
  for select
  to authenticated
  using ((select public.current_staff_role()) = 'Admin');

drop policy if exists "Operational admins can read finance settings" on public.finance_settings;
create policy "Operational admins can read finance settings"
  on public.finance_settings
  for select
  to authenticated
  using ((select public.current_staff_role()) = 'Admin');

create table if not exists public.operational_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('order_deleted', 'order_status_changed')),
  entity_id text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.operational_audit_logs enable row level security;
revoke all on public.operational_audit_logs from anon, authenticated;
grant select on public.operational_audit_logs to authenticated;

drop policy if exists "Operational admins can read audit logs" on public.operational_audit_logs;
create policy "Operational admins can read audit logs"
  on public.operational_audit_logs
  for select
  to authenticated
  using ((select public.current_staff_role()) = 'Admin');

create or replace function public.log_order_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.operational_audit_logs (event_type, entity_id, actor_id, details)
  values ('order_deleted', old.resi::text, auth.uid(), to_jsonb(old));
  return old;
end;
$$;

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.operational_audit_logs (event_type, entity_id, actor_id, details)
    values (
      'order_status_changed',
      new.resi::text,
      auth.uid(),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_order_delete() from public, anon, authenticated;
revoke all on function public.log_order_status_change() from public, anon, authenticated;

drop trigger if exists log_order_delete_audit on public.orders;
create trigger log_order_delete_audit
  after delete on public.orders
  for each row execute function public.log_order_delete();

drop trigger if exists log_order_status_change_audit on public.orders;
create trigger log_order_status_change_audit
  after update of status on public.orders
  for each row execute function public.log_order_status_change();

notify pgrst, 'reload schema';
