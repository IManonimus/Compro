create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Staf Keuangan',
  role text not null default 'Staf Keuangan'
    check (role in ('Admin', 'Staf Keuangan')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists role text;

do $$
declare
  role_constraint record;
begin
  for role_constraint in
    select constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as role_column
      on role_column.attrelid = constraint_row.conrelid
      and role_column.attname = 'role'
    where constraint_row.conrelid = 'public.profiles'::regclass
      and constraint_row.contype = 'c'
      and role_column.attnum = any(constraint_row.conkey)
  loop
    execute format('alter table public.profiles drop constraint %I', role_constraint.conname);
  end loop;
end;
$$;

update public.profiles as profile
set
  full_name = coalesce(
    nullif(profile.full_name, ''),
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_user.email, ''),
    'Staf Keuangan'
  ),
  role = case
    when lower(coalesce(profile.role, '')) = 'admin' then 'Admin'
    else 'Staf Keuangan'
  end
from auth.users as auth_user
where auth_user.id = profile.id;

alter table public.profiles
  alter column full_name set default 'Staf Keuangan',
  alter column full_name set not null,
  alter column role set default 'Staf Keuangan',
  alter column role set not null;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('Admin', 'Staf Keuangan'));

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.create_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.email, ''),
      'Staf Keuangan'
    ),
    'Staf Keuangan'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_staff_profile_after_signup on auth.users;
create trigger create_staff_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_staff_profile();

insert into public.profiles (id, full_name, role)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), nullif(email, ''), 'Staf Keuangan'),
  'Staf Keuangan'
from auth.users
on conflict (id) do nothing;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
$$;

revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;

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
    o.status::text
  from public.orders as o
  where upper(o.resi) = upper(trim(lookup_resi))
  limit 1
$$;

revoke all on function public.public_track_order(text) from public;
grant execute on function public.public_track_order(text) to anon, authenticated;

grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

alter table public.orders enable row level security;
alter table public.trade_documents enable row level security;

create policy "Authenticated staff can access orders"
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);
create policy "Authenticated staff can read orders"
  on public.orders
  for select
  to authenticated
  using (true);
create policy "Authenticated staff access orders"
  on public.orders
  as restrictive
  for select
  to public
  using ((select auth.uid()) is not null);
create policy "Admins can insert orders"
  on public.orders
  as restrictive
  for insert
  to public
  with check ((select public.current_staff_role()) = 'Admin');
create policy "Admins can update orders"
  on public.orders
  as restrictive
  for update
  to public
  using ((select public.current_staff_role()) = 'Admin')
  with check ((select public.current_staff_role()) = 'Admin');
create policy "Admins can delete orders"
  on public.orders
  as restrictive
  for delete
  to public
  using ((select public.current_staff_role()) = 'Admin');

create policy "Authenticated staff can access trade documents"
  on public.trade_documents
  for all
  to authenticated
  using (true)
  with check (true);
create policy "Authenticated staff can read trade documents"
  on public.trade_documents
  for select
  to authenticated
  using (true);
create policy "Authenticated staff access trade documents"
  on public.trade_documents
  as restrictive
  for select
  to public
  using ((select auth.uid()) is not null);
create policy "Admins can insert trade documents"
  on public.trade_documents
  as restrictive
  for insert
  to public
  with check ((select public.current_staff_role()) = 'Admin');
create policy "Admins can update trade documents"
  on public.trade_documents
  as restrictive
  for update
  to public
  using ((select public.current_staff_role()) = 'Admin')
  with check ((select public.current_staff_role()) = 'Admin');
create policy "Admins can delete trade documents"
  on public.trade_documents
  as restrictive
  for delete
  to public
  using ((select public.current_staff_role()) = 'Admin');
