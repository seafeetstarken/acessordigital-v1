📋 Documento de Requisitos do Produto (PRD) - Acessor Digital (SaaS Cockpit)
Projeto: Acessor Digital
Desenvolvedor/Operador: SeaFeet Labs
Posicionamento: Plataforma B2B Multi-Segmento de Atendimento com Inteligência Artificial. ("Contrate a IA. Demita o gargalo.")
Objetivo do Codex: Implementar a lógica de rotas, banco de dados e front-end dinâmico da Área Logada (Cockpit Operacional) localizada na pasta app/, preservando os tokens de design premium (Dark Mode) já existentes.

1. Stack Tecnológica e Arquitetura
Front-end Core: Next.js (App Router) e React. O projeto possui uma entrada estática index.html para a Landing Page principal, e o ecossistema do painel roda dentro da estrutura dinâmica app/.

Estilização: Tailwind CSS (focado em Dark Mode com alto contraste, utilizando a paleta estabelecida: fundos escuros, detalhes em Roxo Neon, Verde e Laranja).

Back-end & Database: Supabase (PostgreSQL, Row Level Security, Auth e Edge Functions).

Hospedagem & CI/CD: Vercel (configurado via vercel.json).

Integrações Críticas: Meta Graph API (Modo Live via OAuth), CAPI (Conversions API) para envio de eventos de compra ao Meta Ads.

2. Estrutura do Banco de Dados (Supabase PostgreSQL)
O Codex deverá gerar as migrations e configurar o schema com as seguintes entidades centrais:

workspaces: Dados da empresa assinante.

Colunas: id (UUID), name, slug, cnpj, business_hours (JSONB), billing_plan (Mensal, Semestral, Anual), credits_balance (Int), created_at.

knowledge_base: Cérebro da IA para a empresa.

Colunas: id, workspace_id (FK), type (PDF, Texto, Scraper), title, content (Text/Vector), status (Indexado, Processando), updated_at.

contacts (Leads): CRM Base.

Colunas: id, workspace_id (FK), name, phone, channel (WhatsApp, Instagram, etc.), ai_score (0-100), status (Quente, Frio, Ativo), tags (Array).

conversations:

Colunas: id, contact_id (FK), status (Resolvida, Aberta, Humano), ai_paused (Boolean), last_message_at.

deals (Pipeline):

Colunas: id, contact_id (FK), stage (Prospecção, Qualificado, Proposta, Negociação, Fechado), value (Decimal), created_at.

automations:

Colunas: id, workspace_id (FK), type (Boas-vindas, Lembrete, Recuperação, LTV), is_active (Boolean), trigger_count (Int).

3. Módulos do Cockpit (Páginas em app/)
A. /app/ia-conhecimento (Cérebro do Sistema)

Interface: Três blocos centrais para inserção de dados (Upload de PDF/TXT, Criar nota manual e Importar Site/Scraper).

Lógica: O upload deve triggar um processamento no Supabase para converter os textos. Uma lista inferior exibe os documentos com a tag ✓ Indexado, permitindo edição ou exclusão.

B. /app/inbox (Caixa de Entrada Unificada e Handoff)

Interface: Layout em 3 colunas (Lista de Conversas > Chat Central > Painel lateral de Informações do Lead).

Lógica:

Filtros por canal e status (Todas, Abertas, Humano, Resolvidas).

Header do chat deve exibir o status da IA e botões para Pausar IA e Sugerir Resposta IA.

Integração visual de eventos de rastreamento no meio do chat (ex: envio de evento 'Purchase' para Meta Ads).

Painel lateral renderizando o "Resumo da IA", calculando o Score da IA (0-100) e aplicando tags dinâmicas.

C. /app/crm & /app/pipeline (Máquina de Vendas)

Interface: Alternância entre visualização em Lista (Contatos) e Kanban (Pipeline).

Lógica: Dashboard superior resumindo Total de Leads, Deals Abertos e Taxa de Conversão. Os cards do pipeline devem exibir o valor financeiro do deal, o responsável, e a tag do contato. Arrastar um card deve atualizar o status no Supabase imediatamente.

D. /app/automacoes (Economia de Tempo e LTV)

Interface: Lista de fluxos ("Boas-vindas", "Lembrete de Reunião", "Resgate de Carrinho", "Motor de Recompra").

Lógica: Cards com métricas de execução (Gatilhos (7d), Conversão (%)) e botões Toggle para ativar/desativar cada automação individualmente. Indicadores globais de desempenho no topo (Ações Economizadas).

E. /app/analytics (Painel de ROI)

Interface: Gráficos e indicadores de saúde da IA.

Lógica: Renderizar em tempo real as métricas: Conversas Totais, Taxa de Resolução IA (%), Tempo Médio de Resposta (s) e distribuição de volume por canal (Gráficos de barra lateral e área central).

F. Outros Módulos Auxiliares:

/app/agenda: Visualização de eventos (Agenda semanal/diária) e integração de lembretes.

/app/catalogo: Gestão de produtos, procedimentos e links de pagamento com status de ativação.

/app/faturamento: Gestão da assinatura baseada em créditos, exibição do plano atual (Teste, Tração, Escala) e histórico de faturas.

/app/configuracoes: Setup do Workspace, horários de atendimento, fuso horário e webhook tokens.

/app/notificacoes: Timeline de alertas do sistema (Picos de atendimento, solicitações de transbordo humano).

4. Conformidade, App Review e Rodapé (Footer)
Para garantir a aprovação do App Review no Meta Developers e dos gateways de pagamento, o rodapé global e as rotas legais devem conter as seguintes regras de negócio:

Rotas de Compliance Existentes: /exclusao-de-dados, /politica-de-privacidade, /termos-de-uso.

Footer Global:

Deve conter o disclaimer de não afiliação: "Acessor Digital é desenvolvido e operado pela SeaFeet Labs. Não somos afiliados, endossados ou patrocinados pela Meta Platforms, Inc., Facebook ou Instagram."

Ação Obrigatória do Codex: Inserir SeaFeet Labs LTDA - CNPJ: [Inserir CNPJ] e Contato: suporte@acessordigital.com.br na base do rodapé global.

Manter a arquitetura de links apontando para as páginas de Recursos e Legal (Termos, Política e Exclusão).

5. Plano de Execução para o Codex
Setup do Banco de Dados: Acessar o Supabase, criar o esquema descrito no Item 2 e gerar os types TypeScript.

Configuração de Rotas Base: Mapear a estrutura de pastas e componentes dentro do app/ no Next.js (mantendo o layout principal que encapsula a Sidebar e a Topbar).

Desenvolvimento do Inbox: Construir o componente /app/inbox com prioridade, implementando a UI de 3 colunas, o botão de pausa da IA e o display dinâmico do AI Score.

Desenvolvimento da Base de Conhecimento: Criar os formulários de inserção no /app/ia-conhecimento e o mock do layout para o Scraper e upload de arquivos.

Atualização de Compliance: Aplicar a versão final do rodapé global de acordo com as regras do Item 4 para liberação imediata do Meta App Review.