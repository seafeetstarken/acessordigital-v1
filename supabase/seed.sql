insert into public.workspaces (id, name, slug, cnpj, business_hours, billing_plan, credits_balance)
values (
  gen_random_uuid(),
  'Acessor Digital',
  'acessor-digital',
  '42.792.893/0001-03',
  '{"monday":"08:00-19:00","tuesday":"08:00-19:00","wednesday":"08:00-19:00","thursday":"08:00-19:00","friday":"08:00-19:00"}',
  'Mensal',
  500
)
on conflict (slug) do nothing;

insert into public.changelog_events (source, event_type, title, description)
values
  ('seed', 'meta_review', 'Footer de compliance publicado', 'Rodapé com SeaFeet Labs, CNPJ e disclaimer Meta publicado na LP.'),
  ('seed', 'knowledge_sync', 'Base de conhecimento inicial', 'Documentos de exemplo e regras comerciais inseridos para o cockpit.'),
  ('seed', 'inbox_ready', 'Inbox operacional', 'Fluxo de 3 colunas com score, tags e resumo da IA alinhado.')
on conflict do nothing;
