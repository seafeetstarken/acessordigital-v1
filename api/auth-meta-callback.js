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
      console.log('[auth-meta-callback] Firebase Admin inicializado.');
    } catch (err) {
      console.error('[auth-meta-callback] Erro Firebase Admin:', err);
    }
  }
}

export default async function handler(req, res) {
  const { code, state } = req.query || {};

  // O parâmetro 'state' carrega o workspaceId correspondente
  const workspaceId = state;

  if (!code || !workspaceId) {
    console.warn('[auth-meta-callback] Codigo ou Workspace ID ausentes na requisição.');
    return res.status(400).send('Bad Request: missing auth code or workspace state.');
  }

  const clientId = process.env.META_CLIENT_ID || '1005343792207733';
  const clientSecret = process.env.META_CLIENT_SECRET;

  if (!clientSecret) {
    console.error('[auth-meta-callback] META_CLIENT_SECRET nao configurada nas variaveis de ambiente.');
    return res.status(500).send('Server Error: META_CLIENT_SECRET is missing.');
  }

  // Determinar dinamicamente a URI de redirecionamento (suporta localhost e producao)
  const host = req.headers.host || 'www.acessordigital.com.br';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth-meta-callback`;

  try {
    // 1. Trocar o código de autorização pelo User Access Token de longa duração
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?` + 
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }).toString()
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[auth-meta-callback] Erro ao trocar codigo por token:', tokenData.error);
      return res.status(400).json({ error: 'Auth failed', details: tokenData.error });
    }

    const userAccessToken = tokenData.access_token;

    // 2. Buscar as Páginas do Facebook vinculadas ao usuário
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?` + 
      new URLSearchParams({
        access_token: userAccessToken,
        limit: '100'
      }).toString()
    );

    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error('[auth-meta-callback] Erro ao listar paginas do usuario:', pagesData.error);
      return res.status(400).json({ error: 'Failed to fetch pages', details: pagesData.error });
    }

    const pagesList = pagesData.data || [];
    if (pagesList.length === 0) {
      console.warn('[auth-meta-callback] Nenhuma pagina do Facebook encontrada para o usuario.');
      return res.status(400).send('Nenhuma página do Facebook foi encontrada para esta conta.');
    }

    // Listar as páginas estruturadas para gravação
    const metaPages = [];

    // 3. Buscar contas do Instagram conectadas a cada página
    for (const page of pagesList) {
      let instagramAccountId = null;
      try {
        const igResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        if (igResponse.ok) {
          const igData = await igResponse.json();
          if (igData.instagram_business_account) {
            instagramAccountId = igData.instagram_business_account.id;
          }
        }
      } catch (igErr) {
        console.error(`[auth-meta-callback] Erro ao verificar Instagram para a pagina ${page.id}:`, igErr);
      }

      metaPages.push({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        instagramAccountId: instagramAccountId,
        category: page.category || ''
      });
    }

    // 4. Selecionar a primeira página como ativa por padrão
    const activePage = metaPages[0];

    // 5. Salvar dados no documento do Workspace no Firestore
    const db = admin.firestore();
    const workspaceRef = db.collection('workspaces').doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      console.error(`[auth-meta-callback] Workspace ${workspaceId} nao encontrado no Firestore.`);
      return res.status(404).send('Workspace não encontrado.');
    }

    await workspaceRef.update({
      metaUserAccessToken: userAccessToken,
      metaPages: metaPages,
      activeMetaPageId: activePage.pageId,
      activeMetaPageAccessToken: activePage.pageAccessToken,
      activeMetaPageName: activePage.pageName,
      activeInstagramAccountId: activePage.instagramAccountId || '',
      updatedAt: new Date().toISOString()
    });

    console.log(`[auth-meta-callback] Conexao da Meta salva no Workspace ${workspaceId}: Página Ativa: ${activePage.pageName}`);

    // 6. Gravar evento de conexão no changelog_events
    let connectionDesc = `Página "${activePage.pageName}" conectada com sucesso ao Acessor Digital.`;
    if (activePage.instagramAccountId) {
      connectionDesc += ` Conta do Instagram Direct associada (ID: ${activePage.instagramAccountId}).`;
    }

    await db.collection('changelog_events').add({
      workspaceId,
      type: 'integration',
      title: 'Meta Conectado 🔗',
      content: connectionDesc,
      createdAt: new Date().toISOString()
    });

    // 7. Redirecionar o usuário de volta para a tela de configurações com flag de sucesso
    res.writeHead(302, { Location: `/app/configuracoes.html?meta_connection=success` });
    res.end();

  } catch (err) {
    console.error('[auth-meta-callback] Erro crítico no callback do Meta Auth:', err);
    return res.status(500).send(`Internal Server Error: ${err.message}`);
  }
}
