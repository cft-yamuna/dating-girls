create table if not exists public.control_state (
  id bigint primary key,
  video_state jsonb not null default '{"currentVideo": null}'::jsonb,
  user_state jsonb not null default '{"currentPerson": 1, "showThankYou": false}'::jsonb,
  interactions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.control_state (id)
values (1)
on conflict (id) do nothing;

alter table public.control_state enable row level security;

drop policy if exists "anon can read control_state" on public.control_state;
create policy "anon can read control_state"
on public.control_state
for select
to anon
using (true);

drop policy if exists "anon can write control_state" on public.control_state;
create policy "anon can write control_state"
on public.control_state
for all
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.control_state;
