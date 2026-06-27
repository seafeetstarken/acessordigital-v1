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
      console.log('[asaas-webhook] Firebase Admin inicializado com sucesso.');
    } catch (err) {
      console.error('[asaas-webhook] Erro ao inicializar Firebase Admin:', err);
    }
  } else {
    console.warn('[asaas-webhook] GA_SERVICE_ACCOUNT_KEY nao configurada.');
  }
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validar Token de Segurança do Webhook
  const clientToken = req.headers['asaas-access-token'] || req.headers['Asaas-Access-Token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || 'acessor_asaas_webhook_token';

  if (clientToken !== expectedToken) {
    console.warn('[asaas-webhook] Token de seguranca do webhook invalido ou ausente.');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { event, payment } = req.body || {};

  console.log(`[asaas-webhook] Evento recebido: ${event}`, JSON.stringify(payment));

  if (!event || !payment) {
    return res.status(400).json({ error: 'Bad Request: missing event or payment details' });
  }

  // 2. Filtrar apenas eventos de pagamento confirmado/recebido
  const isPaymentConfirmed = event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED';
  if (!isPaymentConfirmed) {
    console.log(`[asaas-webhook] Ignorando evento secundario: ${event}`);
    return res.status(200).json({ success: true, message: `Ignored event: ${event}` });
  }

  // 3. Obter ID do Workspace e Plano das Referências Externas
  // Esperado no formato: "workspaceId" ou "workspaceId|NomeDoPlano"
  let workspaceId = payment.externalReference || '';
  let planName = 'Mensal'; // Plano padrão se não especificado

  if (workspaceId.includes('|')) {
    const parts = workspaceId.split('|');
    workspaceId = parts[0];
    planName = parts[1];
  }

  if (!workspaceId) {
    console.warn('[asaas-webhook] Pagamento recebido sem campo externalReference contendo o workspaceId.');
    return res.status(200).json({ success: false, error: 'Missing externalReference' });
  }

  const db = admin.firestore();

  try {
    // 4. Prevenir Processamento Duplicado (Idempotência)
    const paymentLockRef = db.collection('asaas_payments').doc(payment.id);
    const paymentLockSnap = await paymentLockRef.get();

    if (paymentLockSnap.exists) {
      console.log(`[asaas-webhook] Transacao ${payment.id} ja processada anteriormente.`);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // 5. Verificar se o Workspace existe no Firestore
    const workspaceRef = db.collection('workspaces').doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      console.error(`[asaas-webhook] Workspace ${workspaceId} nao encontrado no banco.`);
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspaceData = workspaceSnap.data() || {};
    const ownerUid = workspaceData.ownerUid;

    // 6. Atualizar os dados do Workspace e adicionar créditos (500 créditos por plano contratado)
    await workspaceRef.update({
      billingPlan: planName,
      creditsBalance: admin.firestore.FieldValue.increment(500),
      updatedAt: new Date().toISOString()
    });

    console.log(`[asaas-webhook] Workspace ${workspaceId} atualizado para o plano ${planName} (+500 creditos).`);

    // 7. Atualizar o plano do usuário proprietário
    if (ownerUid) {
      const userRef = db.collection('users').doc(ownerUid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        await userRef.update({
          plan: planName,
          updatedAt: new Date().toISOString()
        });
        console.log(`[asaas-webhook] Perfil do usuario dono ${ownerUid} atualizado para o plano ${planName}.`);
      }
    }

    // 8. Gravar evento de faturamento no histórico operacional (changelog_events)
    const billingTypeMap = {
      CREDIT_CARD: 'Cartão de Crédito',
      PIX: 'Pix',
      BOLETO: 'Boleto Bancário'
    };
    const methodStr = billingTypeMap[payment.billingType] || payment.billingType || 'Método desconhecido';

    await db.collection('changelog_events').add({
      workspaceId,
      type: 'billing',
      title: 'Assinatura Ativada 🎉',
      content: `Plano ${planName} ativado com sucesso via Asaas (${methodStr}). Quota de 500 créditos adicionada ao saldo.`,
      createdAt: new Date().toISOString()
    });

    // 9. Marcar pagamento como processado
    await paymentLockRef.set({
      workspaceId,
      value: payment.value,
      billingType: payment.billingType,
      event,
      planName,
      processedAt: new Date().toISOString()
    });

    console.log(`[asaas-webhook] Transacao ${payment.id} concluida com sucesso.`);
    return res.status(200).json({ success: true, message: 'Workspace upgraded successfully' });

  } catch (err) {
    console.error('[asaas-webhook] Erro crítico ao processar webhook do Asaas:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
