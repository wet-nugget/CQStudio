-- All application schema changes belong in migrations. No credentials in SQL.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create type public.member_role as enum ('admin', 'member');
create type public.member_status as enum ('approved', 'disabled', 'rejected');
create type public.quiz_status as enum ('draft', 'pending', 'published', 'rejected');
create type public.file_state as enum ('pending', 'ready', 'deleting');

create function private.valid_limits(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object'
    and (select count(*) = 23 from jsonb_object_keys(value))
    and not exists (
      select 1 from jsonb_each(value) e where e.key not in (
        'members','admins','open_invites','invite_days','total_bytes','member_bytes',
        'file_bytes','html_bytes','classes','lessons_per_class','notes_per_class',
        'quizzes_per_class','questions_per_quiz','lesson_bytes','note_bytes',
        'folder_depth','files_per_folder','pending_submissions','saved_files',
        'chat_days','activity_days','notification_days','full_attempts'
      ) or jsonb_typeof(e.value) <> 'number' or e.value::text !~ '^[1-9][0-9]{0,12}$'
    )
    and (value->>'file_bytes')::bigint <= 52428800
    and (value->>'html_bytes')::bigint <= 52428800
    and (value->>'admins')::bigint <= (value->>'members')::bigint
    and (value->>'folder_depth')::bigint <= 20
    and (value->>'questions_per_quiz')::bigint <= 1000;
$$;

create table public.workspace_settings (
  id boolean primary key default true check (id),
  name text not null default 'CQStudio' check (char_length(name) between 1 and 80),
  policy_version text not null default '2026-11-01' check (char_length(policy_version) between 1 and 50),
  limits jsonb not null default '{"members":30,"admins":5,"open_invites":10,"invite_days":7,"total_bytes":943718400,"member_bytes":104857600,"file_bytes":20971520,"html_bytes":20971520,"classes":30,"lessons_per_class":100,"notes_per_class":100,"quizzes_per_class":30,"questions_per_quiz":200,"lesson_bytes":204800,"note_bytes":51200,"folder_depth":5,"files_per_folder":300,"pending_submissions":5,"saved_files":200,"chat_days":90,"activity_days":60,"notification_days":30,"full_attempts":30}'::jsonb check (private.valid_limits(limits)),
  updated_at timestamptz not null default now()
);
insert into public.workspace_settings (id) values (true);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar smallint not null default 0 check (avatar between 0 and 29),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  role public.member_role not null default 'member',
  status public.member_status not null default 'approved',
  policy_version text not null,
  policy_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.member_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
create index invitations_email_idx on public.invitations (email);
create index invitations_open_idx on public.invitations (expires_at) where accepted_at is null and revoked_at is null;

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.folders(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120 and name !~ '[/\\]'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id),
  unique nulls not distinct (parent_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  teacher_subject text not null default '' check (char_length(teacher_subject) <= 120),
  description text not null default '' check (octet_length(description) <= 10000),
  icon text not null default 'book' check (icon in ('book','flask','globe','code','leaf','calculator','palette','language')),
  folder_id uuid unique references public.folders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  markdown text not null check (octet_length(markdown) <= 1048576),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (octet_length(body) <= 1048576),
  links jsonb not null default '[]' check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 30),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete restrict,
  path text not null unique,
  name text not null check (char_length(name) between 1 and 200 and name !~ '[/\\]'),
  mime text not null,
  size bigint not null check (size > 0 and size <= 52428800),
  description text not null default '' check (char_length(description) <= 2000),
  purpose text not null default 'vault' check (purpose in ('vault','html_quiz')),
  state public.file_state not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  ready_at timestamptz
);

create table public.saved_files (
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, file_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  created_by uuid references public.profiles(id) on delete set null,
  published_version_id uuid,
  created_at timestamptz not null default now()
);

create table public.quiz_versions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  version integer not null check (version > 0),
  kind text not null check (kind in ('manual','html')),
  content jsonb not null check (octet_length(content::text) <= 2097152),
  html_file_id uuid references public.files(id) on delete restrict,
  settings jsonb not null default '{"shuffle":false,"mode":"paged","page_size":10,"quiz_seconds":null,"question_seconds":null}',
  status public.quiz_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (quiz_id, version),
  unique (quiz_id, id),
  check ((kind = 'html' and html_file_id is not null) or (kind = 'manual' and html_file_id is null))
);
alter table public.quizzes add constraint quizzes_published_version_fk
  foreign key (id, published_version_id) references public.quiz_versions(quiz_id, id) deferrable initially deferred;

create table public.quiz_reviews (
  id uuid primary key default gen_random_uuid(),
  quiz_version_id uuid not null references public.quiz_versions(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('published','rejected')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_version_id uuid not null references public.quiz_versions(id) on delete cascade,
  score numeric not null check (score >= 0 and score < 'Infinity'::numeric),
  max_score numeric not null check (max_score > 0 and max_score < 'Infinity'::numeric),
  answers jsonb check (octet_length(answers::text) <= 1048576),
  summary boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  check (score <= max_score),
  check (completed_at >= started_at),
  check (not summary or answers is null)
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','complete')),
  confidence smallint check (confidence between 1 and 5),
  reflection text not null default '' check (octet_length(reflection) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('invite_accepted','quiz_submitted','quiz_reviewed','quiz_published','role_changed','status_changed')),
  title text not null check (char_length(title) <= 200),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}' check (octet_length(metadata::text) <= 2000),
  created_at timestamptz not null default now()
);

create index lessons_class_idx on public.lessons (class_id, created_at desc);
create index notes_class_idx on public.notes (class_id, created_at desc);
create index files_folder_idx on public.files (folder_id, state, created_at desc);
create index files_owner_idx on public.files (created_by, state);
create index quizzes_class_idx on public.quizzes (class_id);
create index quiz_versions_author_idx on public.quiz_versions (created_by, status);
create index attempts_owner_idx on public.attempts (user_id, quiz_version_id, completed_at desc);
create index lesson_progress_owner_idx on public.lesson_progress (user_id, updated_at desc);
create index chat_messages_cursor_idx on public.chat_messages (created_at desc, id desc);
create index chat_messages_rate_idx on public.chat_messages (user_id, created_at desc);
create index chat_messages_class_idx on public.chat_messages (class_id, created_at desc);
create index notifications_owner_idx on public.notifications (user_id, created_at desc);
create index activity_log_cursor_idx on public.activity_log (created_at desc);

-- All tables start closed; the next migration adds explicit policies and grants.
alter table public.workspace_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.classes enable row level security;
alter table public.lessons enable row level security;
alter table public.notes enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.saved_files enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_versions enable row level security;
alter table public.quiz_reviews enable row level security;
alter table public.attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
