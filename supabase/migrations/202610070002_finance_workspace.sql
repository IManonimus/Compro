create table if not exists public.route_rates (
  id uuid primary key default gen_random_uuid(),
  origin_city text not null,
  destination_city text not null,
  base_cost_per_kg numeric(14, 2) not null check (base_cost_per_kg >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists route_rates_route_unique
  on public.route_rates (lower(origin_city), lower(destination_city));

create table if not exists public.service_multipliers (
  service_type text primary key,
  multiplier numeric(8, 4) not null check (multiplier > 0),
  updated_at timestamptz not null default now()
);

insert into public.service_multipliers (service_type, multiplier)
values ('Reguler', 1), ('Express', 1.5), ('Kargo', 1.2)
on conflict (service_type) do nothing;

create table if not exists public.finance_settings (
  id boolean primary key default true check (id),
  minimum_margin_percent numeric(7, 2) not null default 20
    check (minimum_margin_percent >= 0 and minimum_margin_percent <= 1000),
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (id, minimum_margin_percent)
values (true, 20)
on conflict (id) do nothing;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_resi text not null unique references public.orders (resi) on delete restrict,
  cost_amount numeric(14, 2) not null check (cost_amount >= 0),
  recommended_amount numeric(14, 2) not null check (recommended_amount >= 0),
  total_amount numeric(14, 2) not null check (total_amount > 0),
  due_date date not null,
  sent_at timestamptz,
  price_approval_status text not null default 'approved'
    check (price_approval_status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Prepaid', 'Transfer', 'Tunai', 'Lainnya')),
  received_at timestamptz not null default now(),
  reference text,
  note text,
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cod_remittances (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  courier_name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  received_at timestamptz not null default now(),
  note text,
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_costs (
  id uuid primary key default gen_random_uuid(),
  trade_document_id text not null unique,
  declared_value_idr numeric(14, 2) not null default 0 check (declared_value_idr >= 0),
  customs_duty_idr numeric(14, 2) not null default 0 check (customs_duty_idr >= 0),
  customs_fees_idr numeric(14, 2) not null default 0 check (customs_fees_idr >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.route_rates enable row level security;
alter table public.service_multipliers enable row level security;
alter table public.finance_settings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.cod_remittances enable row level security;
alter table public.trade_costs enable row level security;

revoke all on public.route_rates, public.service_multipliers, public.finance_settings,
  public.invoices, public.invoice_payments, public.cod_remittances, public.trade_costs
  from anon, authenticated;

grant select, insert, update, delete on public.route_rates, public.service_multipliers to authenticated;
grant select, insert, update on public.finance_settings to authenticated;
grant select, insert on public.invoices to authenticated;
grant update (due_date, sent_at) on public.invoices to authenticated;
grant select, insert on public.invoice_payments, public.cod_remittances to authenticated;
grant select, insert, update on public.trade_costs to authenticated;

drop policy if exists "Finance staff manage route rates" on public.route_rates;
create policy "Finance staff manage route rates"
  on public.route_rates for all to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan')
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff manage service multipliers" on public.service_multipliers;
create policy "Finance staff manage service multipliers"
  on public.service_multipliers for all to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan')
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff manage finance settings" on public.finance_settings;
create policy "Finance staff manage finance settings"
  on public.finance_settings for all to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan')
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff manage invoices" on public.invoices;
create policy "Finance staff manage invoices"
  on public.invoices for all to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan')
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff read invoice payments" on public.invoice_payments;
create policy "Finance staff read invoice payments"
  on public.invoice_payments for select to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan');
drop policy if exists "Finance staff record invoice payments" on public.invoice_payments;
create policy "Finance staff record invoice payments"
  on public.invoice_payments for insert to authenticated
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff read COD remittances" on public.cod_remittances;
create policy "Finance staff read COD remittances"
  on public.cod_remittances for select to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan');
drop policy if exists "Finance staff record COD remittances" on public.cod_remittances;
create policy "Finance staff record COD remittances"
  on public.cod_remittances for insert to authenticated
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

drop policy if exists "Finance staff manage trade costs" on public.trade_costs;
create policy "Finance staff manage trade costs"
  on public.trade_costs for all to authenticated
  using ((select public.current_staff_role()) = 'Staf Keuangan')
  with check ((select public.current_staff_role()) = 'Staf Keuangan');

create or replace function public.finance_approve_invoice(invoice_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select public.current_staff_role()), '') <> 'Staf Keuangan' then
    raise exception 'Only finance staff can review invoice pricing';
  end if;

  update public.invoices
  set
    price_approval_status = case when approve then 'approved' else 'rejected' end,
    approved_by = (select auth.uid()),
    approved_at = now()
  where id = invoice_id
    and price_approval_status = 'pending';

  if not found then
    raise exception 'Pending invoice was not found';
  end if;
end;
$$;

revoke all on function public.finance_approve_invoice(uuid, boolean) from public, anon;
grant execute on function public.finance_approve_invoice(uuid, boolean) to authenticated;

create or replace function public.finance_update_rejected_invoice_price(p_invoice_id uuid, p_total_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select public.current_staff_role()), '') <> 'Staf Keuangan' then
    raise exception 'Only finance staff can revise invoice pricing';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Invoice amount must be greater than zero';
  end if;

  update public.invoices
  set
    total_amount = p_total_amount,
    price_approval_status = case
      when p_total_amount < recommended_amount then 'pending'
      else 'approved'
    end,
    approved_by = case
      when p_total_amount < recommended_amount then null
      else (select auth.uid())
    end,
    approved_at = case
      when p_total_amount < recommended_amount then null
      else now()
    end
  where id = p_invoice_id
    and price_approval_status = 'rejected';

  if not found then
    raise exception 'Rejected invoice was not found';
  end if;
end;
$$;

revoke all on function public.finance_update_rejected_invoice_price(uuid, numeric) from public, anon;
grant execute on function public.finance_update_rejected_invoice_price(uuid, numeric) to authenticated;

notify pgrst, 'reload schema';
