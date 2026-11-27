begin;
insert into public.departments(id,name) values('bac00000-0000-4000-8000-000000000099','Fixture');
insert into public.agents(department_id,name,role,configuration) values
 ('bac00000-0000-4000-8000-000000000099','Fixture','risk','{"executor":"rules-v1"}');
set local role service_role;
do $$ declare c public.candidates; j public.research_jobs; duplicate public.research_jobs; claim jsonb; report jsonb; begin
 c:=public.register_candidate('So11111111111111111111111111111111111111112','fixture');
 j:=public.enqueue_research(c.id,gen_random_uuid());
 duplicate:=public.enqueue_research(c.id,gen_random_uuid());
 if j.id<>duplicate.id then raise exception 'Active candidate duplicated'; end if;
 claim:=public.claim_research();
 if (claim->>'id')::uuid<>j.id or public.claim_research() is not null then raise exception 'Double claim'; end if;
 report:='{"rules_version":"pilot-v1","outcome":"insufficient_data","checks":[]}';
 if public.finish_research(j.id,gen_random_uuid(),report) then raise exception 'Invalid lease accepted'; end if;
 if not public.finish_research(j.id,(claim->>'lease_token')::uuid,report) then raise exception 'Finish failed'; end if;
 if public.finish_research(j.id,(claim->>'lease_token')::uuid,report) then raise exception 'Duplicate finish'; end if;
 if (select count(*) from public.research_reports where job_id=j.id)<>1 or (select status from public.tasks where id=j.task_id)<>'completed' then raise exception 'Non atomic report'; end if;
 j:=public.enqueue_research(c.id,gen_random_uuid()); claim:=public.claim_research();
 if not public.cancel_research(j.task_id) then raise exception 'Cancellation failed'; end if;
 if public.finish_research(j.id,(claim->>'lease_token')::uuid,report) then raise exception 'Late report accepted'; end if;
 j:=public.enqueue_research(c.id,gen_random_uuid()); claim:=public.claim_research();
 if not public.fail_research(j.id,(claim->>'lease_token')::uuid) or public.claim_research() is not null then raise exception 'Retry backoff ignored'; end if;
end $$;
reset role;
-- Simulate a worker lost three times and confirm the terminal state.
do $$ declare j public.research_jobs; claim jsonb; n int; begin
 select * into j from public.research_jobs where status='pending';
 for n in 1..2 loop
 update public.research_jobs set available_at=now()-interval '1 minute' where id=j.id;
 claim:=public.claim_research();
 update public.research_jobs set lease_until=now()-interval '1 minute' where id=j.id;
 end loop;
 perform public.claim_research();
 if (select status from public.research_jobs where id=j.id)<>'failed' then raise exception 'Exhausted job not failed'; end if;
 if (select status from public.tasks where id=j.task_id)<>'failed' then raise exception 'Task not terminal'; end if;
end $$;
rollback;
