export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN nao configurado nas variaveis de ambiente.' });
  }

  const { recipientId, text, channel } = req.body;

  if (!recipientId || !text) {
    return res.status(400).json({ error: 'recipientId e text sao obrigatorios.' });
  }

  console.log(`[meta-send] Enviando resposta para ${recipientId} via canal ${channel || 'Messenger'}: "${text}"`);

  try {
    // Para Instagram ou Messenger, a API de envio do Graph API usa a rota 'me/messages' com o Token da Página
    const url = `https://graph.facebook.com/v23.0/me/messages?access_token=${token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('[meta-send] Erro da Graph API:', data.error);
      return res.status(400).json({ success: false, error: data.error });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[meta-send] Excecao ao enviar mensagem:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
