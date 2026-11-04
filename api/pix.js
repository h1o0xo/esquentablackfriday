/**
 * Vercel Serverless Function — SigiloPay Pix
 * POST /api/pix
 *
 * Body: { name, email, phone, document, qty, bumps, totalAmount }
 * Env:  SIGILOPAY_PUBLIC_KEY, SIGILOPAY_SECRET_KEY
 */

const SIGILOPAY_ENDPOINT = 'https://app.sigilopay.com.br/api/v1/gateway/pix/receive';
const UNIT_PRICE = 127.90; // Preço JBL PartyBox 520 em Reais

// ── Produto ───────────────────────────────────────────────────────────────────
const PRODUCT_ID   = 'jbl-partybox-520';
const PRODUCT_NAME = 'JBL PartyBox 520';
// ─────────────────────────────────────────────────────────────────────────────

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

function generateIdentifier() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JBL-${ts}-${rand}`;
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const publicKey = (process.env.SIGILOPAY_PUBLIC_KEY || '').trim();
  const secretKey = (process.env.SIGILOPAY_SECRET_KEY || '').trim();

  if (!publicKey || !secretKey) {
    console.error('[pix] Missing SIGILOPAY_PUBLIC_KEY or SIGILOPAY_SECRET_KEY');
    return res.status(500).json({
      errorCode: 'GATEWAY_NOT_CONFIGURED',
      message:   'Gateway de pagamento não configurado. Adicione SIGILOPAY_PUBLIC_KEY e SIGILOPAY_SECRET_KEY na Vercel.',
    });
  }

  const {
    name,
    email,
    phone,
    document,
    qty = 1,
    bumps = [],
    totalAmount,
  } = req.body || {};

  // Validação de campos obrigatórios (mesmos da versão anterior)
  const missing = [];
  if (!name)     missing.push('name');
  if (!document) missing.push('document');

  if (missing.length) {
    return res.status(400).json({
      errorCode: 'MISSING_FIELDS',
      message:   'Campos obrigatórios ausentes.',
      details:   missing,
    });
  }

  const cleanDoc   = String(document).replace(/\D/g, '');
  const identifier = generateIdentifier();

  // A SigiloPay exige email e telefone; se o checkout não enviar, usa valores de reserva
  const clientEmail = email || `${cleanDoc}@cliente.pedido.com`;
  const clientPhone = phone ? String(phone).replace(/\D/g, '') : '11999999999';

  const quantity   = Math.max(1, Math.min(10, parseInt(qty, 10) || 1));
  const bumpsList  = Array.isArray(bumps) ? bumps : [];
  const bumpsTotal = bumpsList.reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0);
  const finalPrice = totalAmount
    ? parseFloat(totalAmount)
    : (UNIT_PRICE * quantity) + bumpsTotal;

  // SigiloPay trabalha em REAIS (não centavos)
  const amount = parseFloat(finalPrice.toFixed(2));
  const callbackUrl = `${getBaseUrl(req)}/api/callback`;

  const products = [
    {
      id:       PRODUCT_ID,
      name:     PRODUCT_NAME,
      quantity,
      price:    UNIT_PRICE,
    },
    ...bumpsList.map((b, i) => ({
      id:       `bump-${i + 1}`,
      name:     b.name || `Adicional ${i + 1}`,
      quantity: 1,
      price:    parseFloat(b.price) || 0,
    })),
  ];

  const payload = {
    identifier,
    amount,
    client: {
      name,
      email:    clientEmail,
      phone:    clientPhone,
      document: cleanDoc,
    },
    products,
    callbackUrl,
    metadata: {
      customerDoc: cleanDoc,
      phone:       clientPhone,
      qty:         quantity,
      bumps:       bumpsList.map(b => b.name).filter(Boolean),
    },
  };

  let response;
  try {
    response = await fetch(SIGILOPAY_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': publicKey,
        'x-secret-key': secretKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[pix] Network error calling SigiloPay:', err);
    return res.status(502).json({
      errorCode: 'GATEWAY_UNREACHABLE',
      message:   'Não foi possível conectar ao gateway de pagamento. Tente novamente.',
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

  const pixCode = data.pix?.code || null;
  // Se o gateway não mandar a imagem, gera o QR Code a partir do copia e cola
  const pixImage =
    data.pix?.base64 ||
    data.pix?.image ||
    (pixCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`
      : null);

  // Mesmo formato de resposta da versão PushinPay (o front-end não precisa mudar)
  return res.status(200).json({
    transactionId: data.transactionId,
    status:        data.status || 'PENDING',
    identifier,
    amount,
    pix: {
      code:  pixCode,
      image: pixImage,
    },
  });
}
