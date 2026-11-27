begin;
set local role service_role;
do $$
declare job public.jobs; retry public.jobs; claimed public.jobs; result boolean;
begin
  select * into job from public.enqueue_source_check('fixture-job');
  select * into retry from public.enqueue_source_check('fixture-job');
  if job.id<>retry.id then raise exception 'Deduplication failed'; end if;
  select * into claimed from public.claim_source_check();
  if claimed.id<>job.id or claimed.attempts<>1 then raise exception 'Claim failed'; end if;
  if exists(select 1 from public.claim_source_check()) then raise exception 'Claimed active job twice'; end if;
  if public.finish_source_check(job.id,gen_random_uuid(),now(),'wrong lease') then raise exception 'Invalid lease accepted'; end if;
  if not public.finish_source_check(job.id,claimed.lease_token,now(),'fixture success') then raise exception 'Finish failed'; end if;
  if public.finish_source_check(job.id,claimed.lease_token,now(),'duplicate') then raise exception 'Completed twice'; end if;
  if (select count(*) from public.activity_events where id=job.id)<>1 then raise exception 'Duplicate activity'; end if;

  select * into job from public.enqueue_source_check('fixture-cancel');
  select * into claimed from public.claim_source_check();
  result:=public.cancel_source_check(job.id);
  if not result then raise exception 'Cancel failed'; end if;
  if public.finish_source_check(job.id,claimed.lease_token,now(),'late result') then raise exception 'Cancelled result accepted'; end if;

  select * into job from public.enqueue_source_check('fixture-retry');
  select * into claimed from public.claim_source_check();
  result:=public.fail_source_check(job.id,claimed.lease_token);
  if not result then raise exception 'Failure not saved'; end if;
  if (select status from public.jobs where id=job.id)<>'pending' then raise exception 'Retry missing'; end if;
  if exists(select 1 from public.claim_source_check()) then raise exception 'Backoff ignored'; end if;
end;
$$;
rollback;
