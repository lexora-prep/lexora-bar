create table if not exists public.paddle_payment_records (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  email text not null,

  paddle_event_id text,
  paddle_customer_id text,
  paddle_subscription_id text,
  paddle_transaction_id text not null,
  paddle_price_id text,

  plan text default 'premium',
  status text default 'paid',

  currency text,
  amount_cents integer,
  tax_cents integer,
  total_cents integer,

  billing_period_starts_at timestamptz,
  billing_period_ends_at timestamptz,
  paid_at timestamptz,

  discount_id text,
  discount_code text,
  discount_amount text,

  invoice_url text,
  receipt_url text,

  raw_event jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint paddle_payment_records_transaction_unique unique (paddle_transaction_id)
);

create index if not exists paddle_payment_records_user_id_idx
  on public.paddle_payment_records (user_id);

create index if not exists paddle_payment_records_email_idx
  on public.paddle_payment_records (email);

create index if not exists paddle_payment_records_customer_id_idx
  on public.paddle_payment_records (paddle_customer_id);

create index if not exists paddle_payment_records_subscription_id_idx
  on public.paddle_payment_records (paddle_subscription_id);

create index if not exists paddle_payment_records_paid_at_idx
  on public.paddle_payment_records (paid_at desc);

create index if not exists paddle_payment_records_created_at_idx
  on public.paddle_payment_records (created_at desc);
