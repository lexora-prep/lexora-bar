do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'user_id'
      and is_nullable = 'NO'
  ) then
    alter table public.admin_notifications
      alter column user_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'message'
      and is_nullable = 'NO'
  ) then
    alter table public.admin_notifications
      alter column message drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'link'
      and is_nullable = 'NO'
  ) then
    alter table public.admin_notifications
      alter column link drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'is_read'
      and column_default is null
  ) then
    alter table public.admin_notifications
      alter column is_read set default false;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notifications'
      and column_name = 'read'
      and column_default is null
  ) then
    alter table public.admin_notifications
      alter column read set default false;
  end if;
end $$;

update public.admin_notifications
set read_at = now()
where read_at is null
  and (
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'admin_notifications'
        and column_name = 'is_read'
    )
  )
  and false;
