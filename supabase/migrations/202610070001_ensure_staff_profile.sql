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
grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

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

create or replace function public.ensure_staff_profile()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_role text;
  profile_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(email, ''),
    'Staf Keuangan'
  )
  into profile_name
  from auth.users
  where id = current_user_id;

  if profile_name is null then
    raise exception 'Authenticated user was not found';
  end if;

  insert into public.profiles (id, full_name, role)
  values (current_user_id, profile_name, 'Staf Keuangan')
  on conflict (id) do nothing;

  select role
  into profile_role
  from public.profiles
  where id = current_user_id;

  return profile_role;
end;
$$;

revoke all on function public.ensure_staff_profile() from public, anon;
grant execute on function public.ensure_staff_profile() to authenticated;

notify pgrst, 'reload schema';
