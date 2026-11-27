begin;
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  deduplication_key text not null unique check (length(deduplication_key) between 1 and 200),
  kind text not null check (kind = 'source_check'),
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check ((status = 'running') = (lease_token is not null and lease_until is not null))
);
create index jobs_ready_idx on public.jobs(available_at, created_at, id) where status in ('pending','running');
alter table public.jobs enable row level security;
revoke all on public.jobs from anon, authenticated, service_role;
grant select on public.jobs to service_role;

create function public.enqueue_source_check(p_key text) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare result public.jobs;
begin
  insert into public.jobs(deduplication_key,kind) values(p_key,'source_check')
    on conflict (deduplication_key) do nothing;
  select * into strict result from public.jobs where deduplication_key=p_key;
  return result;
end;
$$;

create function public.claim_source_check() returns setof public.jobs
language plpgsql security definer set search_path = '' as $$
declare selected public.jobs;
begin
  -- Exhausted leases become terminal. Their failed check remains visible.
  for selected in select * from public.jobs where status='running'
    and lease_until < clock_timestamp() and attempts >= 3 for update skip locked loop
    update public.jobs set status='failed', finished_at=clock_timestamp(),
      lease_token=null, lease_until=null, last_error='Lease expired after maximum attempts'
      where id=selected.id;
    insert into public.activity_events(id,observed_at,source,status,summary)
      values(selected.id,clock_timestamp(),'dexscreener','error','La comprobación agotó sus intentos tras interrupciones.')
      on conflict (id) do nothing;
  end loop;
  select * into selected from public.jobs
    where attempts < 3 and (
      (status='pending' and available_at <= clock_timestamp())
      or (status='running' and lease_until < clock_timestamp())
    )
    order by available_at, created_at, id for update skip locked limit 1;
  if not found then return; end if;
  return query update public.jobs set status='running', attempts=attempts+1,
    lease_token=gen_random_uuid(), lease_until=clock_timestamp()+interval '90 seconds'
    where id=selected.id returning *;
end;
$$;

create function public.finish_source_check(p_id uuid, p_lease uuid, p_observed_at timestamptz, p_summary text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare selected public.jobs;
begin
  select * into selected from public.jobs where id=p_id for update;
  if not found or selected.status<>'running' or selected.lease_token is distinct from p_lease
    or selected.lease_until < clock_timestamp() then return false; end if;
  if p_observed_at is null or p_summary is null or length(p_summary)>2000 then
    raise exception 'Invalid check result';
  end if;
  insert into public.activity_events(id,observed_at,source,status,summary)
    values(p_id,p_observed_at,'dexscreener','success',p_summary) on conflict(id) do nothing;
  update public.jobs set status='succeeded',finished_at=clock_timestamp(),lease_token=null,lease_until=null
    where id=p_id;
  return true;
end;
$$;

create function public.fail_source_check(p_id uuid, p_lease uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare selected public.jobs;
begin
  select * into selected from public.jobs where id=p_id for update;
  if not found or selected.status<>'running' or selected.lease_token is distinct from p_lease
    or selected.lease_until < clock_timestamp() then return false; end if;
  update public.jobs set
    status=case when attempts>=3 then 'failed' else 'pending' end,
    available_at=clock_timestamp()+make_interval(secs => 10 * power(2,selected.attempts-1)::integer),
    finished_at=case when attempts>=3 then clock_timestamp() else null end,
    lease_token=null,lease_until=null,last_error='Source check failed'
    where id=p_id;
  if selected.attempts>=3 then
    insert into public.activity_events(id,observed_at,source,status,summary)
      values(p_id,clock_timestamp(),'dexscreener','error','No se pudo consultar DEX Screener tras tres intentos.')
      on conflict(id) do nothing;
  end if;
  return true;
end;
$$;

create function public.cancel_source_check(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.jobs set status='cancelled',finished_at=clock_timestamp(),lease_token=null,lease_until=null
    where id=p_id and status in ('pending','running');
  return found;
end;
$$;

revoke all on function public.enqueue_source_check(text) from public;
revoke all on function public.claim_source_check() from public;
revoke all on function public.finish_source_check(uuid,uuid,timestamptz,text) from public;
revoke all on function public.fail_source_check(uuid,uuid) from public;
revoke all on function public.cancel_source_check(uuid) from public;
grant execute on function public.enqueue_source_check(text), public.claim_source_check(),
  public.finish_source_check(uuid,uuid,timestamptz,text), public.fail_source_check(uuid,uuid),
  public.cancel_source_check(uuid) to service_role;
commit;
