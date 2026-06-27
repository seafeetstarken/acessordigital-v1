import admin from 'firebase-admin';

// Inicializar Firebase Admin SDK se não estiver inicializado
if (!admin.apps.length) {
  const serviceAccountKeyB64 = process.env.GA_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKeyB64) {
    try {
      const serviceAccountJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[meta-webhook] Firebase Admin inicializado com sucesso.');
    } catch (err) {
      console.error('[meta-webhook] Erro ao inicializar Firebase Admin:', err);
    }
  } else {
    console.warn('[meta-webhook] GA_SERVICE_ACCOUNT_KEY nao configurada.');
  }
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação do Webhook (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'realizzati_verify_token';

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedVerifyToken) {
        console.log('[meta-webhook] Webhook verificado com sucesso!');
        return res.status(200).send(challenge);
      } else {
        console.warn('[meta-webhook] Token de verificacao incorreto.');
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  // 2. Processamento das Notificações de Mensagem (POST)
  if (req.method === 'POST') {
    const body = req.body;

    console.log('[meta-webhook] Recebendo notificacao:', JSON.stringify(body));

    if (body.object === 'page' || body.object === 'instagram') {
      const db = admin.firestore();

      try {
        for (const entry of body.entry) {
          const pageId = entry.id;
          
          // 1. Buscar dinamicamente qual workspace é o dono desta página ou conta de Instagram
          const workspacesRef = db.collection('workspaces');
          let workspaceQuery = await workspacesRef
            .where('activeMetaPageId', '==', pageId)
            .get();

          if (workspaceQuery.empty) {
            workspaceQuery = await workspacesRef
              .where('activeInstagramAccountId', '==', pageId)
              .get();
          }

          if (workspaceQuery.empty) {
            console.warn(`[meta-webhook] Nenhum workspace ativo encontrado para o Page/IG ID: ${pageId}. Ignorando evento.`);
            continue;
          }

          const workspaceDoc = workspaceQuery.docs[0];
          const workspaceId = workspaceDoc.id;
          const workspaceData = workspaceDoc.data() || {};
          const pageAccessToken = workspaceData.activeMetaPageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;

          // Tratar array 'messaging' (Messenger e Instagram Direct padrão)
          if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const messagingEvent of entry.messaging) {
              // Validar se é uma mensagem de texto simples
              if (messagingEvent.message && messagingEvent.message.text && !messagingEvent.message.is_echo) {
                const senderId = messagingEvent.sender.id;
                const messageText = messagingEvent.message.text;
                const timestamp = messagingEvent.timestamp || Date.now();
                const now = new Date(timestamp);
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                
                const channel = body.object === 'instagram' ? 'Instagram' : 'Messenger';

                console.log(`[meta-webhook] Nova mensagem de ${senderId} no canal ${channel} (Workspace: ${workspaceId}): "${messageText}"`);

                // 2. Procurar ou criar o Contato (Lead)
                const contactsRef = db.collection('contacts');
                const contactQuery = await contactsRef
                  .where('workspaceId', '==', workspaceId)
                  .where('phone', '==', senderId)
                  .get();

                let contactId;
                let contactName = channel === 'Instagram' ? `Instagram @${senderId}` : `Usuário Messenger ${senderId}`;

                if (contactQuery.empty) {
                  // Tentar buscar perfil do usuário no Facebook se for Messenger
                  if (channel === 'Messenger' && pageAccessToken) {
                    try {
                      const userProfileRes = await fetch(
                        `https://graph.facebook.com/v23.0/${senderId}?fields=first_name,last_name&access_token=${pageAccessToken}`
                      );
                      if (userProfileRes.ok) {
                        const profileData = await userProfileRes.json();
                        if (profileData.first_name) {
                          contactName = `${profileData.first_name} ${profileData.last_name || ''}`.trim();
                        }
                      }
                    } catch (e) {
                      console.warn('[meta-webhook] Falha ao consultar nome do perfil no Facebook:', e);
                    }
                  }

                  const newContactDoc = await contactsRef.add({
                    workspaceId: workspaceId,
                    name: contactName,
                    phone: senderId,
                    channel: channel,
                    status: 'hot',
                    aiScore: 80,
                    tags: ['Meta Ads'],
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  contactId = newContactDoc.id;
                  console.log(`[meta-webhook] Contato criado com ID: ${contactId}`);
                } else {
                  const doc = contactQuery.docs[0];
                  contactId = doc.id;
                  contactName = doc.data().name || contactName;
                  console.log(`[meta-webhook] Contato existente encontrado com ID: ${contactId}`);
                }

                // 3. Procurar ou criar a Conversa
                const conversationsRef = db.collection('conversations');
                const conversationQuery = await conversationsRef
                  .where('workspaceId', '==', workspaceId)
                  .where('contactId', '==', contactId)
                  .get();

                const newMessageObj = {
                  sender: 'received',
                  text: messageText,
                  time: timeStr,
                  timestamp: timestamp
                };

                if (conversationQuery.empty) {
                  await conversationsRef.add({
                    workspaceId: workspaceId,
                    contactId: contactId,
                    contactName: contactName,
                    summary: messageText,
                    lastMessageAt: new Date().toISOString(),
                    status: 'Abertas',
                    aiPaused: false,
                    messages: [newMessageObj],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  console.log('[meta-webhook] Nova conversa criada com mensagem inicial.');
                } else {
                  const convDoc = conversationQuery.docs[0];
                  const convData = convDoc.data();
                  const existingMessages = Array.isArray(convData.messages) ? convData.messages : [];
                  
                  // Atualizar conversa existente com a nova mensagem no array
                  await conversationsRef.doc(convDoc.id).update({
                    summary: messageText,
                    lastMessageAt: new Date().toISOString(),
                    status: 'Abertas', // Forçar status para Abertas/Não lidas
                    messages: [...existingMessages, newMessageObj],
                    updatedAt: new Date().toISOString()
                  });
                  console.log('[meta-webhook] Conversa existente atualizada com a nova mensagem.');
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[meta-webhook] Erro ao gravar dados no Firestore:', err);
        return res.status(500).json({ error: 'Erro interno ao gravar dados', details: err.message });
      }

      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}
