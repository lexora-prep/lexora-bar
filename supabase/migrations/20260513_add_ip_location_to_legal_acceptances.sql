alter table public.user_legal_acceptances
add column if not exists ip_country text,
add column if not exists ip_region text,
add column if not exists ip_city text,
add column if not exists ip_timezone text,
add column if not exists ip_latitude double precision,
add column if not exists ip_longitude double precision,
add column if not exists ip_lookup_provider text,
add column if not exists ip_lookup_at timestamptz;

create index if not exists user_legal_acceptances_ip_country_idx
on public.user_legal_acceptances(ip_country);

create index if not exists user_legal_acceptances_ip_city_idx
on public.user_legal_acceptances(ip_city);

create index if not exists user_legal_acceptances_ip_lookup_at_idx
on public.user_legal_acceptances(ip_lookup_at desc);
