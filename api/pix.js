/**
 * Vercel Serverless Function — SigiloPay Pix
 * POST /api/pix
 */

const SIGILOPAY_ENDPOINT = 'https://app.sigilopay.com.br/api/v1/gateway/pix/receive';
const UNIT_PRICE = 37.90;

const PRODUCT_ID   = 'conjunto-alfaiataria';
const PRODUCT_NAME = 'Conjunto Feminino Alfaiataria';

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

function generateIdentifier() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ALF-${ts}-${rand}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // Puxa diretamente das chaves configuradas na Vercel
  const publicKey = (process.env.SIGILOPAY_PUBLIC_KEY || 'wolfaliexpress_5vvzdyprsezqivwq').trim();
  const secretKey = (process.env.SIGILOPAY_SECRET_KEY || 'mjb7sw0cu31uusl4g91xk3p9dsfbilxmdfk53zby6gup7yqypw63t5awdad6es64').trim();

  if (!publicKey || !secretKey) {
    return res.status(500).json({
      errorCode: 'GATEWAY_NOT_CONFIGURED',
      message:   'Chaves da SigiloPay não configuradas na Vercel.',
    });
  }

  const {
    name,
    email,
    phone,
    document,
  } = req.body || {};

  const cleanDoc   = document ? String(document).replace(/\D/g, '') : '';
  const cleanName  = (name && name.trim()) ? name.trim() : 'Cliente';
  const cleanPhone = (phone && String(phone).replace(/\D/g, '')) ? String(phone).replace(/\D/g, '') : '11999999999';
  const cleanEmail = (email && email.trim()) ? email.trim() : `cliente_${cleanDoc || 'pix'}@gmail.com`;

  const quantity   = 1;
  const amount     = UNIT_PRICE;
  const identifier = generateIdentifier();
  const callbackUrl = `${getBaseUrl(req)}/api/callback`;

  const payload = {
    identifier,
    amount,
    client: {
      name:     cleanName,
      email:    cleanEmail,
      phone:    cleanPhone,
      document: cleanDoc,
    },
    products: [
      {
        id:        PRODUCT_ID,
        name:      PRODUCT_NAME,
        quantity,
        price:     UNIT_PRICE,
      },
    ],
    callbackUrl,
  };

  let response;
  try {
    response = await fetch(SIGILOPAY_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-public-key':  publicKey,
        'x-secret-key':  secretKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[pix] Network error calling SigiloPay:', err);
    return res.status(502).json({
      errorCode: 'GATEWAY_UNREACHABLE',
      message:   'Não foi possível conectar ao gateway de pagamento.',
    });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return res.status(502).json({
      errorCode: 'INVALID_GATEWAY_RESPONSE',
      message:   'Resposta inválida do gateway.',
    });
  }

  if (!response.ok) {
    console.error('[pix] SigiloPay error:', response.status, data);
    return res.status(response.status).json({
      errorCode: data.errorCode || 'GATEWAY_ERROR',
      message:   data.message   || 'Erro ao gerar cobrança Pix.',
      details:   data.details,
    });
  }

  const pixCode =
    data.pix?.code ||
    data.pix_copia_e_cola ||
    data.qr_code ||
    data.qr_code_text ||
    null;

  let pixImage =
    data.pix?.image ||
    data.pix_qr_code_url ||
    data.qr_code_image ||
    null;

  if (!pixImage && pixCode) {
    pixImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
  }

  return res.status(200).json({
    success:       true,
    transactionId: data.transactionId || identifier,
    status:        data.status,
    identifier,
    amount,
    pix: {
      code:  pixCode,
      image: pixImage,
    },
  });
}
