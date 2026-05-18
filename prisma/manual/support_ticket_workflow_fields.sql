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
