begin;
set local role service_role;
do $$
declare
  first_candidate public.candidates;
  repeated_candidate public.candidates;
  quote_token uuid;
  pool uuid;
  observation uuid;
begin
  select * into first_candidate from public.register_candidate('So11111111111111111111111111111111111111112','manual');
  select * into repeated_candidate from public.register_candidate('So11111111111111111111111111111111111111112','retry');
  if first_candidate.id <> repeated_candidate.id or repeated_candidate.origin <> 'manual' then
    raise exception 'Candidate deduplication failed';
  end if;
  insert into public.tokens(chain,address)
    values ('solana','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') returning id into quote_token;
  insert into public.pools(chain,address,protocol,base_token_id,quote_token_id)
    values ('solana','11111111111111111111111111111111','fixture',first_candidate.token_id,quote_token)
    returning id into pool;
  insert into public.market_observations(pool_id,source,source_event_id)
    values (pool,'fixture','one') returning id into observation;
  begin
    insert into public.market_observations(pool_id,source,source_event_id) values(pool,'fixture','one');
    raise exception 'Duplicate observation accepted';
  exception when unique_violation then null;
  end;
  insert into public.evaluations(candidate_id,token_id,pool_id,observation_id,request_key,rules_version,outcome,checks)
    values(first_candidate.id,first_candidate.token_id,pool,observation,gen_random_uuid(),'fixture','insufficient_data','[]');
  begin
    update public.market_observations set liquidity_usd=100 where id=observation;
    raise exception 'Historical observation modified';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
