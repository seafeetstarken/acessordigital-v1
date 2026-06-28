import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccountKeyB64 = process.env.GA_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKeyB64) {
    try {
      const serviceAccountJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[create-subscription] Firebase Admin inicializado com sucesso.');
    } catch (err) {
      console.error('[create-subscription] Erro ao inicializar Firebase Admin:', err);
    }
  } else {
    console.warn('[create-subscription] GA_SERVICE_ACCOUNT_KEY nao configurada.');
  }
}

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fullName, companyName, whatsapp, email, password, plan, paymentMethod } = req.body || {};

  if (!fullName || !companyName || !whatsapp || !email || !password || !plan || !paymentMethod) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios no payload.' });
  }

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    console.error('[create-subscription] ASAAS_API_KEY nao configurada no servidor.');
    return res.status(500).json({ error: 'Integração com Asaas indisponível no momento.' });
  }

  // Determine Asaas URL (Sandbox vs Production) based on key prefix
  const asaasBaseUrl = process.env.ASAAS_API_URL || 
    (apiKey.startsWith('$') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3');

  try {
    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Verify if user already exists in Firebase Auth to prevent collision
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`[create-subscription] Usuário existente encontrado para email ${email}`);
    } catch (e) {
      // User does not exist, create a new one
      userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName
      });
      console.log(`[create-subscription] Novo usuário criado com ID: ${userRecord.uid}`);
    }

    const workspaceId = userRecord.uid;
    const slug = companyName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `workspace-${workspaceId.substring(0, 8)}`;

    // 2. Query or Create Asaas Customer
    let customerId = '';
    console.log(`[create-subscription] Consultando cliente no Asaas para email: ${email}`);
    
    const searchRes = await fetch(`${asaasBaseUrl}/customers?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: { 'access_token': apiKey }
    });
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
        console.log(`[create-subscription] Cliente Asaas existente encontrado: ${customerId}`);
      }
    }

    if (!customerId) {
      console.log(`[create-subscription] Criando novo cliente no Asaas...`);
      const createCustomerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey
        },
        body: JSON.stringify({
          name: fullName,
          email: email,
          phone: whatsapp.replace(/\D/g, ''),
          notificationDisabled: true
        })
      });

      if (!createCustomerRes.ok) {
        const errText = await createCustomerRes.text();
        throw new Error(`Falha ao criar cliente no Asaas: ${errText}`);
      }
      const customerData = await createCustomerRes.json();
      customerId = customerData.id;
      console.log(`[create-subscription] Novo cliente Asaas criado: ${customerId}`);
    }

    // 3. Map Plan and Create Subscription in Asaas
    const planPrices = { monthly: 129.00, semiannual: 654.00, annual: 1068.00 };
    const planCycles = { monthly: 'MONTHLY', semiannual: 'SEMIANNUAL', annual: 'YEARLY' };
    const planLabels = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };

    const price = planPrices[plan] || 129.00;
    const cycle = planCycles[plan] || 'MONTHLY';
    const label = planLabels[plan] || 'Mensal';

    // Format nextDueDate to tomorrow (yyyy-MM-dd)
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    const nextDueDateStr = `${yyyy}-${mm}-${dd}`;

    console.log(`[create-subscription] Criando assinatura no Asaas. Plano: ${label}, Ciclo: ${cycle}, Preço: ${price}`);
    const createSubRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: paymentMethod, // 'PIX' or 'CREDIT_CARD'
        value: price,
        nextDueDate: nextDueDateStr,
        cycle: cycle,
        description: `Assinatura Acessor Digital - Plano ${label}`,
        externalReference: `${workspaceId}|${label}`
      })
    });

    if (!createSubRes.ok) {
      const errText = await createSubRes.text();
      throw new Error(`Falha ao criar assinatura no Asaas: ${errText}`);
    }
    const subData = await createSubRes.json();
    console.log(`[create-subscription] Assinatura Asaas criada: ${subData.id}`);

    // 4. Register Workspace document in Firestore as Pendente
    const workspaceRef = db.collection('workspaces').doc(workspaceId);
    await workspaceRef.set({
      id: workspaceId,
      name: companyName,
      slug: slug,
      billingPlan: 'Pendente',
      creditsBalance: 0,
      creditsTotal: 500,
      ownerUid: workspaceId,
      ownerEmail: email,
      asaasCustomerId: customerId,
      asaasSubscriptionId: subData.id,
      billing_cycle_start: new Date().toISOString(),
      channels: { whatsapp: false, instagram: false, messenger: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 5. Register User Profile in Firestore
    await db.collection('users').doc(workspaceId).set({
      uid: workspaceId,
      email: email,
      displayName: fullName,
      companyName: companyName,
      whatsapp: whatsapp,
      plan: 'Pendente',
      workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 6. If Pix: Fetch the QR Code of the first generated payment
    let pixData = null;
    if (paymentMethod === 'PIX') {
      console.log(`[create-subscription] Buscando cobranças geradas para a assinatura: ${subData.id}`);
      // Wait 1.5 seconds for Asaas async charge creation
      await new Promise(r => setTimeout(r, 1500));

      const paymentsRes = await fetch(`${asaasBaseUrl}/payments?subscription=${subData.id}`, {
        method: 'GET',
        headers: { 'access_token': apiKey }
      });

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        if (paymentsData.data && paymentsData.data.length > 0) {
          const firstPaymentId = paymentsData.data[0].id;
          console.log(`[create-subscription] Buscando QR code para o pagamento: ${firstPaymentId}`);
          
          const qrCodeRes = await fetch(`${asaasBaseUrl}/payments/${firstPaymentId}/pixQrCode`, {
            method: 'GET',
            headers: { 'access_token': apiKey }
          });

          if (qrCodeRes.ok) {
            pixData = await qrCodeRes.json();
            console.log('[create-subscription] QR code Pix gerado com sucesso.');
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      workspaceId,
      subscriptionId: subData.id,
      customerId,
      pix: pixData // { encodedImage, payload }
    });

  } catch (err) {
    console.error('[create-subscription] Erro geral no handler:', err);
    return res.status(500).json({ error: 'Erro interno ao processar faturamento: ' + err.message });
  }
}
