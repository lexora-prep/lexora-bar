create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid()
);

alter table public.admin_notifications
  add column if not exists admin_id uuid,
  add column if not exists actor_admin_id uuid,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists href text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists read_at timestamptz;

update public.admin_notifications
set
  type = coalesce(type, 'system'),
  title = coalesce(title, 'Admin notification'),
  metadata = coalesce(metadata, '{}'::jsonb),
  is_read = coalesce(is_read, false),
  created_at = coalesce(created_at, now());

alter table public.admin_notifications
  alter column type set not null,
  alter column title set not null,
  alter column metadata set not null,
  alter column is_read set not null,
  alter column created_at set not null;

create index if not exists admin_notifications_admin_id_created_at_idx
  on public.admin_notifications (admin_id, created_at desc);

create index if not exists admin_notifications_admin_id_unread_idx
  on public.admin_notifications (admin_id, is_read);

create index if not exists admin_notifications_type_idx
  on public.admin_notifications (type);

alter table public.support_tickets
  add column if not exists assigned_admin_id uuid,
  add column if not exists assigned_admin_name text,
  add column if not exists last_user_message_at timestamptz,
  add column if not exists last_support_reply_at timestamptz,
  add column if not exists last_admin_read_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists sla_due_at timestamptz;

create index if not exists support_tickets_assigned_admin_id_idx
  on public.support_tickets (assigned_admin_id);

create index if not exists support_tickets_last_user_message_at_idx
  on public.support_tickets (last_user_message_at desc);

create index if not exists support_tickets_last_support_reply_at_idx
  on public.support_tickets (last_support_reply_at desc);

create index if not exists support_tickets_last_admin_read_at_idx
  on public.support_tickets (last_admin_read_at desc);

create index if not exists support_tickets_resolved_at_idx
  on public.support_tickets (resolved_at desc);

create index if not exists support_tickets_closed_at_idx
  on public.support_tickets (closed_at desc);

create index if not exists support_tickets_sla_due_at_idx
  on public.support_tickets (sla_due_at asc);
