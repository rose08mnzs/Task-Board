create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  assignee_id uuid references public.team_members(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.team_members enable row level security;

create policy "users can read own tasks"
on public.tasks
for select
to authenticated
using (user_id = auth.uid());

create policy "users can insert own tasks"
on public.tasks
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users can update own tasks"
on public.tasks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own tasks"
on public.tasks
for delete
to authenticated
using (user_id = auth.uid());


create table task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  team_member_id uuid not null references team_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, team_member_id)
);

create policy "assignees owner read"
on task_assignees for select
using (auth.uid() = user_id);

create policy "assignees owner write"
on task_assignees for insert
with check (auth.uid() = user_id);

create policy "assignees owner delete"
on task_assignees for delete
using (auth.uid() = user_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index task_comments_task_id_created_at_idx
  on public.task_comments (task_id, created_at asc);

alter table public.task_comments enable row level security;

create policy "read own comments"
on public.task_comments
for select
using (user_id = auth.uid());

create policy "insert own comments"
on public.task_comments
for insert
with check (user_id = auth.uid());

create policy "delete own comments"
on public.task_comments
for delete
using (user_id = auth.uid());

create table public.task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null,
  created_at timestamptz default now()
);

create index task_activity_task_id_idx
on task_activity_log(task_id, created_at desc);

create table public.task_labels (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (task_id, name)
);

alter table public.task_labels enable row level security;

create policy "task labels owned by user"
on public.task_labels
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());