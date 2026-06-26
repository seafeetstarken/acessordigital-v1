/**
 * api/google-ads.js - Vercel Serverless Function
 * Proxy seguro para a Google Ads API via OAuth2.
 * Credenciais nunca expostas ao frontend.
 */
import { GoogleAdsApi } from 'google-ads-api';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  const {
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_CUSTOMER_ID
  } = process.env;

  if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
    return res.status(500).json({
      error: 'Variaveis de ambiente do Google Ads nao configuradas.',
      missing: [
        !GOOGLE_ADS_DEVELOPER_TOKEN && 'GOOGLE_ADS_DEVELOPER_TOKEN',
        !GOOGLE_ADS_CLIENT_ID && 'GOOGLE_ADS_CLIENT_ID',
        !GOOGLE_ADS_CLIENT_SECRET && 'GOOGLE_ADS_CLIENT_SECRET',
        !GOOGLE_ADS_REFRESH_TOKEN && 'GOOGLE_ADS_REFRESH_TOKEN',
        !GOOGLE_ADS_CUSTOMER_ID && 'GOOGLE_ADS_CUSTOMER_ID'
      ].filter(Boolean)
    });
  }

  const query = req.method === 'POST' ? req.body : req.query;
  const { report = 'campaigns', date_range = 'LAST_30_DAYS' } = query;

  const GAQL_QUERIES = {
    campaigns: `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date DURING ${date_range}
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `,
    keywords: `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        quality_info.quality_score
      FROM keyword_view
      WHERE segments.date DURING ${date_range}
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `,
    conversions: `
      SELECT
        conversion_action.name,
        conversion_action.category,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion,
        segments.conversion_action_name
      FROM conversion_action
      WHERE segments.date DURING ${date_range}
      ORDER BY metrics.conversions DESC
    `
  };

  const gaql = GAQL_QUERIES[report];
  if (!gaql) {
    return res.status(400).json({ error: `Report '${report}' nao suportado. Use: campaigns, keywords, conversions` });
  }

  try {
    const client = new GoogleAdsApi({
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      developer_token: GOOGLE_ADS_DEVELOPER_TOKEN
    });

    const customer = client.Customer({
      customer_id: GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN
    });

    const rows = await customer.query(gaql);

    // Normalizar micros -> reais para campos monetarios
    const normalized = rows.map(row => {
      const r = { ...row };
      if (r.metrics) {
        if (r.metrics.cost_micros !== undefined) r.metrics.cost_brl = r.metrics.cost_micros / 1000000;
        if (r.metrics.average_cpc !== undefined) r.metrics.average_cpc_brl = r.metrics.average_cpc / 1000000;
        if (r.metrics.cost_per_conversion !== undefined) r.metrics.cost_per_conversion_brl = r.metrics.cost_per_conversion / 1000000;
      }
      if (r.campaign_budget?.amount_micros !== undefined) {
        r.campaign_budget.amount_brl = r.campaign_budget.amount_micros / 1000000;
      }
      return r;
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      success: true,
      customer_id: GOOGLE_ADS_CUSTOMER_ID,
      report,
      date_range,
      count: normalized.length,
      data: normalized,
      fetched_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('[google-ads.js] error:', err);
    return res.status(500).json({
      error: 'Falha na conexao com Google Ads API.',
      details: err.message,
      hint: 'Verifique o refresh token e as permissoes da conta.'
    });
  }
}
