begin;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  name text not null check (length(btrim(name)) > 0),
  role text not null check (length(btrim(role)) > 0),
  instructions text not null default '',
  configuration jsonb not null default '{}' check (jsonb_typeof(configuration) = 'object'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, department_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  assigned_agent_id uuid,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'waiting', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  foreign key (assigned_agent_id, department_id) references public.agents(id, department_id)
);

create table public.executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id),
  agent_id uuid not null references public.agents(id),
  request_key uuid not null unique,
  status text not null default 'running'
    check (status in ('running', 'waiting', 'succeeded', 'failed', 'cancelled')),
  task_snapshot jsonb not null,
  agent_snapshot jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  unique (id, task_id),
  check (finished_at is null or finished_at >= started_at),
  check ((status in ('succeeded', 'failed', 'cancelled')) = (finished_at is not null))
);

create unique index executions_one_active_per_task on public.executions(task_id)
  where status in ('running', 'waiting');

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  execution_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  revision integer not null check (revision > 0),
  content jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (execution_id, task_id) references public.executions(id, task_id),
  unique (task_id, name, revision)
);

create table public.office_history (
  id bigint generated always as identity primary key,
  entity text not null,
  record_id uuid not null,
  operation text not null check (operation in ('INSERT', 'UPDATE')),
  before_record jsonb,
  after_record jsonb not null,
  database_role text not null,
  recorded_at timestamptz not null default clock_timestamp()
);

create index agents_department_idx on public.agents(department_id);
create index tasks_department_idx on public.tasks(department_id, created_at desc);
create index tasks_agent_idx on public.tasks(assigned_agent_id);
create index executions_task_idx on public.executions(task_id, started_at desc);
create index executions_agent_idx on public.executions(agent_id, started_at desc);
create index deliverables_execution_idx on public.deliverables(execution_id);
create index office_history_record_idx on public.office_history(entity, record_id, id);

create function public.record_office_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.office_history(entity, record_id, operation, before_record, after_record, database_role)
  values (TG_TABLE_NAME, NEW.id, TG_OP,
    case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end,
    to_jsonb(NEW), coalesce(nullif(current_setting('role', true), 'none'), session_user));
  return NEW;
end;
$$;

create function public.prepare_execution() returns trigger
language plpgsql set search_path = '' as $$
declare
  task_row public.tasks%rowtype;
  agent_row public.agents%rowtype;
begin
  if TG_OP = 'INSERT' then
    select * into strict task_row from public.tasks where id = NEW.task_id for update;
    select * into strict agent_row from public.agents where id = NEW.agent_id for share;
    if task_row.assigned_agent_id is distinct from NEW.agent_id then
      raise exception 'Execution agent must be the assigned agent';
    end if;
    if not agent_row.enabled or task_row.status in ('completed', 'cancelled') then
      raise exception 'Task or agent cannot start an execution';
    end if;
    if NEW.status <> 'running' then
      raise exception 'New executions must start running';
    end if;
    NEW.task_snapshot := to_jsonb(task_row);
    NEW.agent_snapshot := to_jsonb(agent_row);
    NEW.started_at := clock_timestamp();
    NEW.finished_at := null;
  else
    if (to_jsonb(NEW) - array['status', 'finished_at', 'error_message'])
      is distinct from (to_jsonb(OLD) - array['status', 'finished_at', 'error_message']) then
      raise exception 'Execution identity and snapshots are immutable';
    end if;
    if OLD.status in ('succeeded', 'failed', 'cancelled') and NEW is distinct from OLD then
      raise exception 'Finished executions are immutable; create a new execution for retries';
    end if;
    if NEW.status in ('succeeded', 'failed', 'cancelled') then
      NEW.finished_at := coalesce(OLD.finished_at, clock_timestamp());
    else
      NEW.finished_at := null;
    end if;
  end if;
  return NEW;
end;
$$;

create trigger executions_prepare before insert or update on public.executions
  for each row execute function public.prepare_execution();

do $$
declare table_name text;
begin
  foreach table_name in array array['departments', 'agents', 'tasks', 'executions', 'deliverables'] loop
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.record_office_history()',
      table_name || '_history', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert on public.%I to service_role', table_name);
  end loop;
end;
$$;

grant update (name, description, archived_at) on public.departments to service_role;
grant update (name, role, instructions, configuration, enabled) on public.agents to service_role;
grant update (assigned_agent_id, title, description, status) on public.tasks to service_role;
grant update (status, error_message) on public.executions to service_role;
alter table public.office_history enable row level security;
revoke all on public.office_history from anon, authenticated, service_role;
grant select on public.office_history to service_role;
revoke all on function public.record_office_history() from public;
revoke all on function public.prepare_execution() from public;

-- Existing activity rows remain valid. Future publishers can link a run.
alter table public.activity_events add column execution_id uuid references public.executions(id);
create index activity_events_execution_idx on public.activity_events(execution_id);

commit;
