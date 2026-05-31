create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'general',
  title text not null default 'Notification',
  body text,
  link text,
  severity text not null default 'normal',
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_created_at_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_id_unread_idx
  on public.user_notifications (user_id, is_read, created_at desc);

create index if not exists user_notifications_type_idx
  on public.user_notifications (type);

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_logs_user_id_created_at_idx
  on public.user_activity_logs (user_id, created_at desc);

create index if not exists user_activity_logs_action_idx
  on public.user_activity_logs (action);

create index if not exists user_activity_logs_entity_idx
  on public.user_activity_logs (entity_type, entity_id);
