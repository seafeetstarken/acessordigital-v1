# 🎻 Ecossistema Orchestra — Acessor Digital (NotFair)

Este documento descreve a arquitetura de orquestração de IA e automação do ecossistema **Orchestra**, integrado a este repositório de forma isolada do controle de versão principal (Git).

---

## 🏗️ Arquitetura do Ecossistema

O Orchestra combina o motor de execução multi-tenant do NotFair CLI com a biblioteca geral de skills do Awesome Skills, permitindo que agentes de IA e scripts locais executem auditorias, otimizações de SEO e automação de APIs de tráfego pago (Meta Ads, Google Ads).

```
acessordigital-front-main/
├── skills/                           ← [Ignorado no Git] Motores locais do ecossistema
│   ├── NotFair/                      ← Dispatcher CLI de Conectores (Google Ads, Meta, SEO)
│   └── antigravity-awesome-skills/   ← Catálogo geral de skills agentivas
│
├── acessor-digital.code-workspace    ← Workspace multi-root do VS Code
├── nf.ps1                            ← Atalho de terminal para execução rápida do CLI
├── update_all.ps1                    ← Script PowerShell para atualização dos submódulos
└── ORCHESTRA.md                      ← Este manual de arquitetura e referência técnica
```

---

## 🧭 Precedência de Busca de Habilidades (Skills)

Ao executar qualquer comando `run`, o orquestrador realiza a busca da skill requisitada de forma hierárquica, garantindo que customizações locais tenham precedência sobre as gerais:

1.  **Skills Customizadas do Tenant:** `C:/dev/tenants/<TenantName>/skills-custom/<SkillName>`
2.  **Biblioteca Geral de Awesome Skills:** `skills/antigravity-awesome-skills/skills/<SkillName>`
3.  **Conectores do NotFair Dispatcher:** `skills/NotFair/<Subdir>/<SkillName>`

---

## 🛠️ Comandos Principais do CLI (`nf`)

O arquivo `nf.ps1` na raiz serve como atalho no terminal. Execute os comandos abaixo precedidos de `.\nf.ps1`:

### 1. Scaffold de Tenant
Cria a estrutura de pastas e arquivo `.env` inicial para um novo cliente/empresa em `C:/dev/tenants`.
```powershell
.\nf.ps1 scaffold <NomeDoTenant>
```

### 2. Validação técnica de Tenant
Realiza auditoria de arquivos de configuração (`config.json`), credenciais e APIs necessárias.
```powershell
.\nf.ps1 validate <NomeDoTenant>
```

### 3. Deploy de Tagging (GTM)
Configura e atualiza contêineres do Google Tag Manager (GTM) para o tenant. Use `--publish` para publicar imediatamente.
```powershell
.\nf.ps1 gtm-deploy <NomeDoTenant> [--publish]
```

### 4. Execução de Playbook ou Script
Busca e executa playbooks markdown (`SKILL.md`) ou scripts em Python/Node correspondentes à skill indicada.
```powershell
.\nf.ps1 run <NomeDoTenant> <NomeDaSkill>
```

---

## 🔑 Centralização em `C:/dev/tenants`

Toda a inteligência de negócios, chaves de API particulares, tokens de OAuth do Facebook/Google e definições específicas de campanhas para cada cliente estão centralizados sob o diretório absoluto **`C:/dev/tenants/<NomeDoTenant>`**. 

Isso garante:
*   **Segurança Máxima:** Credenciais de produção nunca são armazenadas ou commitadas no repositório de código fonte do frontend (`acessordigital-front-main`).
*   **Separação de Contexto:** Vários ambientes ou clientes podem rodar na mesma máquina sem sobreposição de tokens ou configurações de automação.
