-- Basic seed data for local testing
insert into public.departments (id, name, description)
values
  (gen_random_uuid(), 'Departamento Pessoal', 'RH e DP'),
  (gen_random_uuid(), 'Financeiro', 'Contas e faturamento')
on conflict do nothing;