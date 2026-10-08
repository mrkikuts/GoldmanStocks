-- Replace the temporary authenticated-wide demo policies with company/worker-scoped access.
-- Mobile clients use only the anon key and their own Supabase Auth session.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies', 'workers', 'clients', 'projects', 'plants',
    'tasks', 'care_events', 'task_photos', 'weather_cache', 'offers'
  ] loop
    execute format(
      'drop policy if exists "rootline authenticated access" on public.%I',
      table_name
    );
  end loop;
end $$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.app_current_worker_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select w.id
  from public.workers w
  where w.user_id = auth.uid()
    and w.app_role = 'worker'
  limit 1
$$;

create or replace function private.app_current_boss_company_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select w.company_id
  from public.workers w
  where w.user_id = auth.uid()
    and w.app_role = 'boss'
  limit 1
$$;

create or replace function private.app_is_company_boss(p_company_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_company_id is not null
    and p_company_id = private.app_current_boss_company_id()
$$;

create or replace function private.app_is_boss_for_project(p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.projects p
    join public.clients c on c.id = p.client_id
    where p.id = p_project_id
      and private.app_is_company_boss(c.company_id)
  )
$$;

create or replace function private.app_is_boss_for_client(p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and private.app_is_company_boss(c.company_id)
  )
$$;

create or replace function private.app_worker_can_access_project(p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.lead_worker_id = private.app_current_worker_id()
        or p.worker_ids @> array[private.app_current_worker_id()]
        or exists (
          select 1
          from public.tasks t
          where t.project_id = p.id
            and t.worker_id = private.app_current_worker_id()
        )
      )
  )
$$;

create or replace function private.app_is_boss_for_plant(p_plant_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.plants p
    where p.id = p_plant_id
      and private.app_is_boss_for_project(p.project_id)
  )
$$;

create or replace function private.app_is_assigned_task(p_task_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = p_task_id
      and t.worker_id = private.app_current_worker_id()
  )
$$;

create or replace function private.app_is_boss_for_offer(p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and private.app_is_company_boss(c.company_id)
  )
$$;

revoke all on function private.app_current_worker_id() from public;
revoke all on function private.app_current_boss_company_id() from public;
revoke all on function private.app_is_company_boss(text) from public;
revoke all on function private.app_is_boss_for_project(text) from public;
revoke all on function private.app_is_boss_for_client(text) from public;
revoke all on function private.app_worker_can_access_project(text) from public;
revoke all on function private.app_is_boss_for_plant(text) from public;
revoke all on function private.app_is_assigned_task(text) from public;
revoke all on function private.app_is_boss_for_offer(text) from public;
grant execute on function private.app_current_worker_id() to authenticated;
grant execute on function private.app_current_boss_company_id() to authenticated;
grant execute on function private.app_is_company_boss(text) to authenticated;
grant execute on function private.app_is_boss_for_project(text) to authenticated;
grant execute on function private.app_is_boss_for_client(text) to authenticated;
grant execute on function private.app_worker_can_access_project(text) to authenticated;
grant execute on function private.app_is_boss_for_plant(text) to authenticated;
grant execute on function private.app_is_assigned_task(text) to authenticated;
grant execute on function private.app_is_boss_for_offer(text) to authenticated;

create policy "boss manages own company"
on public.companies for all to authenticated
using (private.app_is_company_boss(id))
with check (private.app_is_company_boss(id));

create policy "boss manages company workers"
on public.workers for all to authenticated
using (private.app_is_company_boss(company_id))
with check (private.app_is_company_boss(company_id));
create policy "worker reads own profile"
on public.workers for select to authenticated
using (user_id = auth.uid() and app_role = 'worker');

create policy "boss manages company clients"
on public.clients for all to authenticated
using (private.app_is_company_boss(company_id))
with check (private.app_is_company_boss(company_id));

create policy "boss manages company projects"
on public.projects for all to authenticated
using (private.app_is_boss_for_project(id))
with check (private.app_is_boss_for_client(client_id));
create policy "worker reads assigned projects"
on public.projects for select to authenticated
using (private.app_worker_can_access_project(id));

create policy "boss manages company plants"
on public.plants for all to authenticated
using (private.app_is_boss_for_project(project_id))
with check (private.app_is_boss_for_project(project_id));
create policy "worker reads assigned project plants"
on public.plants for select to authenticated
using (private.app_worker_can_access_project(project_id));

create policy "boss manages company tasks"
on public.tasks for all to authenticated
using (private.app_is_boss_for_project(project_id))
with check (private.app_is_boss_for_project(project_id));
create policy "worker reads assigned tasks"
on public.tasks for select to authenticated
using (worker_id = private.app_current_worker_id());

create policy "boss manages company care events"
on public.care_events for all to authenticated
using (private.app_is_boss_for_plant(plant_id))
with check (private.app_is_boss_for_plant(plant_id));
create policy "worker reads own care events"
on public.care_events for select to authenticated
using (worker_id = private.app_current_worker_id());

create policy "boss reads company task photos"
on public.task_photos for select to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and private.app_is_boss_for_project(t.project_id)
  )
);
create policy "worker reads own task photos"
on public.task_photos for select to authenticated
using (private.app_is_assigned_task(task_id));

create policy "boss manages company offers"
on public.offers for all to authenticated
using (private.app_is_boss_for_offer(client_id))
with check (private.app_is_boss_for_offer(client_id));

create policy "company bosses use shared weather cache"
on public.weather_cache for all to authenticated
using (private.app_current_boss_company_id() is not null)
with check (private.app_current_boss_company_id() is not null);

create policy "worker uploads assigned task photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-photos'
  and split_part(name, '/', 1) = 'tasks'
  and private.app_is_assigned_task(split_part(name, '/', 2))
  and split_part(name, '/', 3) <> ''
  and split_part(name, '/', 4) = ''
);
create policy "worker deletes unrecorded task photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-photos'
  and split_part(name, '/', 1) = 'tasks'
  and private.app_is_assigned_task(split_part(name, '/', 2))
  and split_part(name, '/', 3) <> ''
  and split_part(name, '/', 4) = ''
  and not exists (
    select 1 from public.task_photos p where p.storage_path = name
  )
);

create or replace function public.complete_worker_task(
  p_task_id text,
  p_storage_path text,
  p_taken_at timestamptz,
  p_lat double precision,
  p_lng double precision
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_worker_id text;
  v_plant_id text;
  v_title text;
  v_photo_id uuid;
  v_care_date date;
begin
  v_worker_id := private.app_current_worker_id();
  if v_worker_id is null then
    raise exception 'No worker profile is linked to this account';
  end if;
  if p_taken_at is null
    or (p_lat is not null and (p_lat < -90 or p_lat > 90))
    or (p_lng is not null and (p_lng < -180 or p_lng > 180)) then
    raise exception 'Invalid photo timestamp or coordinates';
  end if;
  if split_part(p_storage_path, '/', 1) <> 'tasks'
    or split_part(p_storage_path, '/', 2) <> p_task_id
    or split_part(p_storage_path, '/', 3) = ''
    or split_part(p_storage_path, '/', 4) <> '' then
    raise exception 'Photo path does not belong to this task';
  end if;

  select t.plant_id, t.title
  into v_plant_id, v_title
  from public.tasks t
  where t.id = p_task_id
    and t.worker_id = v_worker_id
    and t.status = 'planned';
  if not found then
    raise exception 'Task is not assigned or is no longer planned';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'task-photos' and o.name = p_storage_path
  ) then
    raise exception 'Photo upload was not found';
  end if;

  insert into public.task_photos (task_id, storage_path, taken_at, lat, lng)
  values (p_task_id, p_storage_path, p_taken_at, p_lat, p_lng)
  returning id into v_photo_id;

  update public.tasks set status = 'done' where id = p_task_id;
  if v_plant_id is not null then
    v_care_date := p_taken_at::date;
    insert into public.care_events (plant_id, task_id, worker_id, date, action, done)
    values (v_plant_id, p_task_id, v_worker_id, v_care_date, v_title, true);
    update public.plants set last_care = v_care_date where id = v_plant_id;
  end if;

  return v_photo_id;
end
$$;

create or replace function public.set_worker_task_status(p_task_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_worker_id text;
begin
  v_worker_id := private.app_current_worker_id();
  if v_worker_id is null then
    raise exception 'No worker profile is linked to this account';
  end if;
  if p_status is null or p_status not in ('planned', 'skipped') then
    raise exception 'Unsupported worker task status';
  end if;

  update public.tasks
  set status = p_status
  where id = p_task_id
    and worker_id = v_worker_id
    and status in ('planned', 'skipped');
  if not found then
    raise exception 'Task is not assigned or is no longer available';
  end if;
end
$$;

revoke all on function public.complete_worker_task(text, text, timestamptz, double precision, double precision) from public;
revoke all on function public.set_worker_task_status(text, text) from public;
grant execute on function public.complete_worker_task(text, text, timestamptz, double precision, double precision) to authenticated;
grant execute on function public.set_worker_task_status(text, text) to authenticated;

notify pgrst, 'reload schema';
