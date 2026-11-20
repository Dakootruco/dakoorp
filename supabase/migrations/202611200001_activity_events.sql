begin;
create table public.activity_events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  observed_at timestamptz not null,
  source text not null,
  status text not null check (status in ('success', 'error')),
  summary text not null
);
create index activity_events_created_at_idx on public.activity_events (created_at desc);
alter table public.activity_events enable row level security;
revoke all on public.activity_events from anon, authenticated;
grant all on public.activity_events to service_role;
commit;
