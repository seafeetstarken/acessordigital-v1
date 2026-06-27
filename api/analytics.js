/**
 * api/analytics.js - Vercel Serverless Function
 * Proxy seguro para a Google Analytics Data API v1beta.
 * Service account JSON nunca exposta ao frontend.
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { GA_SERVICE_ACCOUNT_KEY, GA_PROPERTY_ID } = process.env;

  if (!GA_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'GA_SERVICE_ACCOUNT_KEY nao configurado.',
      hint: 'Adicione a variavel de ambiente no painel Vercel.'
    });
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(
      Buffer.from(GA_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
  } catch (e) {
    return res.status(500).json({ error: 'GA_SERVICE_ACCOUNT_KEY invalido (deve ser JSON em base64).' });
  }

  const query = req.method === 'POST' ? req.body : req.query;
  const { workspaceId, report = 'overview', start_date = '30daysAgo', end_date = 'today' } = query;

  let propertyId = GA_PROPERTY_ID;

  if (workspaceId) {
    try {
      const { default: admin } = await import('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      const db = admin.firestore();
      const workspaceSnap = await db.collection('workspaces').doc(workspaceId).get();
      if (workspaceSnap.exists) {
        const data = workspaceSnap.data() || {};
        if (data.gaPropertyId) {
          propertyId = data.gaPropertyId;
        }
      }
    } catch (dbErr) {
      console.error('[analytics] Erro ao carregar gaPropertyId do workspace no Firestore:', dbErr);
    }
  }

  if (!propertyId) {
    return res.status(500).json({
      error: 'GA_PROPERTY_ID nao configurado.',
      hint: 'Configure a propriedade do Google Analytics no painel ou adicione a variavel de ambiente.'
    });
  }

  // Definicoes de reports disponiveis
  const REPORTS = {
    overview: {
      dateRanges: [{ startDate: start_date, endDate: end_date }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' }
      ],
      dimensions: [{ name: 'date' }]
    },
    sources: {
      dateRanges: [{ startDate: start_date, endDate: end_date }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }],
      dimensions: [{ name: 'sessionDefaultChannelGrouping' }, { name: 'sessionSource' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    },
    pages: {
      dateRanges: [{ startDate: start_date, endDate: end_date }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    },
    geo: {
      dateRanges: [{ startDate: start_date, endDate: end_date }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensions: [{ name: 'city' }, { name: 'region' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20
    }
  };

  const reportBody = REPORTS[report];
  if (!reportBody) {
    return res.status(400).json({ error: `Report '${report}' nao suportado. Use: overview, sources, pages, geo` });
  }

  // Autenticar com JWT usando a service account
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reportBody)
    });

    const data = await response.json();

    if (data.error) {
      return res.status(response.status || 400).json({
        error: data.error,
        hint: 'Verifique se a conta de servico tem permissao de Leitor na propriedade GA4.'
      });
    }

    // Normalizar rows para formato mais simples
    const headers = [
      ...(data.dimensionHeaders || []).map(h => h.name),
      ...(data.metricHeaders || []).map(h => h.name)
    ];

    const rows = (data.rows || []).map(row => {
      const obj = {};
      const dims = (row.dimensionValues || []).map(v => v.value);
      const mets = (row.metricValues || []).map(v => v.value);
      headers.forEach((h, i) => {
        obj[h] = [...dims, ...mets][i];
      });
      return obj;
    });

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    return res.status(200).json({
      success: true,
      property_id: propertyId,
      report,
      start_date,
      end_date,
      row_count: data.rowCount || rows.length,
      data: rows,
      totals: data.totals || null,
      fetched_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('[analytics.js] error:', err);
    return res.status(500).json({
      error: 'Falha na conexao com Google Analytics Data API.',
      details: err.message
    });
  }
}
