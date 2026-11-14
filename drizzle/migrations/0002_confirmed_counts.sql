create or replace function public.job_confirmed_counts()
returns table(job_id uuid, confirmed integer) language sql stable security definer set search_path = public as $$
  select job_id, count(*)::int from applications where status = 'confirmed' group by job_id
$$;
grant execute on function public.job_confirmed_counts() to anon, authenticated;