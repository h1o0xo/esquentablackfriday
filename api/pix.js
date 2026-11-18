/**
 * Vercel Serverless Function — SigiloPay Pix
 * POST /api/pix
 */

const SIGILOPAY_ENDPOINT = 'https://app.sigilopay.com.br/api/v1/gateway/pix/receive';
const UNIT_PRICE = 37.90; // Preço Conjunto Alfaiataria

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-public-key, x-secret-key, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const publicKey = (
    process.env.SIGILOPAY_PUBLIC_KEY ||
    process.env.SIGILOPAY_CLIENT_ID ||
    'wolfaliexpress_5vvzdyprsezqivwq'
  ).trim();

  const secretKey = (
    process.env.SIGILOPAY_SECRET_KEY ||
    process.env.SIGILOPAY_CLIENT_SECRET ||
    'mjb7sw0cu31uusl4g91xk3p9dsfbilxmdfk53zby6gup7yqypw63t5awdad6es64'
  ).trim();

  const {
    name,
    email,
    phone,
    document,
    qty = 1,
    bumps = [],
    totalAmount,
    color = 'Preto',
    size = 'P'
  } = req.body || {};

  // Proteção: se o cliente não digitar algum dado, usamos fallback automático para NUNCA travar
  const cleanName  = (name && name.trim()) ? name.trim() : 'Cliente';
  const cleanDoc   = (document && String(document).replace(/\D/g, '')) ? String(document).replace(/\D/g, '') : '12345678901';
  const cleanPhone = (phone && String(phone).replace(/\D/g, '')) ? String(phone).replace(/\D/g, '') : '11999999999';
  const cleanEmail = (email && email.includes('@')) ? email.trim() : `cliente_${cleanDoc}@gmail.com`;

  const quantity   = Math.max(1, Math.min(10, parseInt(qty, 10) || 1));
  const bumpsTotal = Array.isArray(bumps) ? bumps.reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0) : 0;
  const finalPrice = totalAmount ? parseFloat(parseFloat(totalAmount).toFixed(2)) : parseFloat(((UNIT_PRICE * quantity) + bumpsTotal).toFixed(2));

  const identifier  = generateIdentifier();
  const callbackUrl = `${getBaseUrl(req)}/api/callback`;

  // Monta produtos no formato que a SigiloPay exige
  const products = [
    {
      id:       'conjunto-alfaiataria',
      name:     `Conjunto Alfaiataria (${color} - Tam ${size})`,
      quantity: quantity,
      price:    UNIT_PRICE,
    }
  ];

  if (Array.isArray(bumps) && bumps.length > 0) {
    bumps.forEach((b, idx) => {
      products.push({
        id:       `bump-${idx + 1}`,
        name:     b.name || `Oferta Extra ${idx + 1}`,
        quantity: 1,
        price:    parseFloat(b.price) || 0,
      });
    });
  }

  const metadata = {
    customerDoc: cleanDoc,
    phone:       cleanPhone,
    color,
    size,
    quantity,
    bumpsCount:  bumps.length,
  };

  const payload = {
    identifier,
    amount: finalPrice,
    client: {
      name:     cleanName,
      email:    cleanEmail,
      phone:    cleanPhone,
      document: cleanDoc,
    },
    products,
    callbackUrl,
    metadata,
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
      message:   'Não foi possível conectar ao gateway SigiloPay. Tente novamente.',
    });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return res.status(502).json({
      errorCode: 'INVALID_GATEWAY_RESPONSE',
      message:   'Resposta inválida do gateway SigiloPay.',
    });
  }

  if (!response.ok) {
    console.error('[pix] SigiloPay error:', response.status, data);
    return res.status(response.status).json({
      errorCode: data.errorCode || 'GATEWAY_ERROR',
      message:   data.message   || 'Erro ao gerar cobrança Pix na SigiloPay.',
      details:   data.details   || data,
    });
  }

  // Código Pix Copia e Cola retornado pela SigiloPay
  const pixCode =
    data.pix?.code ||
    data.pix_copia_e_cola ||
    data.qr_code ||
    data.qr_code_text ||
    (data.data && (data.data.pix?.code || data.data.pix_copia_e_cola || data.data.qr_code)) ||
    null;

  // Imagem do QR Code: se a SigiloPay mandar usamos ela, senão geramos dinamicamente via QRServer
  let pixImage =
    data.pix?.image ||
    data.pix_qr_code_url ||
    data.qr_code_image ||
    data.qr_code_base64 ||
    (data.data && (data.data.pix?.image || data.data.pix_qr_code_url)) ||
    null;

  if (!pixImage && pixCode) {
    pixImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
  }

  return res.status(200).json({
    success:       true,
    transactionId: data.transactionId || identifier,
    status:        data.status || 'pending',
    identifier,
    amount:        finalPrice,
    pix: {
      code:  pixCode,
      image: pixImage,
    },
  });
}
