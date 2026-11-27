begin;
-- Separate queue keeps the existing source-check worker compatible.
create table public.research_jobs (
 id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id),
 task_id uuid not null unique references public.tasks(id), execution_id uuid references public.executions(id),
 request_key uuid not null unique, status text not null default 'pending' check(status in ('pending','running','succeeded','failed','cancelled')),
 attempts int not null default 0 check(attempts between 0 and 3), available_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, created_at timestamptz not null default now(), finished_at timestamptz,
 check((status='running')=(lease_token is not null and lease_until is not null))
);
create unique index research_one_active on public.research_jobs(candidate_id) where status in ('pending','running');
create index research_ready on public.research_jobs(available_at) where status in ('pending','running');
create table public.research_reports (
 id uuid primary key default gen_random_uuid(), job_id uuid not null unique references public.research_jobs(id),
 candidate_id uuid not null references public.candidates(id), execution_id uuid not null references public.executions(id),
 report jsonb not null check(jsonb_typeof(report)='object'), created_at timestamptz not null default now()
);
create index research_reports_candidate on public.research_reports(candidate_id,created_at desc);
create table public.candidate_watches (
 candidate_id uuid primary key references public.candidates(id), enabled boolean not null default true,
 next_run_at timestamptz not null default now(), interval_minutes int not null default 15 check(interval_minutes between 5 and 1440)
);
create table public.research_settings (
 id boolean primary key default true check(id), discovery_enabled boolean not null default false,
 next_discovery_at timestamptz not null default now()
);
insert into public.research_settings default values;
create table public.research_alerts (
 id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id),
 job_id uuid not null unique references public.research_jobs(id), message text not null,
 created_at timestamptz not null default now(), acknowledged boolean not null default false
);
-- Existing draft profiles become deterministic executors, with no model calls.
update public.agents set enabled=true, configuration=configuration || '{"executor":"rules-v1","paid_ai":false}'::jsonb
 where id in ('bac00000-0000-4000-8000-000000000011','bac00000-0000-4000-8000-000000000012','bac00000-0000-4000-8000-000000000013');
create function public.enqueue_research(p_candidate uuid,p_key uuid,p_role text default 'risk') returns public.research_jobs
language plpgsql security definer set search_path='' as $$
declare j public.research_jobs; a public.agents; t uuid;
begin
 perform 1 from public.candidates where id=p_candidate for update;
 if not found then raise exception 'Candidate missing'; end if;
 select * into j from public.research_jobs where request_key=p_key;
 if found then
   if j.candidate_id<>p_candidate then raise exception 'Request key conflict'; end if;
   return j;
 end if;
 select * into j from public.research_jobs where candidate_id=p_candidate and status in ('pending','running');
 if found then return j; end if;
 if p_role not in ('discovery','risk','tracking') then raise exception 'Unsupported role'; end if;
 select * into strict a from public.agents where role=p_role and enabled and configuration->>'executor'='rules-v1' order by id limit 1;
 insert into public.tasks(department_id,assigned_agent_id,title,description)
 values(a.department_id,a.id,'Investigar candidato','Investigación determinista de '||p_candidate) returning id into t;
 insert into public.research_jobs(candidate_id,task_id,request_key) values(p_candidate,t,p_key) returning * into j;
 return j;
end $$;
create function public.claim_research() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.research_jobs; e uuid; addr text;
begin
 -- Close lost executions before attempting a new one.
 for j in select * from public.research_jobs where status='running' and lease_until<clock_timestamp() for update skip locked loop
   update public.executions set status='failed',error_message='Tiempo de ejecución agotado' where id=j.execution_id and status='running';
   update public.tasks set status=case when j.attempts>=3 then 'failed' else 'pending' end where id=j.task_id;
   update public.research_jobs set status=case when attempts>=3 then 'failed' else 'pending' end,
    finished_at=case when attempts>=3 then now() else null end, lease_token=null,lease_until=null where id=j.id;
 end loop;
 select * into j from public.research_jobs where status='pending' and available_at<=now() and attempts<3 order by created_at,id for update skip locked limit 1;
 if not found then return null; end if;
 update public.tasks set status='running' where id=j.task_id;
 insert into public.executions(task_id,agent_id,request_key) select id,assigned_agent_id,gen_random_uuid() from public.tasks where id=j.task_id returning id into e;
 update public.research_jobs set status='running',attempts=attempts+1,execution_id=e,lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '90 seconds' where id=j.id returning * into j;
 select t.address into addr from public.candidates c join public.tokens t on t.id=c.token_id where c.id=j.candidate_id;
 return to_jsonb(j)||jsonb_build_object('address',addr);
end $$;
create function public.finish_research(p_id uuid,p_lease uuid,p_report jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.research_jobs; previous jsonb; outcome text;
begin
 select * into j from public.research_jobs where id=p_id for update;
 if not found or j.status<>'running' or j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() then return false; end if;
 outcome:=p_report->>'outcome';
 if outcome is null or outcome not in ('insufficient_data','observing','review_required','discarded') or p_report->>'rules_version' is distinct from 'pilot-v1' or jsonb_typeof(p_report->'checks') is distinct from 'array' then raise exception 'Invalid report'; end if;
 select report into previous from public.research_reports where candidate_id=j.candidate_id order by created_at desc limit 1;
 insert into public.research_reports(job_id,candidate_id,execution_id,report) values(j.id,j.candidate_id,j.execution_id,p_report);
 insert into public.deliverables(task_id,execution_id,name,revision,content) values(j.task_id,j.execution_id,'Informe de investigación',1,p_report);
 update public.candidates set status=outcome where id=j.candidate_id;
 update public.executions set status='succeeded' where id=j.execution_id;
 update public.tasks set status='completed' where id=j.task_id;
 update public.research_jobs set status='succeeded',finished_at=now(),lease_token=null,lease_until=null where id=j.id;
 insert into public.activity_events(id,observed_at,source,status,summary,execution_id) values(gen_random_uuid(),now(),'research','success','Investigación completada · '||outcome,j.execution_id);
 if outcome in ('review_required','discarded') or (previous is not null and previous->>'outcome' is distinct from outcome) then
 insert into public.research_alerts(candidate_id,job_id,message) values(j.candidate_id,j.id,'Nueva evaluación · '||outcome);
 end if;
 return true;
end $$;
create function public.fail_research(p_id uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.research_jobs;
begin
 select * into j from public.research_jobs where id=p_id for update;
 if not found or j.status<>'running' or j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() then return false; end if;
 update public.executions set status='failed',error_message='Fuente no disponible o respuesta inválida' where id=j.execution_id;
 update public.tasks set status=case when j.attempts>=3 then 'failed' else 'pending' end where id=j.task_id;
 update public.research_jobs set status=case when attempts>=3 then 'failed' else 'pending' end,
 available_at=now()+interval '30 seconds',finished_at=case when attempts>=3 then now() else null end,lease_token=null,lease_until=null where id=j.id;
 return true;
end $$;
create function public.cancel_research(p_task uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.research_jobs;
begin
 select * into j from public.research_jobs where task_id=p_task for update;
 if not found or j.status not in ('pending','running') then return false; end if;
 update public.executions set status='cancelled' where id=j.execution_id and status='running';
 update public.tasks set status='cancelled' where id=p_task;
 update public.research_jobs set status='cancelled',finished_at=now(),lease_token=null,lease_until=null where id=j.id;
 return true;
end $$;
create function public.schedule_research() returns int
language plpgsql security definer set search_path='' as $$
declare w public.candidate_watches; n int:=0;
begin
 for w in select * from public.candidate_watches where enabled and next_run_at<=now() order by next_run_at for update skip locked limit 5 loop
 perform public.enqueue_research(w.candidate_id,gen_random_uuid(),'tracking');
 update public.candidate_watches set next_run_at=now()+make_interval(mins=>w.interval_minutes) where candidate_id=w.candidate_id;
 n:=n+1;
 end loop;
 return n;
end $$;
create function public.claim_discovery() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.research_settings set next_discovery_at=now()+interval '5 minutes' where id and discovery_enabled and next_discovery_at<=now();
 return found;
end $$;
do $$ declare t text; begin
 foreach t in array array['research_jobs','research_reports','candidate_watches','research_settings','research_alerts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated,service_role',t);
 execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;
grant insert,update on public.candidate_watches to service_role;
grant update(discovery_enabled) on public.research_settings to service_role;
grant update(acknowledged) on public.research_alerts to service_role;
revoke all on function public.enqueue_research(uuid,uuid,text),public.claim_research(),public.finish_research(uuid,uuid,jsonb),public.fail_research(uuid,uuid),public.cancel_research(uuid),public.schedule_research(),public.claim_discovery() from public;
grant execute on function public.enqueue_research(uuid,uuid,text),public.claim_research(),public.finish_research(uuid,uuid,jsonb),public.fail_research(uuid,uuid),public.cancel_research(uuid),public.schedule_research(),public.claim_discovery() to service_role;
commit;
