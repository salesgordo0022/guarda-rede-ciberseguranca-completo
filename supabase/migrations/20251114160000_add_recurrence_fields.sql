-- Recurrence fields for activities, processes, and workflows
-- Adds optional columns to support automated generation metadata

begin;

-- Activities recurrence
alter table public.activities
  add column if not exists recurrence_enabled boolean default false,
  add column if not exists recurrence_unit text check (recurrence_unit in ('day','week','month','year')),
  add column if not exists recurrence_every integer default 1,
  add column if not exists recurrence_start_date date;

-- Processes recurrence
alter table public.processes
  add column if not exists recurrence_enabled boolean default false,
  add column if not exists recurrence_unit text check (recurrence_unit in ('day','week','month','year')),
  add column if not exists recurrence_every integer default 1,
  add column if not exists recurrence_start_date date;

-- Workflows recurrence
alter table public.workflows
  add column if not exists recurrence_enabled boolean default false,
  add column if not exists recurrence_unit text check (recurrence_unit in ('day','week','month','year')),
  add column if not exists recurrence_every integer default 1,
  add column if not exists recurrence_start_date date;

commit;