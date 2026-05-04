create table if not exists public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  terms_accepted boolean not null default false,
  privacy_accepted boolean not null default false,
  refund_accepted boolean not null default false,
  platform_rules_accepted boolean not null default false,
  terms_version text not null default '2026-05-04',
  privacy_version text not null default '2026-05-04',
  refund_version text not null default '2026-05-04',
  selected_plan text,
  registration_mode text,
  user_agent text,
  ip_address text,
  accepted_at timestamptz not null default now()
);

create index if not exists user_legal_acceptances_user_id_idx
on public.user_legal_acceptances(user_id);

create index if not exists user_legal_acceptances_email_idx
on public.user_legal_acceptances(email);

create index if not exists user_legal_acceptances_accepted_at_idx
on public.user_legal_acceptances(accepted_at desc);

alter table public.user_legal_acceptances enable row level security;

drop policy if exists "Service role can manage legal acceptances" on public.user_legal_acceptances;

create policy "Service role can manage legal acceptances"
on public.user_legal_acceptances
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.feature_flags ("key", "value", "description", "created_at", "updated_at")
values (
  'registration_mode',
  '"private_beta"'::jsonb,
  'Controls account registration. Allowed values: private_beta, public, closed.',
  now(),
  now()
)
on conflict ("key") do update
set
  value = coalesce(public.feature_flags.value, '"private_beta"'::jsonb),
  description = 'Controls account registration. Allowed values: private_beta, public, closed.',
  updated_at = now();
