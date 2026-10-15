This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase authentication and staff roles

The sign-in and sign-up screen uses Supabase Auth. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported), then apply [`supabase/migrations/202610060001_auth_profiles_and_staff_roles.sql`](./supabase/migrations/202610060001_auth_profiles_and_staff_roles.sql), [`supabase/migrations/202610070001_ensure_staff_profile.sql`](./supabase/migrations/202610070001_ensure_staff_profile.sql), [`supabase/migrations/202610070002_finance_workspace.sql`](./supabase/migrations/202610070002_finance_workspace.sql), [`supabase/migrations/202610080001_operational_admin_features.sql`](./supabase/migrations/202610080001_operational_admin_features.sql), [`supabase/migrations/202610080002_order_details.sql`](./supabase/migrations/202610080002_order_details.sql), and [`supabase/migrations/202610090001_flowchart_workflows.sql`](./supabase/migrations/202610090001_flowchart_workflows.sql) in order in the Supabase Dashboard SQL Editor. The database role `Admin` is displayed in the app as **Staf Admin (Operasional)**. New sign-ups remain `Staf Keuangan` by default; promote a trusted account to `Admin` using the SQL below. Operational admins can manage orders and trade documents, update tracking status, maintain customers and staff roles, verify received goods, build shipment manifests, print waybills, cancel shipments that are not manifested, and export orders. They can read but cannot edit Smart Pricing rates or margin settings. Cancellations, receiving verification, manifest creation, and changes to staff/customer records are recorded in `workflow_audit_logs`.

After a user has signed up, promote a trusted staff account to Admin in the SQL Editor:

```sql
update public.profiles
set role = 'Admin'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
```

Replace the example email with the account's email address. Do not let users choose Admin during sign-up. If email confirmation is enabled in Supabase Auth, the user must confirm their email before signing in.

## Finance workspace

The finance migration adds finance-only tables and row-level security for route cost rates, service multipliers, minimum margin, invoices, manual payments, courier COD remittances, and import/export customs costs. It also adds the `finance_approve_invoice` RPC used to approve or reject below-recommendation prices.

The Finance role can create and print invoices, record payment receipts and COD deposits manually, mark invoices as sent, and cancel an invoice only when no payment or COD remittance has been recorded. Cancellation preserves the invoice and writes an audit record. Sending email and payment-gateway processing are intentionally not integrated. Smart Pricing uses `route cost per kg × shipment weight × service multiplier × (1 + minimum margin)`. Set route rates before creating invoices; prices below the recommendation remain drafts until approved. Operational admins can view and select the same recommendation when creating an order; the selected amount is saved as `orders.quoted_price`. An order stores multiple item lines (name, quantity, and unit weight), sender description, recipient address, packing, and notes. Origin and destination cities remain separate routing inputs for Smart Pricing. Monthly reports export to CSV, which can be opened in Excel. Operational ETA warnings use service SLA estimates (Express 1 day, Reguler 3 days, Kargo 5 days) and are not a machine-learning or live-location prediction.

The flowchart workflow migration backfills customer master records from existing orders. Verify intake before creating a manifest; only shipments on the same route can be added, and a shipment cannot be cancelled after entering a manifest. Manifest creation advances those orders to **Dalam Perjalanan** and generates a printable surat jalan. Staff accounts are registered through Supabase Auth; the Admin screen can review staff and change roles, but cannot create Auth accounts or change its own role.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
