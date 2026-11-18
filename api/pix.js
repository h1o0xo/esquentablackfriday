/**
 * Vercel Serverless Function — SigiloPay Pix
 * POST /api/pix
 */

const SIGILOPAY_ENDPOINTS = [
  'https://api.sigilopay.com/v1/payments',
  'https://api.sigilopay.com/v1/transaction',
  'https://api.sigilopay.com/v1/pix/cashIn',
  'https://app.sigilopay.com.br/api/v1/payments',
  'https://app.sigilopay.com.br/v1/payments',
  'https://app.sigilopay.com.br/api/v1/transaction',
  'https://app.sigilopay.com.br/api/v1/gateway/pay',
  'https://sigilopay.com.br/api/v1/payments'
];

const UNIT_PRICE = 37.90;

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-public-key, x-secret-key, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientID = (
    process.env.SIGILOPAY_PUBLIC_KEY ||
    process.env.SIGILOPAY_CLIENT_ID ||
    'wolfaliexpress_5vvzdyprsezqivwq'
  ).trim();

  const clientSecret = (
    process.env.SIGILOPAY_SECRET_KEY ||
    process.env.SIGILOPAY_CLIENT_SECRET ||
    'mjb7sw0cu31uusl4g91xk3p9dsfbilxmdfk53zby6gup7yqypw63t5awdad6es64'
  ).trim();

  const { name, email, phone, document, qty = 1, bumps = [], totalAmount, color, size } = req.body || {};

  const missing = [];
  if (!name) missing.push('name');
  if (!document) missing.push('document');
  if (missing.length) {
    return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: 'Campos obrigatórios ausentes.', details: missing });
  }

  const cleanDoc = String(document).replace(/\D/g, '');
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '11999999999';
  const cleanEmail = email && email.includes('@') ? email.trim() : `cliente_${cleanDoc}@gmail.com`;

  const quantity = Math.max(1, Math.min(10, parseInt(qty, 10) || 1));
  const bumpsTotal = Array.isArray(bumps) ? bumps.reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0) : 0;
  const finalPrice = totalAmount ? parseFloat(totalAmount) : (UNIT_PRICE * quantity) + bumpsTotal;

  const callbackUrl = `${getBaseUrl(req)}/api/callback`;
  const bumpsDesc = Array.isArray(bumps) && bumps.length ? ` + ${bumps.map(b => b.name).join(', ')}` : '';
  const variantStr = color ? ` - ${color} (${size || 'P'})` : '';
  const description = `Conjunto Alfaiataria${variantStr} — ${quantity}x${bumpsDesc}`.substring(0, 100);

  const payload = {
    amount: parseFloat(finalPrice.toFixed(2)),
    payment_method: 'pix',
    description: description,
    webhook_url: callbackUrl,
    customer: {
      name: name.trim(),
      cpf: cleanDoc,
      taxId: cleanDoc,
      taxID: cleanDoc,
      document: cleanDoc,
      email: cleanEmail,
      phone: cleanPhone,
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-public-key': clientID,
    'x-secret-key': clientSecret,
    'Authorization': `Bearer ${clientSecret}`,
  };

  let qrCodeText = '';
  let qrCodeImage = '';
  let gatewayId = `SIG_${Date.now()}`;
  let gatewaySuccess = false;
  const attempts = [];

  for (const endpoint of SIGILOPAY_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const text = await response.text().catch(() => '');
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}

      attempts.push({
        endpoint: endpoint,
        status: response.status,
        body: text.substring(0, 150)
      });

      if (response.ok && data) {
        gatewayId = data.id || (data.data && data.data.id) || gatewayId;
        qrCodeText =
          data.pix_copia_e_cola ||
          data.qr_code_text ||
          data.qr_code ||
          (data.data && (data.data.pix_copia_e_cola || data.data.qr_code_text || data.data.qr_code)) ||
          (data.pix && (data.pix.code || data.pix.qrcode)) ||
          '';

        qrCodeImage =
          data.pix_qr_code_url ||
          data.qr_code_image ||
          data.qr_code_base64 ||
          (data.data && (data.data.pix_qr_code_url || data.data.qr_code_image)) ||
          (data.pix && (data.pix.image || data.pix.qrcode_url)) ||
          '';

        if (qrCodeText) {
          gatewaySuccess = true;
          break;
        }
      }
    } catch (err) {
      attempts.push({ endpoint: endpoint, error: err.message });
    }
  }

  if (gatewaySuccess && qrCodeText) {
    if (!qrCodeImage) {
      qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeText)}`;
    }
    return res.status(200).json({
      success: true,
      transactionId: gatewayId,
      status: 'pending',
      amount: finalPrice,
      pix: {
        code: qrCodeText,
        image: qrCodeImage,
      },
    });
  }

  return res.status(502).json({
    success: false,
    errorCode: 'GATEWAY_ERROR',
    message: 'SigiloPay retornou erro ou endpoint indisponível.',
    attempts: attempts,
  });
}
