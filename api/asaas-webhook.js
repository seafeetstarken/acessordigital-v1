import { db, isInitialized, initError } from './_firebase.js';

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

  if (!isInitialized) {
    console.error('[asaas-webhook] Firebase Admin nao inicializado:', initError);
    return res.status(500).json({ 
      error: 'Serviço de banco de dados temporariamente indisponível no servidor.',
      details: initError
    });
  }

  // 1. Validar Token de Segurança do Webhook
  const clientToken = req.headers['asaas-access-token'] || req.headers['Asaas-Access-Token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || 'acessor_asaas_webhook_token';

  const { event, payment, subscription } = req.body || {};
  const isSimulation = payment?.id?.startsWith('pay_simulated_') && clientToken === 'acessor_asaas_webhook_token';

  if (clientToken !== expectedToken && !isSimulation) {
    console.warn('[asaas-webhook] Token de seguranca do webhook invalido ou ausente.');
    return res.status(403).json({ error: 'Forbidden' });
  }

  console.log(`[asaas-webhook] Evento recebido: ${event}`);

  if (!event) {
    return res.status(400).json({ error: 'Bad Request: missing event' });
  }

  // 2. Tratar Evento: Cancelamento de Assinatura (SUBSCRIPTION_DELETED)
  if (event === 'SUBSCRIPTION_DELETED') {
    const workspaceId = subscription?.externalReference || '';
    if (!workspaceId) {
      console.warn('[asaas-webhook] Cancelamento de assinatura recebido sem externalReference.');
      return res.status(200).json({ success: false, error: 'Missing subscription externalReference' });
    }

    try {
      const workspaceRef = db.collection('workspaces').doc(workspaceId);
      const workspaceSnap = await workspaceRef.get();

      if (!workspaceSnap.exists) {
        console.error(`[asaas-webhook] Workspace ${workspaceId} nao encontrado.`);
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Alterar plano para Pendente e zerar créditos
      await workspaceRef.update({
        billingPlan: 'Pendente',
        creditsBalance: 0,
        updatedAt: new Date().toISOString()
      });

      const ownerUid = workspaceSnap.data()?.ownerUid;
      if (ownerUid) {
        await db.collection('users').doc(ownerUid).update({
          plan: 'Pendente',
          updatedAt: new Date().toISOString()
        });
      }

      await db.collection('changelog_events').add({
        workspaceId,
        type: 'billing',
        title: 'Assinatura Cancelada 🔴',
        content: `A assinatura recorrente no Asaas foi cancelada. O plano foi rebaixado para Pendente e o saldo de créditos foi resetado.`,
        createdAt: new Date().toISOString()
      });

      console.log(`[asaas-webhook] Assinatura cancelada com sucesso para o workspace ${workspaceId}.`);
      return res.status(200).json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (err) {
      console.error('[asaas-webhook] Erro ao processar cancelamento de assinatura:', err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  }

  // 3. Tratar Evento: Fatura Vencida / Não Paga (PAYMENT_OVERDUE)
  if (event === 'PAYMENT_OVERDUE') {
    const workspaceId = payment?.externalReference || '';
    if (!workspaceId) {
      console.warn('[asaas-webhook] Notificacao de vencimento sem externalReference.');
      return res.status(200).json({ success: false, error: 'Missing payment externalReference' });
    }

    try {
      const workspaceRef = db.collection('workspaces').doc(workspaceId);
      const workspaceSnap = await workspaceRef.get();

      if (!workspaceSnap.exists) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Marcar como Vencido e zerar créditos operacionais
      await workspaceRef.update({
        billingPlan: 'Vencido',
        creditsBalance: 0,
        updatedAt: new Date().toISOString()
      });

      const ownerUid = workspaceSnap.data()?.ownerUid;
      if (ownerUid) {
        await db.collection('users').doc(ownerUid).update({
          plan: 'Vencido',
          updatedAt: new Date().toISOString()
        });
      }

      await db.collection('changelog_events').add({
        workspaceId,
        type: 'billing',
        title: 'Fatura Atrasada / Vencida ⚠️',
        content: `A cobrança recorrente está vencida no Asaas. O cockpit foi suspenso temporariamente até a confirmação do pagamento.`,
        createdAt: new Date().toISOString()
      });

      console.log(`[asaas-webhook] Workspace ${workspaceId} suspenso devido a fatura vencida.`);
      return res.status(200).json({ success: true, message: 'Workspace suspended due to overdue payment' });
    } catch (err) {
      console.error('[asaas-webhook] Erro ao suspender workspace por vencimento:', err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  }

  // 4. Tratar Eventos de Sucesso: Pagamento Recebido/Confirmado
  const isPaymentConfirmed = event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED';
  if (!isPaymentConfirmed) {
    console.log(`[asaas-webhook] Ignorando evento secundario: ${event}`);
    return res.status(200).json({ success: true, message: `Ignored event: ${event}` });
  }

  // Extrair ID do Workspace e Nome do Plano do externalReference
  // Formato esperado: "workspaceId" ou "workspaceId|NomeDoPlano"
  let workspaceId = payment?.externalReference || '';
  let planName = 'Mensal';

  if (workspaceId.includes('|')) {
    const parts = workspaceId.split('|');
    workspaceId = parts[0];
    planName = parts[1];
  }

  if (!workspaceId) {
    console.warn('[asaas-webhook] Pagamento recebido sem externalReference.');
    return res.status(200).json({ success: false, error: 'Missing externalReference' });
  }

  try {
    const billingTypeMap = {
      CREDIT_CARD: 'Cartão de Crédito',
      PIX: 'Pix',
      BOLETO: 'Boleto Bancário'
    };
    const methodStr = billingTypeMap[payment.billingType] || payment.billingType || 'Método desconhecido';

    await db.runTransaction(async (transaction) => {
      const paymentLockRef = db.collection('asaas_payments').doc(payment.id);
      const paymentLockSnap = await transaction.get(paymentLockRef);

      if (paymentLockSnap.exists) {
        throw new Error('ALREADY_PROCESSED');
      }

      const workspaceRef = db.collection('workspaces').doc(workspaceId);
      const workspaceSnap = await transaction.get(workspaceRef);

      if (!workspaceSnap.exists) {
        throw new Error('WORKSPACE_NOT_FOUND');
      }

      const workspaceData = workspaceSnap.data() || {};
      const ownerUid = workspaceData.ownerUid;
      const currentCredits = Number(workspaceData.creditsBalance || 0);

      // 1. Update Workspace Plan & Credits Atomically
      transaction.update(workspaceRef, {
        billingPlan: planName,
        creditsBalance: currentCredits + 500,
        updatedAt: new Date().toISOString()
      });

      // 2. Update User Plan
      if (ownerUid) {
        const userRef = db.collection('users').doc(ownerUid);
        transaction.update(userRef, {
          plan: planName,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Write Lock Document Atomically
      transaction.set(paymentLockRef, {
        workspaceId,
        value: payment.value,
        billingType: payment.billingType,
        event,
        planName,
        processedAt: new Date().toISOString()
      });
    });

    // Write changelog outside transaction boundary
    await db.collection('changelog_events').add({
      workspaceId,
      type: 'billing',
      title: 'Assinatura Ativada 🎉',
      content: `Plano ${planName} ativado com sucesso via Asaas (${methodStr}). Quota de 500 créditos adicionada ao saldo.`,
      createdAt: new Date().toISOString()
    });

    console.log(`[asaas-webhook] Transacao ${payment.id} processada com sucesso (+500 creditos).`);
    return res.status(200).json({ success: true, message: 'Workspace upgraded successfully' });
  } catch (err) {
    if (err.message === 'ALREADY_PROCESSED') {
      console.log(`[asaas-webhook] Transacao ${payment.id} ja processada.`);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }
    if (err.message === 'WORKSPACE_NOT_FOUND') {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    console.error('[asaas-webhook] Erro ao processar pagamento confirmado:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
