# PRD: Módulos de Tração (CAPI) e Motor de Recompra
Escopo Restrito: Especificações de Interface e Experiência do Usuário (Front-end).

## 1. Feature A: Feedback de Conversão (Integração CAPI/Pixel)
**Objetivo:** Permitir que o usuário conecte as APIs de Conversão (Meta e Google) para que o Acessor Digital devolva a inteligência dos "Leads Quentes" direto para as campanhas, otimizando o tráfego automaticamente.

### 1.1. Modificações em /app/configuracoes
Criar uma nova aba ou sessão chamada "Tráfego & Pixels".

**Componentes Visuais:**
*   **Cards de Integração:** Dois blocos bem destacados ("Meta Ads CAPI" e "Google Ads Offline Conversions").
*   **Inputs de Credenciais:**
    *   **Meta:** Campo para Pixel ID e campo oculto (tipo password) para o Token de Acesso.
    *   **Google:** Campo para Customer ID e Conversion Action ID.
*   **Toggle de Ativação (Switch):** Um botão de ligar/desligar para ativar o envio automático de eventos.
*   **Mapeamento de Eventos (Select Box):** Uma interface simples onde o usuário vincula as Tags do Acessor aos Eventos Padrão. Exemplo visual:
    *   `Tag: [Lead Quente 🔥] ➔ Enviar como: [Purchase] ou [Lead].`
*   **Status de Conexão:** Um indicador semafórico (Bolinha verde: "Conectado e enviando", Bolinha vermelha: "Erro de Token").

### 1.2. Modificações em /app/inbox e /app/crm
O usuário precisa de um feedback visual de que o evento foi disparado com sucesso para a plataforma de anúncios.

**Componentes Visuais:**
*   **Log de Atividade no Chat:** Quando o atendente humano (ou a IA) aplicar a tag que sinaliza o fechamento da venda, a linha do tempo do Inbox deve gerar um micro-alerta cinza:
    *   `⚡ Evento 'Purchase' enviado para Meta Ads.`
*   **Tag de Origem:** Na barra lateral direita do CRM (dados do contato), adicionar um campo read-only mostrando o `ad_id` ou a `utm_campaign` que trouxe aquele lead, provando o valor da integração.

---

## 2. Feature B: Motor de Recompra (LTV Automático)
**Objetivo:** Criar uma interface intuitiva para que o empresário configure disparos passivos via WhatsApp para clientes inativos, transformando a base de dados em receita recorrente.

### 2.1. Modificações em /app/automacoes
Criar um novo submódulo chamado "Campanhas de Resgate" ou "Reativação".

**Componentes Visuais:**
*   **Painel de Segmentação (Construtor de Audiência):**
    *   Uma interface simples de filtros para criar as réguas.
    *   Input numérico: "Inativo há mais de [ X ] dias".
    *   Select Box de Tag: "Apenas clientes com a tag [ VIP ] ou [ Fundo de Funil ]".
*   **Contador Dinâmico:** Um elemento visual que atualiza em tempo real mostrando o tamanho do público (Ex: "Essa regra atingirá 142 contatos").
*   **Editor de Mensagem (Text Area com Variáveis):**
    *   Caixa de texto simulando o visual do WhatsApp.
    *   Botões de variáveis rápidas (`{Nome}`, `{Último Pedido}`) para personalização do disparo.
    *   Aviso de limite de caracteres ou boas práticas anti-spam.
*   **Dashboard da Campanha (Mini-Analytics):**
    *   Ao lado de cada automação ativa, exibir três blocos de métricas rápidas: **Enviados**, **Lidos**, e o mais importante: **Resgatados (R$)** (que cruza os disparos com as vendas fechadas posteriormente).

### 2.2. Modificações em /app/dashboard
O valor gerado por esse motor não pode ficar escondido. Ele precisa ser a estrela do painel inicial.

**Componentes Visuais:**
*   **Novo Card de KPI:** Adicionar um novo Card de KPI principal: "Receita Recuperada (30 dias)".
*   **Visualização:** Exibir o valor em destaque (em reais) acompanhado de um mini-gráfico de tendência (sparkline) verde. Isso materializa o retorno sobre o investimento (ROI) da ferramenta todos os dias para o usuário.

---

## 3. Requisitos de UX/UI
*   **Fricção Zero:** A aba de configuração do CAPI precisa ter ícones de `( )` com tooltips explicativos. Configurar tokens de API assusta usuários leigos, então a interface deve incluir links diretos para tutoriais em vídeo ou artigos curtos da sua base de conhecimento.
*   **Prevenção de Erros (Motor de Recompra):** Antes de salvar uma automação que atinge mais de 50 contatos, o Front-end deve exibir um modal de confirmação ("Você está prestes a ativar disparos para 142 clientes. A mensagem será enviada gradativamente para evitar bloqueios. Confirmar").
