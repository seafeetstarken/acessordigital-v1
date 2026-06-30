# Backlog de Produto: Módulo de Rastreamento Avançado & Atribuição 360° (Acessor Digital)

Este documento registra a proposta conceitual e técnica para o desenvolvimento futuro de um módulo de rastreamento avançado (SaaS add-on) integrado ao **Acessor Digital**, permitindo monitorar o tráfego de ponta a ponta em escala multi-tenant.

---

## 📐 1. Arquitetura de Escala (Multi-Tenant)

O Firestore será estruturado com o isolamento de dados por Tenant ID (slug do cliente) para que o sistema suporte centenas de contas ativas simultaneamente:

```
/tenants/{tenant_slug}/
    ├── config (parâmetros da marca, chaves de API criptografadas e tokens OAuth)
    ├── campaigns (campanhas importadas de Google Ads e Meta Ads)
    ├── leads/
    │    └── {lead_id} (dados cadastrais + parâmetros de tráfego original: UTMs, gclid, fbclid, _fbp, _fbc)
    └── sessions/
         └── {ref_id} (referências curtas de 5 caracteres ativas para matching dinâmico de cliques de WhatsApp)
```

### Mecanismo de Identificação de WhatsApp (O Truque da Referência Dinâmica)
Para cruzar o tráfego de anúncios com a pessoa que clica direto no botão de WhatsApp:
1. Ao clicar no WhatsApp na Landing Page, geramos uma referência de 5 caracteres (Ex: `ref=T6K2L`) e a associamos aos cookies/IDs de clique (`gclid`/`fbclid`) no Firestore.
2. O usuário é redirecionado ao WhatsApp com o texto: `"Olá!... [Ref: T6K2L]"`.
3. Quando a mensagem chega no Acessor Digital, o webhook de mensagem lê a referência, consulta o Firestore daquele cliente e vincula o número de telefone do WhatsApp ao tráfego do anúncio na hora!

---

## 💰 2. O Módulo como Add-on de Venda (SaaS Monetization)

A atribuição de WhatsApp é a maior dor dos anunciantes hoje. Esse recurso pode ser comercializado como um **Upgrade de Plano ou Módulo Adicional (R$ 97 a R$ 197/mês)**.

### O que o Cliente Adquire:
1. **Script de Rastreamento Unificado:** Um único script JS leve para colar no site (WordPress, Landing Page, e-commerce) que faz o tracking automático dos cookies e referências.
2. **Setup Automatizado (GTM API):** Ativação programática das tags de conversão do Google Ads e Meta Pixel via API do GTM na conta do cliente em poucos segundos após conectar o OAuth.
3. **Painel de CAC e ROAS no Acessor:** Visualização visual do funil das campanhas correlacionado ao faturamento real gerado no CRM (Ex: Investimento em anúncios vs Lucro real).
4. **API de Conversões Offline (CAPI):** O CRM do Acessor Digital notifica o Google Ads e Meta Ads automaticamente sempre que um lead avança para "Visita Agendada" ou "Contrato Fechado", passando o valor monetário real da venda para calibrar a IA dos anúncios do cliente.

---

## 🛠️ 3. Backlog de Desenvolvimento (Próximas Etapas)

1. **Desenvolvimento do Script JS do Site:** Criar o script client-side para captura de cookies de clique (`gclid`, `fbclid`, `_fbp`, `_fbc`) e UTMs com geração de referência randômica no clique do link wa.me.
2. **Autenticação OAuth2 de Plataformas:** Desenvolver o fluxo no Acessor Digital para que o cliente realize o login com as contas do Google e Meta.
3. **Mapeamento de Webhooks e Fila de Mutação:** Criar background workers no Node.js do Acessor para disparar eventos offline para as APIs de Conversões à medida que os cards no CRM mudam de status.
