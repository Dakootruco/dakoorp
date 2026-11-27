begin;

create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (chain = 'solana'),
  address text not null check (address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  symbol text,
  name text,
  first_seen_at timestamptz not null default now(),
  unique (chain, address),
  unique (id, chain)
);

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (chain = 'solana'),
  address text not null check (address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  protocol text not null check (length(btrim(protocol)) > 0),
  base_token_id uuid not null,
  quote_token_id uuid not null,
  source_created_at timestamptz,
  first_seen_at timestamptz not null default now(),
  unique (chain, address),
  unique (id, base_token_id),
  check (base_token_id <> quote_token_id),
  foreign key (base_token_id, chain) references public.tokens(id, chain),
  foreign key (quote_token_id, chain) references public.tokens(id, chain)
);

create table public.market_observations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id),
  source text not null check (length(btrim(source)) > 0),
  source_event_id text not null check (length(btrim(source_event_id)) > 0),
  observed_at timestamptz,
  received_at timestamptz not null default now(),
  price_usd numeric check (price_usd >= 0),
  liquidity_usd numeric check (liquidity_usd >= 0),
  volume_5m_usd numeric check (volume_5m_usd >= 0),
  swaps_5m integer check (swaps_5m >= 0),
  wallets_5m integer check (wallets_5m >= 0),
  window_complete boolean not null default false,
  evidence jsonb not null default '{}' check (jsonb_typeof(evidence) = 'object'),
  unique (pool_id, source, source_event_id),
  unique (id, pool_id)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null unique references public.tokens(id),
  status text not null default 'detected' check (status in
    ('detected','insufficient_data','observing','investigating','review_required','discarded','simulation_eligible')),
  origin text not null check (length(btrim(origin)) > 0),
  created_at timestamptz not null default now(),
  unique (id, token_id)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  token_id uuid not null,
  pool_id uuid not null,
  observation_id uuid not null,
  execution_id uuid references public.executions(id),
  request_key uuid not null unique,
  rules_version text not null check (length(btrim(rules_version)) > 0),
  outcome text not null check (outcome in
    ('insufficient_data','observing','investigating','review_required','discarded','simulation_eligible')),
  checks jsonb not null check (jsonb_typeof(checks) = 'array'),
  evaluated_at timestamptz not null default now(),
  foreign key (candidate_id, token_id) references public.candidates(id, token_id),
  foreign key (pool_id, token_id) references public.pools(id, base_token_id),
  foreign key (observation_id, pool_id) references public.market_observations(id, pool_id)
);

create index tokens_seen_idx on public.tokens(first_seen_at desc, id);
create index pools_base_idx on public.pools(base_token_id);
create index pools_quote_idx on public.pools(quote_token_id);
create index observations_pool_time_idx on public.market_observations(pool_id, received_at desc, id);
create index candidates_created_idx on public.candidates(created_at desc, id);
create index candidates_status_idx on public.candidates(status, created_at desc, id);
create index evaluations_candidate_idx on public.evaluations(candidate_id, evaluated_at desc, id);
create index evaluations_pool_idx on public.evaluations(pool_id);
create index evaluations_observation_idx on public.evaluations(observation_id);
create index evaluations_execution_idx on public.evaluations(execution_id);

create trigger candidates_history after insert or update on public.candidates
  for each row execute function public.record_office_history();

do $$
declare table_name text;
begin
  foreach table_name in array array['tokens','pools','market_observations','candidates','evaluations'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert on public.%I to service_role', table_name);
  end loop;
end;
$$;
grant update (symbol, name) on public.tokens to service_role;
grant update (status) on public.candidates to service_role;

-- Atomic and retryable entry point for manually supplied candidates.
create function public.register_candidate(p_address text, p_origin text)
returns public.candidates
language plpgsql set search_path = '' as $$
declare selected_token_id uuid; candidate public.candidates;
begin
  insert into public.tokens(chain,address) values ('solana',p_address)
    on conflict (chain,address) do nothing;
  select id into strict selected_token_id from public.tokens where chain='solana' and address=p_address;
  insert into public.candidates(token_id,origin) values (selected_token_id,p_origin)
    on conflict (token_id) do nothing;
  select * into strict candidate from public.candidates where candidates.token_id=selected_token_id;
  return candidate;
end;
$$;
revoke all on function public.register_candidate(text,text) from public;
grant execute on function public.register_candidate(text,text) to service_role;
commit;
