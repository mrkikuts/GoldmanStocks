-- Keep RLS enabled without granting blanket access. Migration 0005 adds the role-scoped
-- policies required by the website's boss account and the worker app.

do $$
declare t text;
begin
  foreach t in array array[
    'companies', 'workers', 'clients', 'projects', 'plants',
    'tasks', 'care_events', 'task_photos', 'weather_cache', 'offers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists "rootline authenticated access" on public.%I',
      t
    );
  end loop;
end $$;
