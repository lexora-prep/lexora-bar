alter table public.admin_notifications
  add column if not exists severity text not null default 'normal';

alter table public.admin_notifications
  alter column severity set default 'normal';

update public.admin_notifications
set severity = 'normal'
where severity is null or trim(severity) = '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'data'
  ) then
    alter table public.admin_notifications
      alter column data drop not null;

    alter table public.admin_notifications
      alter column data set default '{}'::jsonb;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'body'
  ) then
    alter table public.admin_notifications
      alter column body set default '';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'metadata'
  ) then
    alter table public.admin_notifications
      alter column metadata drop not null;

    alter table public.admin_notifications
      alter column metadata set default '{}'::jsonb;
  end if;
end $$;

create index if not exists admin_notifications_admin_id_unread_idx
  on public.admin_notifications (admin_id, created_at desc)
  where read_at is null;

create index if not exists admin_notifications_admin_id_type_idx
  on public.admin_notifications (admin_id, type, created_at desc);

create index if not exists admin_notifications_admin_id_severity_idx
  on public.admin_notifications (admin_id, severity, created_at desc);
