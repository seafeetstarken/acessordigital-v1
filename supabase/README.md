# Supabase base - Acessor Digital

Arquivos locais para a base de dados do cockpit.

## Arquivos

- `migrations/0001_init.sql`: schema inicial com workspaces, conhecimento, CRM, conversas, deals, automações, notas de sessão e changelog.
- `seed.sql`: dados de exemplo para a primeira carga do ambiente.
- `types.ts`: tipagem TypeScript para consumo no front.

## Ordem sugerida

1. Criar o projeto no Supabase.
2. Rodar a migration `0001_init.sql`.
3. Aplicar o `seed.sql`.
4. Gerar/usar os types no app.

## Observação

As policies aqui estão intencionalmente abertas para o desenvolvimento local do cockpit. Antes do ambiente de produção, elas precisam ser refinadas por workspace e perfil de acesso.
