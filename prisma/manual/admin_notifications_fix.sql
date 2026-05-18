create extension if not exists pgcrypto;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  actor_admin_id uuid null,
  type text not null default 'support_assignment',
  title text not null,
  body text not null,
  href text null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.admin_notifications
  add column if not exists admin_id uuid;

alter table public.admin_notifications
  add column if not exists actor_admin_id uuid;

alter table public.admin_notifications
  add column if not exists type text not null default 'support_assignment';

alter table public.admin_notifications
  add column if not exists title text not null default 'Notification';

alter table public.admin_notifications
  add column if not exists body text not null default '';

alter table public.admin_notifications
  add column if not exists href text;

alter table public.admin_notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.admin_notifications
  add column if not exists read_at timestamptz;

alter table public.admin_notifications
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_admin_id_profiles_id_fk'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_admin_id_profiles_id_fk
      foreign key (admin_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_actor_admin_id_profiles_id_fk'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_actor_admin_id_profiles_id_fk
      foreign key (actor_admin_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists admin_notifications_admin_id_created_at_idx
  on public.admin_notifications (admin_id, created_at desc);

create index if not exists admin_notifications_admin_id_read_at_idx
  on public.admin_notifications (admin_id, read_at);

create index if not exists admin_notifications_type_idx
  on public.admin_notifications (type);
