alter table public.profiles
add column if not exists last_ip_address text,
add column if not exists last_country text,
add column if not exists last_region text,
add column if not exists last_city text,
add column if not exists last_timezone text,
add column if not exists last_latitude double precision,
add column if not exists last_longitude double precision,
add column if not exists last_user_agent text,
add column if not exists last_activity_source text;

create index if not exists profiles_last_active_at_idx
on public.profiles(last_active_at desc);

create index if not exists profiles_last_login_at_idx
on public.profiles(last_login_at desc);

create index if not exists profiles_last_country_idx
on public.profiles(last_country);

create index if not exists profiles_last_city_idx
on public.profiles(last_city);
