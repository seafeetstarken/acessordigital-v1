/**
 * api/meta-ads.js - Vercel Serverless Function
 * Proxy seguro para a Meta Marketing API (Graph API v23.0)
 * Token nunca exposto ao frontend.
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.META_MARKETING_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    return res.status(500).json({
      error: 'META_MARKETING_TOKEN ou META_AD_ACCOUNT_ID nao configurado.',
      hint: 'Adicione as variaveis de ambiente no painel Vercel -> Settings -> Environment Variables.'
    });
  }

  const query = req.method === 'POST' ? req.body : req.query;
  const { endpoint = 'insights', date_preset = 'last_30d', fields, breakdown, limit = 50 } = query;

  const defaultFields = {
    insights: 'campaign_name,impressions,reach,clicks,spend,cpc,cpm,ctr,actions,date_start,date_stop',
    campaigns: 'id,name,status,objective,daily_budget,budget_remaining,start_time',
    adcreatives: 'id,name,title,body,image_url,url_tags,call_to_action_type',
    ads: 'id,name,status,adset_id,campaign_id,insights{impressions,clicks,spend,ctr,cpm,cpc}'
  };

  const resolvedFields = fields || defaultFields[endpoint] || defaultFields.insights;

  let url;
  const params = new URLSearchParams({ access_token: token, limit: String(limit) });

  if (endpoint === 'insights') {
    url = `https://graph.facebook.com/v23.0/${accountId}/insights`;
    params.set('fields', resolvedFields);
    params.set('date_preset', date_preset);
    params.set('level', 'campaign');
    if (breakdown) params.set('breakdowns', breakdown);
  } else if (endpoint === 'campaigns') {
    url = `https://graph.facebook.com/v23.0/${accountId}/campaigns`;
    params.set('fields', resolvedFields);
  } else if (endpoint === 'adcreatives') {
    url = `https://graph.facebook.com/v23.0/${accountId}/adcreatives`;
    params.set('fields', resolvedFields);
  } else if (endpoint === 'ads') {
    url = `https://graph.facebook.com/v23.0/${accountId}/ads`;
    params.set('fields', resolvedFields);
  } else {
    return res.status(400).json({ error: `Endpoint '${endpoint}' nao suportado.` });
  }

  try {
    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (data.error) {
      const isDevMode = data.error.code === 190 || data.error.code === 200 ||
        (data.error.message || '').toLowerCase().includes('development');
      return res.status(403).json({
        error: data.error,
        dev_mode: isDevMode,
        hint: isDevMode
          ? 'App em modo desenvolvimento. Adicione usuarios de teste no Facebook Developers ou solicite a verificacao do app.'
          : 'Verifique as permissoes da conta de anuncios.'
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      success: true,
      account_id: accountId,
      endpoint,
      date_preset,
      data: data.data || data,
      paging: data.paging || null,
      fetched_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[meta-ads.js] error:', err);
    return res.status(500).json({ error: 'Falha na conexao com Meta API.', details: err.message });
  }
}
