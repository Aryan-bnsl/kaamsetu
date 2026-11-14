create type public.app_role as enum ('worker','contractor','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  is_demo boolean not null default false,
  skills text[] not null default '{}',
  locality text,
  availability text,
  expected_wage integer,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (display_name, skills, locality, availability, expected_wage) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "self assign worker/contractor" on public.user_roles for insert to authenticated with check (user_id = auth.uid() and role in ('worker','contractor'));

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_demo_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from public.profiles where id = _user_id), false)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, is_demo)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          coalesce(new.email like '%@demo.kaamsetu.app', false))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid,
  contractor_name text not null default '',
  is_demo boolean not null default false,
  skill text not null check (skill in ('painter','plumber','electrician')),
  workers_needed integer not null check (workers_needed between 1 and 50),
  locality text not null,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  wage integer not null check (wage > 0),
  wage_unit text not null check (wage_unit in ('day','hour')),
  description text not null default '',
  tools_by text not null check (tools_by in ('contractor','worker','shared')),
  payment_timing text not null check (payment_timing in ('same_day','end_of_work','weekly')),
  status text not null default 'open' check (status in ('open','filled','completed','cancelled')),
  terms_version integer not null default 1,
  demo_day_offset integer,
  created_at timestamptz not null default now()
);
create index on public.jobs (work_date);
grant select on public.jobs to anon, authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
-- Demo jobs visible to everyone; real jobs hidden from demo identities.
create policy "jobs public read" on public.jobs for select to anon using (true);
create policy "jobs auth read" on public.jobs for select to authenticated
  using (is_demo or not public.is_demo_user(auth.uid()) or contractor_id = auth.uid());

create table public.job_terms (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  version integer not null,
  terms jsonb not null,
  created_at timestamptz not null default now(),
  unique (job_id, version)
);
grant select on public.job_terms to anon, authenticated;
grant all on public.job_terms to service_role;
alter table public.job_terms enable row level security;
create policy "terms read" on public.job_terms for select to anon, authenticated using (true);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null,
  worker_name text not null default '',
  worker_skills text[] not null default '{}',
  worker_availability text,
  status text not null default 'interested' check (status in ('interested','confirmed','rejected','withdrawn','cancelled')),
  created_at timestamptz not null default now(),
  unique (job_id, worker_id)
);
grant select on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "app read own or job owner" on public.applications for select to authenticated
  using (worker_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.contractor_id = auth.uid()));

create table public.term_acceptances (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null,
  party text not null check (party in ('worker','contractor')),
  terms_version integer not null,
  accepted_at timestamptz not null default now(),
  unique (job_id, user_id, terms_version)
);
grant select on public.term_acceptances to authenticated;
grant all on public.term_acceptances to service_role;
alter table public.term_acceptances enable row level security;
create policy "acc read" on public.term_acceptances for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.contractor_id = auth.uid()));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  job_id uuid not null references public.jobs(id) on delete cascade,
  application_id uuid not null unique references public.applications(id) on delete cascade,
  worker_id uuid not null,
  contractor_id uuid not null,
  worker_name text not null default '',
  contractor_name text not null default '',
  terms_version integer not null,
  terms jsonb not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at timestamptz not null default now()
);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "booking parties" on public.bookings for select to authenticated using (worker_id = auth.uid() or contractor_id = auth.uid());

create table public.saved_jobs (
  user_id uuid not null,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
grant select, insert, delete on public.saved_jobs to authenticated;
grant all on public.saved_jobs to service_role;
alter table public.saved_jobs enable row level security;
create policy "saved own" on public.saved_jobs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text not null default '',
  job_id uuid references public.jobs(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update (read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.job_terms_json(j public.jobs)
returns jsonb language sql immutable as $$
  select jsonb_build_object('skill', j.skill, 'workers_needed', j.workers_needed, 'description', j.description,
    'work_date', j.work_date, 'start_time', to_char(j.start_time,'HH24:MI'), 'end_time', to_char(j.end_time,'HH24:MI'),
    'locality', j.locality, 'address', j.address, 'lat', j.lat, 'lng', j.lng,
    'wage', j.wage, 'wage_unit', j.wage_unit, 'payment_timing', j.payment_timing, 'tools_by', j.tools_by)
$$;

create or replace function public.notify(_user uuid, _kind text, _title text, _body text, _job uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, kind, title, body, job_id) values (_user, _kind, _title, _body, _job)
$$;
revoke execute on function public.notify(uuid,text,text,text,uuid) from public, anon, authenticated;

create or replace function public.validate_job_payload(p jsonb)
returns void language plpgsql as $$
begin
  if coalesce(p->>'skill','') not in ('painter','plumber','electrician') then raise exception 'invalid_skill'; end if;
  if (p->>'workers_needed')::int < 1 then raise exception 'invalid_workers'; end if;
  if coalesce(p->>'locality','') = '' then raise exception 'missing_locality'; end if;
  if p->>'lat' is null or p->>'lng' is null then raise exception 'missing_pin'; end if;
  if (p->>'work_date')::date < (now() at time zone 'Asia/Kolkata')::date then raise exception 'date_in_past'; end if;
  if (p->>'end_time')::time <= (p->>'start_time')::time then raise exception 'invalid_hours'; end if;
  if (p->>'wage')::int <= 0 then raise exception 'invalid_wage'; end if;
end $$;

create or replace function public.publish_job(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); jid uuid; j public.jobs; pname text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not public.has_role(uid, 'contractor') then raise exception 'not_contractor'; end if;
  perform public.validate_job_payload(p);
  select display_name into pname from profiles where id = uid;
  insert into jobs (contractor_id, contractor_name, is_demo, skill, workers_needed, locality, address, lat, lng, work_date, start_time, end_time, wage, wage_unit, description, tools_by, payment_timing)
  values (uid, coalesce(pname,''), public.is_demo_user(uid), p->>'skill', (p->>'workers_needed')::int, p->>'locality', coalesce(p->>'address',''),
    (p->>'lat')::float8, (p->>'lng')::float8, (p->>'work_date')::date, (p->>'start_time')::time, (p->>'end_time')::time,
    (p->>'wage')::int, p->>'wage_unit', coalesce(p->>'description',''), p->>'tools_by', p->>'payment_timing')
  returning * into j;
  insert into job_terms(job_id, version, terms) values (j.id, 1, public.job_terms_json(j));
  insert into term_acceptances(job_id, user_id, party, terms_version) values (j.id, uid, 'contractor', 1);
  return j.id;
end $$;

create or replace function public.update_job_terms(_job uuid, p jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); j public.jobs; a record;
begin
  select * into j from jobs where id = _job for update;
  if j.id is null or j.contractor_id is distinct from uid then raise exception 'not_owner'; end if;
  if j.status <> 'open' then raise exception 'job_not_open'; end if;
  if exists (select 1 from applications where job_id = _job and status = 'confirmed') then raise exception 'has_confirmed_bookings'; end if;
  perform public.validate_job_payload(p);
  update jobs set skill = p->>'skill', workers_needed = (p->>'workers_needed')::int, locality = p->>'locality', address = coalesce(p->>'address',''),
    lat = (p->>'lat')::float8, lng = (p->>'lng')::float8, work_date = (p->>'work_date')::date, start_time = (p->>'start_time')::time,
    end_time = (p->>'end_time')::time, wage = (p->>'wage')::int, wage_unit = p->>'wage_unit', description = coalesce(p->>'description',''),
    tools_by = p->>'tools_by', payment_timing = p->>'payment_timing', terms_version = terms_version + 1
  where id = _job returning * into j;
  insert into job_terms(job_id, version, terms) values (j.id, j.terms_version, public.job_terms_json(j));
  insert into term_acceptances(job_id, user_id, party, terms_version) values (j.id, uid, 'contractor', j.terms_version);
  for a in select worker_id from applications where job_id = _job and status = 'interested' loop
    perform public.notify(a.worker_id, 'terms_changed', 'Terms changed / शर्तें बदलीं', 'Please review and accept the new terms again.', _job);
  end loop;
  return j.terms_version;
end $$;

create or replace function public.apply_to_job(_job uuid, _version integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); j public.jobs; pr public.profiles; aid uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not public.has_role(uid, 'worker') then raise exception 'not_worker'; end if;
  select * into j from jobs where id = _job for update;
  if j.id is null then raise exception 'job_not_found'; end if;
  select * into pr from profiles where id = uid;
  if j.is_demo <> pr.is_demo then raise exception 'demo_isolation'; end if;
  if j.contractor_id = uid then raise exception 'own_job'; end if;
  if j.status <> 'open' then raise exception 'job_not_open'; end if;
  if j.terms_version <> _version then raise exception 'terms_outdated'; end if;
  if exists (select 1 from applications where job_id = _job and worker_id = uid) then raise exception 'duplicate_application'; end if;
  insert into applications(job_id, worker_id, worker_name, worker_skills, worker_availability)
    values (_job, uid, pr.display_name, pr.skills, pr.availability) returning id into aid;
  insert into term_acceptances(job_id, user_id, party, terms_version) values (_job, uid, 'worker', _version) on conflict do nothing;
  if j.contractor_id is not null then
    perform public.notify(j.contractor_id, 'application', 'New interest / नई रुचि', coalesce(pr.display_name,'A worker') || ' accepted the terms for your ' || j.skill || ' job.', _job);
  end if;
  return aid;
end $$;

create or replace function public.accept_current_terms(_job uuid, _version integer)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); j public.jobs;
begin
  select * into j from jobs where id = _job;
  if j.terms_version <> _version then raise exception 'terms_outdated'; end if;
  if not exists (select 1 from applications where job_id = _job and worker_id = uid and status = 'interested') then raise exception 'no_application'; end if;
  insert into term_acceptances(job_id, user_id, party, terms_version) values (_job, uid, 'worker', _version) on conflict do nothing;
  if j.contractor_id is not null then
    perform public.notify(j.contractor_id, 'reaccepted', 'Terms re-accepted / शर्तें फिर मानी', 'A worker accepted the updated terms.', _job);
  end if;
end $$;

create or replace function public.confirm_worker(_application uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.applications; j public.jobs; cnt int; bid uuid; ref text; t jsonb;
begin
  select * into a from applications where id = _application;
  if a.id is null then raise exception 'application_not_found'; end if;
  select * into j from jobs where id = a.job_id for update;
  if j.contractor_id is distinct from uid then raise exception 'not_owner'; end if;
  if j.status <> 'open' then raise exception 'job_not_open'; end if;
  if a.status <> 'interested' then raise exception 'invalid_application_state'; end if;
  if not exists (select 1 from term_acceptances where job_id = j.id and user_id = a.worker_id and terms_version = j.terms_version) then raise exception 'worker_terms_pending'; end if;
  if not exists (select 1 from term_acceptances where job_id = j.id and user_id = uid and terms_version = j.terms_version) then raise exception 'contractor_terms_pending'; end if;
  select count(*) into cnt from applications where job_id = j.id and status = 'confirmed';
  if cnt >= j.workers_needed then raise exception 'job_full'; end if;
  update applications set status = 'confirmed' where id = a.id;
  select terms into t from job_terms where job_id = j.id and version = j.terms_version;
  ref := 'KS-' || upper(substr(md5(random()::text || a.id::text), 1, 6));
  insert into bookings(reference, job_id, application_id, worker_id, contractor_id, worker_name, contractor_name, terms_version, terms)
    values (ref, j.id, a.id, a.worker_id, uid, a.worker_name, j.contractor_name, j.terms_version, t) returning id into bid;
  if cnt + 1 >= j.workers_needed then update jobs set status = 'filled' where id = j.id; end if;
  perform public.notify(a.worker_id, 'booking_confirmed', 'Baat Pakki! / बात पक्की!', 'Your booking ' || ref || ' is confirmed.', j.id);
  return bid;
end $$;

create or replace function public.set_application_status(_application uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.applications; j public.jobs;
begin
  select * into a from applications where id = _application;
  select * into j from jobs where id = a.job_id for update;
  if _status = 'withdrawn' then
    if a.worker_id <> uid or a.status <> 'interested' then raise exception 'invalid_state_change'; end if;
  elsif _status = 'rejected' then
    if j.contractor_id is distinct from uid or a.status <> 'interested' then raise exception 'invalid_state_change'; end if;
    perform public.notify(a.worker_id, 'rejected', 'Not selected / चयन नहीं हुआ', 'The contractor did not select you for this job.', j.id);
  elsif _status = 'cancelled' then
    if a.status <> 'confirmed' or (a.worker_id <> uid and j.contractor_id is distinct from uid) then raise exception 'invalid_state_change'; end if;
    update bookings set status = 'cancelled' where application_id = a.id;
    if j.status = 'filled' then update jobs set status = 'open' where id = j.id; end if;
    perform public.notify(case when uid = a.worker_id then j.contractor_id else a.worker_id end, 'booking_cancelled', 'Booking cancelled / बुकिंग रद्द', 'A booking for this job was cancelled.', j.id);
  else raise exception 'invalid_state_change'; end if;
  update applications set status = _status where id = a.id;
end $$;

create or replace function public.set_job_status(_job uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); j public.jobs; a record;
begin
  select * into j from jobs where id = _job for update;
  if j.contractor_id is distinct from uid then raise exception 'not_owner'; end if;
  if _status = 'cancelled' and j.status in ('open','filled') then
    update applications set status = 'cancelled' where job_id = _job and status in ('interested','confirmed');
    update bookings set status = 'cancelled' where job_id = _job and status = 'confirmed';
    for a in select distinct worker_id from applications where job_id = _job loop
      perform public.notify(a.worker_id, 'job_cancelled', 'Job cancelled / काम रद्द', 'The contractor cancelled this job.', _job);
    end loop;
  elsif _status = 'completed' and j.status in ('open','filled') then
    update bookings set status = 'completed' where job_id = _job and status = 'confirmed';
  elsif _status = 'open' and j.status = 'filled' then null;
  else raise exception 'invalid_state_change'; end if;
  update jobs set status = _status where id = _job;
end $$;

-- Demo helpers (service role only)
create or replace function public.refresh_demo_jobs(_contractor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update jobs set contractor_id = _contractor where is_demo and contractor_id is null;
  update jobs set work_date = (now() at time zone 'Asia/Kolkata')::date + demo_day_offset
    where is_demo and demo_day_offset is not null and work_date < (now() at time zone 'Asia/Kolkata')::date and status = 'open';
end $$;
revoke execute on function public.refresh_demo_jobs(uuid) from public, anon, authenticated;

insert into public.jobs (contractor_name, is_demo, skill, workers_needed, locality, address, lat, lng, work_date, start_time, end_time, wage, wage_unit, description, tools_by, payment_timing, demo_day_offset) values
('Demo Thekedar (fictional)', true, 'painter', 2, 'Vaishali', 'Near Sector 4 market (demo)', 28.6452, 77.3391, (now() at time zone 'Asia/Kolkata')::date + 1, '09:00','17:00', 900, 'day', 'Interior wall painting of a 2BHK flat', 'contractor', 'same_day', 1),
('Demo Thekedar (fictional)', true, 'plumber', 1, 'Indirapuram', 'Near Shipra area (demo)', 28.6412, 77.3712, (now() at time zone 'Asia/Kolkata')::date + 1, '10:00','14:00', 150, 'hour', 'Kitchen sink and bathroom tap leakage repair', 'worker', 'end_of_work', 1),
('Demo Thekedar (fictional)', true, 'electrician', 2, 'Vasundhara', 'Sector 13 (demo)', 28.6602, 77.3575, (now() at time zone 'Asia/Kolkata')::date + 2, '09:30','18:00', 1000, 'day', 'House wiring check and new switchboards', 'shared', 'same_day', 2),
('Demo Thekedar (fictional)', true, 'painter', 3, 'Raj Nagar', 'Near District Centre (demo)', 28.6849, 77.4437, (now() at time zone 'Asia/Kolkata')::date + 3, '08:00','16:00', 850, 'day', 'Exterior painting of a small shop', 'contractor', 'weekly', 3),
('Demo Thekedar (fictional)', true, 'plumber', 2, 'Kavi Nagar', 'Near Kavi Nagar market (demo)', 28.6718, 77.4503, (now() at time zone 'Asia/Kolkata')::date, '11:00','17:00', 800, 'day', 'New bathroom pipeline fitting', 'contractor', 'same_day', 0),
('Demo Thekedar (fictional)', true, 'electrician', 1, 'Crossings Republik', 'Tower area (demo)', 28.6290, 77.4375, (now() at time zone 'Asia/Kolkata')::date + 1, '10:00','13:00', 200, 'hour', 'Fan and light fitting in a flat', 'worker', 'end_of_work', 1),
('Demo Thekedar (fictional)', true, 'painter', 1, 'Indirapuram', 'Niti Khand side (demo)', 28.6380, 77.3650, (now() at time zone 'Asia/Kolkata')::date + 4, '09:00','18:00', 950, 'day', 'Texture paint on one living room wall', 'shared', 'end_of_work', 4),
('Demo Thekedar (fictional)', true, 'electrician', 2, 'Vaishali', 'Sector 5 (demo)', 28.6475, 77.3420, (now() at time zone 'Asia/Kolkata')::date + 5, '09:00','17:00', 1100, 'day', 'Office inverter and wiring installation', 'contractor', 'weekly', 5);

insert into public.job_terms (job_id, version, terms) select id, 1, public.job_terms_json(jobs) from public.jobs;