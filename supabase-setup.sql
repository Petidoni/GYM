-- Ejecuta en Supabase > SQL Editor > New query.
-- Una fila por usuario; RLS restringe lectura y escritura a su propietario.
create table if not exists public.gym_tracker_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{"exercises":[],"sessions":[]}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.gym_tracker_data enable row level security;
revoke all on public.gym_tracker_data from anon;
grant select, insert, update on public.gym_tracker_data to authenticated;
drop policy if exists gym_select_own on public.gym_tracker_data;
drop policy if exists gym_insert_own on public.gym_tracker_data;
drop policy if exists gym_update_own on public.gym_tracker_data;
create policy gym_select_own on public.gym_tracker_data for select to authenticated using ((select auth.uid())=user_id);
create policy gym_insert_own on public.gym_tracker_data for insert to authenticated with check ((select auth.uid())=user_id);
create policy gym_update_own on public.gym_tracker_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
