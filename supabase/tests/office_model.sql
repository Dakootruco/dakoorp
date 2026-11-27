-- Run on a disposable database with migrations applied.
begin;
set local role service_role;

do $$
declare
  department uuid;
  agent_a uuid;
  agent_b uuid;
  task uuid;
  other_task uuid;
  execution uuid;
  history_count integer;
begin
  insert into public.departments(name) values ('Trading') returning id into department;
  insert into public.agents(department_id, name, role, instructions)
    values (department, 'Discovery', 'discovery', 'Original instructions') returning id into agent_a;
  insert into public.agents(department_id, name, role)
    values (department, 'Risk', 'risk') returning id into agent_b;
  insert into public.tasks(department_id, assigned_agent_id, title)
    values (department, agent_a, 'Investigate candidate') returning id into task;
  insert into public.tasks(department_id, title)
    values (department, 'Other task') returning id into other_task;

  insert into public.executions(task_id, agent_id, request_key)
    values (task, agent_a, gen_random_uuid()) returning id into execution;
  update public.agents set instructions = 'New instructions' where id = agent_a;
  update public.tasks set assigned_agent_id = agent_b where id = task;
  if (select agent_snapshot->>'instructions' from public.executions where id = execution) <> 'Original instructions' then
    raise exception 'Snapshot was modified';
  end if;
  select count(*) into history_count from public.office_history
    where entity = 'tasks' and record_id = task
      and before_record->>'assigned_agent_id' = agent_a::text
      and after_record->>'assigned_agent_id' = agent_b::text;
  if history_count <> 1 then raise exception 'Assignment history missing'; end if;

  begin
    insert into public.executions(task_id, agent_id, request_key)
      values (task, agent_b, gen_random_uuid());
    raise exception 'Duplicate active execution accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.deliverables(task_id, execution_id, name, revision, content)
      values (other_task, execution, 'report', 1, '{}');
    raise exception 'Wrong task deliverable accepted';
  exception when foreign_key_violation then null;
  end;

  insert into public.deliverables(task_id, execution_id, name, revision, content)
    values (task, execution, 'report', 1, '{"finding":"example"}');
  begin
    update public.deliverables set content = '{}' where execution_id = execution;
    raise exception 'Deliverable mutation accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.office_history where record_id = task;
    raise exception 'History deletion accepted';
  exception when insufficient_privilege then null;
  end;

  update public.executions set status = 'failed', error_message = 'Retry needed' where id = execution;
  if (select finished_at from public.executions where id = execution) is null then
    raise exception 'Finish timestamp missing';
  end if;
  insert into public.executions(task_id, agent_id, request_key)
    values (task, agent_b, gen_random_uuid());
end;
$$;
rollback;
