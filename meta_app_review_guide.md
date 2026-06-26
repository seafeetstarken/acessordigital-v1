# Guia de Aprovação Meta App Review: GHOF Integrator

O grande "pulo do gato" para passar na revisão da Meta de primeira é entender que você **não precisa de um vídeo diferente para cada permissão**. Você pode gravar um **único vídeo contínuo** mostrando o fluxo completo e fazer o upload do mesmo arquivo em todas as solicitações. O segredo é mudar apenas a justificativa de texto para apontar o momento (minuto/segundo) exato em que aquela permissão específica é usada.

Abaixo, você encontrará os textos validados para cada grupo de permissões, o roteiro do vídeo de demonstração e o checklist obrigatório para a Política de Privacidade.

---

## Parte 1: Textos para os Casos de Uso (Copiar e Colar)

A Meta possui robôs e revisores terceirizados lendo estas justificativas. Seja direto e objetivo. Utilize os textos abaixo, copiando-os e colando-os nas respectivas áreas de justificativa no painel de App Review.

### Grupo 1: Identificação e Setup
**Permissões Relacionadas:** `public_profile`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`

> **Como vamos usar:**
> "Esta permissão é usada exclusivamente no fluxo inicial de onboarding. Quando o cliente faz o login na nossa plataforma (GHOFIntegrator), usamos essa permissão para listar as páginas do Facebook que ele administra e identificar os perfis de Instagram Business vinculados a elas. Isso é necessário para configurar os webhooks e permitir que o usuário escolha qual conta deseja conectar ao nosso painel centralizado de atendimento."

### Grupo 2: Mensagens do Facebook Messenger
**Permissões Relacionadas:** `pages_manage_metadata`, `pages_messaging`

> **Como vamos usar:**
> "Usamos esta permissão para que nossa plataforma (GHOFIntegrator) receba webhooks de novas mensagens enviadas para a Página do Facebook do cliente. Isso permite que os atendentes leiam as mensagens dos consumidores e enviem respostas em tempo real através da nossa interface de atendimento, sem precisar abrir o painel nativo da Meta."

### Grupo 3: Mensagens do Instagram Direct
**Permissões Relacionadas:** `instagram_manage_messages`

> **Como vamos usar:**
> "Esta permissão permite ler as DMs (Direct Messages) enviadas pelos consumidores para o perfil do Instagram Business do cliente. O aplicativo recebe a mensagem via webhook, exibe no nosso painel de atendimento e permite que o atendente digite e envie uma resposta direta para o consumidor pelo nosso sistema."

### Grupo 4: WhatsApp Business
**Permissões Relacionadas:** `whatsapp_business_management`, `whatsapp_business_messaging`

> **Como vamos usar:**
> "Utilizamos estas permissões para conectar o número da WhatsApp Business API do cliente à nossa plataforma. A permissão de gerenciamento nos permite ler o status da conta e os templates de mensagem aprovados. A permissão de mensageria permite receber as mensagens inbound dos clientes finais e enviar respostas outbound através da nossa caixa de entrada unificada."

---

## Parte 2: O Roteiro do Vídeo "Aprova Tudo"

Use um software de gravação de tela (como OBS Studio, Loom, QuickTime, etc.). **Não adicione música nem edição com cortes bruscos.** O vídeo pode ser gravado no seu ambiente de desenvolvimento (`localhost`). Tente manter a duração total abaixo de 5 minutos.

### 1. A Autenticação e Setup (0:00 - 0:45)
- **Ação:** Mostre a tela inicial do GHOFIntegrator (deslogada).
- **Ação:** Clique no botão "Conectar Facebook/Instagram/WhatsApp".
- **Ação:** A janela do Facebook (OAuth) será aberta.
- **🚨 CRÍTICO:** Mostre claramente a tela onde o usuário seleciona as Páginas e onde aparecem os "avisos das permissões" que estão sendo solicitadas.
- **Ação:** Conclua o fluxo, clique em Continuar e retorne ao GHOFIntegrator.
- **Ação:** Mostre as contas (Páginas, Instagram, WABA) conectadas aparecendo com sucesso no seu sistema.

### 2. A Prova de Fogo: Messenger e Instagram (0:45 - 2:00)
- **Setup Visual:** Divida a tela ao meio (ou alterne rapidamente entre abas). De um lado, o painel de atendimento do GHOF. Do outro, o app do Instagram ou Messenger logado como um "cliente final".
- **Ação:** Pelo Instagram/Messenger do cliente, envie uma mensagem: *"Olá, preciso de ajuda com meu pedido"*.
- **Ação:** Mostre a mensagem chegando e aparecendo na interface do GHOFIntegrator.
- **Ação:** No painel do GHOF, digite e envie a resposta: *"Olá! Claro, me informe o número do pedido."*
- **Ação:** Retorne à tela do cliente final e mostre a resposta aparecendo instantaneamente no app do Instagram/Messenger.

### 3. A Prova do WhatsApp Business (2:00 - 3:30)
- **Setup Inicial (Se aplicável):** Se o seu sistema utiliza a tela de *Embedded Signup* (seleção de número nativa), grave essa etapa de configuração rapidamente.
- **Ação:** De um celular comum (ou usando o WhatsApp Web de um número pessoal), envie uma mensagem para o número oficial de teste do WhatsApp Business cadastrado no GHOF: *"Gostaria de saber o horário de funcionamento."*
- **Ação:** Mostre essa mensagem caindo imediatamente na caixa de entrada do painel do GHOFIntegrator.
- **Ação:** Pelo GHOFIntegrator, digite e envie a resposta: *"Funcionamos das 08h às 18h!"*.
- **Ação:** Mostre a tela do celular comum/WhatsApp Web recebendo essa resposta.
- **Extra (Altamente Recomendado):** Se o seu app envia *Templates* (mensagens ativas de notificação), mostre o atendente selecionando um template no GHOF e disparando para o número de teste do cliente.

> 💡 **O "Pulo do Gato" nas justificativas de texto na Meta:**
>
> Ao fazer o upload do vídeo, você deve adicionar uma frase semelhante a esta em **TODAS** as justificativas, alterando apenas os tempos:
> 
> *"Por favor, veja o vídeo em anexo. O fluxo de login Oauth onde esta permissão é solicitada ocorre de **0:00 a 0:30**. A recepção da mensagem enviada pelo cliente ocorre no minuto **2:15**, e a resposta enviada pelo nosso sistema ocorre no minuto **2:35**."*

---

## Parte 3: Revisão da Política de Privacidade (Checklist Rigoroso)

A Meta recusa aplicativos de imediato se a Política de Privacidade não cumprir **todos** os requisitos abaixo. Para garantir a aprovação, certifique-se de que a sua política contém:

- [ ] **URL Pública e Acessível:** A política de privacidade deve estar hospedada em uma página web pública (ex: `https://ghof.com.br/privacidade`). Não pode estar em formato PDF e não pode exigir login para ser lida.
- [ ] **Dados Coletados Explicitados:** Deve mencionar claramente que você coleta informações de perfis públicos, mensagens, nomes e IDs de plataformas de terceiros (Meta, Facebook, Instagram, WhatsApp).
- [ ] **Objetivo do Uso dos Dados:** Explique como as mensagens e dados são utilizados. *(Exemplo: "Os dados coletados são utilizados exclusivamente para permitir a comunicação unificada entre o lojista e o consumidor final através da nossa plataforma.")*
- [ ] **Regras de Compartilhamento:** Deixe claro que os dados não são vendidos. *(Exemplo: "Não compartilhamos seus dados ou histórico de mensagens com terceiros para fins de marketing sem o seu consentimento explícito.")*
- [ ] **🚨 Instruções de Exclusão de Dados (Data Deletion Instructions):** **Este é o ponto que mais causa reprovações.** A sua política **DEVE** ter uma seção dedicada e clara explicando como o usuário revoga o acesso e pede a exclusão dos dados que vieram do Facebook.

### Exemplo de Cláusula de Exclusão de Dados Aprovada pela Meta:

> **Exclusão de Dados do Facebook / Meta**
> 
> Se você deseja excluir seus dados coletados através da integração com o Facebook, Instagram ou WhatsApp, você pode fazer isso de duas formas:
> 
> 1. Removendo o aplicativo "GHOFIntegrator" diretamente pelas configurações de [Integrações de Negócios (Business Integrations) do seu perfil do Facebook](https://www.facebook.com/settings?tab=business_tools).
> 2. Enviando um e-mail para **privacidade@ghof.com.br** informando a URL da sua página ou o seu ID de cliente, solicitando a exclusão dos seus dados.
> 
> Ao solicitar a exclusão ou desconectar a integração, todos os seus dados de conversas e tokens de acesso provenientes da Meta serão permanentemente removidos dos nossos servidores em um prazo máximo de 30 dias.
