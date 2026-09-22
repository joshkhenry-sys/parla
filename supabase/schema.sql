-- Parla database foundation
-- Run this entire file once in:
-- Supabase Dashboard → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  native_language_code text,
  goal text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.learner_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete restrict,
  level text not null default 'A0'
    check (level in ('A0','A1','A2','B1','B2','C1','C2')),
  goal text,
  interests text[] not null default '{}',
  is_current boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, language_id)
);

create unique index if not exists learner_languages_one_current
on public.learner_languages (user_id)
where is_current = true;

create table if not exists public.learner_skills (
  id uuid primary key default gen_random_uuid(),
  learner_language_id uuid not null references public.learner_languages(id) on delete cascade,
  skill text not null
    check (skill in ('vocabulary','grammar','understanding','conversation','confidence')),
  mastery numeric(5,2) not null default 0
    check (mastery >= 0 and mastery <= 100),
  updated_at timestamptz not null default now(),
  unique (learner_language_id, skill)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  learner_language_id uuid not null references public.learner_languages(id) on delete cascade,
  title text not null,
  topic text,
  level text,
  content jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score numeric(5,2),
  responses jsonb not null default '{}',
  completed_at timestamptz not null default now()
);

create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_language_id uuid not null references public.learner_languages(id) on delete cascade,
  topic text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  corrections jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  learner_language_id uuid not null references public.learner_languages(id) on delete cascade,
  item_type text not null check (item_type in ('word','expression','grammar','conversation')),
  source_text text not null,
  target_text text,
  explanation text,
  mastery numeric(5,2) not null default 0
    check (mastery >= 0 and mastery <= 100),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.languages (code, name) values
  ('en', 'English'),
  ('es', 'Spanish'),
  ('pt', 'Portuguese'),
  ('fr', 'French'),
  ('it', 'Italian'),
  ('de', 'German'),
  ('ja', 'Japanese'),
  ('ko', 'Korean'),
  ('zh', 'Mandarin Chinese'),
  ('ar', 'Arabic')
on conflict (code) do update
set name = excluded.name;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.languages enable row level security;
alter table public.learner_languages enable row level security;
alter table public.learner_skills enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.conversation_sessions enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.review_items enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Languages are catalog data.
drop policy if exists "languages_read" on public.languages;
create policy "languages_read"
on public.languages for select to anon, authenticated
using (is_active = true);

-- Learner languages
drop policy if exists "learner_languages_own" on public.learner_languages;
create policy "learner_languages_own"
on public.learner_languages for select to authenticated
using (user_id = auth.uid());

drop policy if exists "learner_languages_insert_own" on public.learner_languages;
create policy "learner_languages_insert_own"
on public.learner_languages for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "learner_languages_update_own" on public.learner_languages;
create policy "learner_languages_update_own"
on public.learner_languages for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "learner_languages_delete_own" on public.learner_languages;
create policy "learner_languages_delete_own"
on public.learner_languages for delete to authenticated
using (user_id = auth.uid());

-- Skills
drop policy if exists "learner_skills_own" on public.learner_skills;
create policy "learner_skills_own"
on public.learner_skills for all to authenticated
using (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = learner_skills.learner_language_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = learner_skills.learner_language_id
      and ll.user_id = auth.uid()
  )
);

-- Lessons
drop policy if exists "lessons_own" on public.lessons;
create policy "lessons_own"
on public.lessons for all to authenticated
using (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = lessons.learner_language_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = lessons.learner_language_id
      and ll.user_id = auth.uid()
  )
);

-- Lesson attempts
drop policy if exists "lesson_attempts_own" on public.lesson_attempts;
create policy "lesson_attempts_own"
on public.lesson_attempts for all to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.learner_languages ll on ll.id = l.learner_language_id
    where l.id = lesson_attempts.lesson_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.lessons l
    join public.learner_languages ll on ll.id = l.learner_language_id
    where l.id = lesson_attempts.lesson_id
      and ll.user_id = auth.uid()
  )
);

-- Conversation sessions
drop policy if exists "conversation_sessions_own" on public.conversation_sessions;
create policy "conversation_sessions_own"
on public.conversation_sessions for all to authenticated
using (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = conversation_sessions.learner_language_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = conversation_sessions.learner_language_id
      and ll.user_id = auth.uid()
  )
);

-- Conversation messages
drop policy if exists "conversation_messages_own" on public.conversation_messages;
create policy "conversation_messages_own"
on public.conversation_messages for all to authenticated
using (
  exists (
    select 1
    from public.conversation_sessions cs
    join public.learner_languages ll on ll.id = cs.learner_language_id
    where cs.id = conversation_messages.conversation_session_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversation_sessions cs
    join public.learner_languages ll on ll.id = cs.learner_language_id
    where cs.id = conversation_messages.conversation_session_id
      and ll.user_id = auth.uid()
  )
);

-- Review items
drop policy if exists "review_items_own" on public.review_items;
create policy "review_items_own"
on public.review_items for all to authenticated
using (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = review_items.learner_language_id
      and ll.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.learner_languages ll
    where ll.id = review_items.learner_language_id
      and ll.user_id = auth.uid()
  )
);

-- Helpful updated_at function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists learner_languages_set_updated_at on public.learner_languages;
create trigger learner_languages_set_updated_at
before update on public.learner_languages
for each row execute procedure public.set_updated_at();

drop trigger if exists learner_skills_set_updated_at on public.learner_skills;
create trigger learner_skills_set_updated_at
before update on public.learner_skills
for each row execute procedure public.set_updated_at();

drop trigger if exists review_items_set_updated_at on public.review_items;
create trigger review_items_set_updated_at
before update on public.review_items
for each row execute procedure public.set_updated_at();
