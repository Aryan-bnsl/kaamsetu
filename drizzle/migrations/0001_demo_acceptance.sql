create or replace function public.refresh_demo_jobs(_contractor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update jobs set contractor_id = _contractor where is_demo and contractor_id is null;
  update jobs set work_date = (now() at time zone 'Asia/Kolkata')::date + demo_day_offset
    where is_demo and demo_day_offset is not null and work_date < (now() at time zone 'Asia/Kolkata')::date and status = 'open';
  insert into term_acceptances(job_id, user_id, party, terms_version)
    select id, _contractor, 'contractor', terms_version from jobs where is_demo and contractor_id = _contractor
    on conflict do nothing;
end $$;
revoke execute on function public.refresh_demo_jobs(uuid) from public, anon, authenticated;