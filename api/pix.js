/**
 * Vercel Serverless Function — SigiloPay Pix & BACEN Fallback
 * POST /api/pix
 *
 * Body: { name, email, phone, document, qty, bumps, totalAmount, color, size }
 * Env:  SIGILOPAY_PUBLIC_KEY, SIGILOPAY_SECRET_KEY, CHAVE_PIX (opcional para fallback BACEN direto)
 */

const SIGILOPAY_ENDPOINTS = [
  'https://app.sigilopay.com.br/api/v1/payments',
  'https://api.sigilopay.com.br/v1/payments',
  'https://sigilopay.com.br/api/v1/payments',
  'https://api.sigilopay.com/v1/payments'
];

const UNIT_PRICE = 37.90; // Preço Conjunto Feminino Alfaiataria em Reais

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

/**
 * Gerador de Pix Estático Padrão Banco Central (BACEN / EMV BRCode)
 * Calcula CRC16-CCITT real para ser 100% aceito em qualquer app de banco
 */
function generateBacenPix(pixKey, merchantName, merchantCity, amount, txid) {
  function formatField(id, value) {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }
  const cleanKey = pixKey.trim();
  const name = (merchantName || 'ATELIE ALFAIATARIA').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 25);
  const city = (merchantCity || 'SAO PAULO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 15);
  const formattedAmount = Number(amount).toFixed(2);
  const cleanTxId = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  const accountInfo = formatField('00', 'br.gov.bcb.pix') + formatField('01', cleanKey);
  let payload = 
    formatField('00', '01') +
    formatField('26', accountInfo) +
    formatField('52', '0000') +
    formatField('53', '986') +
    formatField('54', formattedAmount) +
    formatField('58', 'BR') +
    formatField('59', name) +
    formatField('60', city) +
    formatField('62', formatField('05', cleanTxId)) +
    '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-public-key, x-secret-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Chaves de API da SigiloPay
  const clientID = (
    process.env.SIGILOPAY_PUBLIC_KEY ||
    process.env.SIGILOPAY_CLIENT_ID ||
    process.env.PUBLIC_KEY ||
    'wolfaliexpress_zijbnebdk66i56ur'
  ).trim();

  const clientSecret = (
    process.env.SIGILOPAY_SECRET_KEY ||
    process.env.SIGILOPAY_CLIENT_SECRET ||
    process.env.SECRET_KEY ||
    'xli5ckvi2hqyo9dyqqu2giu9qn6qwoyldjy38xsk0hd5fr6khywybcc3ehz2hn58'
  ).trim();

  // Chave Pix direta do lojista (opcional)
  const directPixKey = (
    process.env.CHAVE_PIX ||
    process.env.PIX_KEY ||
    process.env.CHAVE_PIX_LOJA ||
    ''
  ).trim();

  const rawToken = process.env.SIGILOPAY_TOKEN || process.env.TOKEN;
  const token = rawToken ? rawToken.trim().replace(/^Bearer\s+/i, '') : null;

  const { name, email, phone, document, qty = 1, bumps = [], totalAmount, color, size } = req.body || {};

  // Validação de campos obrigatórios
  const missing = [];
  if (!name)     missing.push('name');
  if (!document) missing.push('document');

  if (missing.length) {
    return res.status(400).json({
      errorCode: 'MISSING_FIELDS',
      message: 'Campos obrigatórios ausentes.',
      details: missing,
    });
  }

  const cleanDoc = String(document).replace(/\D/g, '');
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '11999999999';
  const cleanEmail = email && email.includes('@') ? email.trim() : `cliente_${cleanDoc || Date.now()}@gmail.com`;

  const quantity = Math.max(1, Math.min(10, parseInt(qty, 10) || 1));
  const bumpsTotal = Array.isArray(bumps) ? bumps.reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0) : 0;
  const finalPrice = totalAmount ? parseFloat(totalAmount) : (UNIT_PRICE * quantity) + bumpsTotal;

  const callbackUrl = `${getBaseUrl(req)}/api/callback`;
  const bumpsDesc = Array.isArray(bumps) && bumps.length ? ` + ${bumps.map(b => b.name).join(', ')}` : '';
  const variantStr = color ? ` - ${color} (${size || 'P'})` : '';
  const description = `Conjunto Alfaiataria${variantStr} — ${quantity}x${bumpsDesc}`.substring(0, 100);

  // Payload padrão da SigiloPay
  const payload = {
    amount: parseFloat(finalPrice.toFixed(2)),
    payment_method: 'pix',
    description: description,
    webhook_url: callbackUrl,
    customer: {
      name: name.trim(),
      cpf: cleanDoc,
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
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let gatewaySuccess = false;
  let qrCodeText = '';
  let qrCodeImage = '';
  let gatewayId = `SIG_${Date.now()}`;
  let lastError = null;

  // Tenta conectar nos endpoints conhecidos da SigiloPay
  for (const endpoint of SIGILOPAY_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        gatewayId = data.id || (data.data && data.data.id) || (data.payment && data.payment.id) || gatewayId;
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
          (data.data && (data.data.pix_qr_code_url || data.data.qr_code_image || data.data.qr_code_base64)) ||
          (data.pix && (data.pix.image || data.pix.qrcode_url)) ||
          '';

        if (qrCodeText) {
          gatewaySuccess = true;
          break;
        }
      } else {
        lastError = `Status ${response.status} de ${endpoint}`;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  // Se a SigiloPay gerou o Pix com sucesso:
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

  // Fallback: Se o lojista configurou CHAVE_PIX no .env ou se temos uma chave válida:
  if (directPixKey) {
    console.log('[pix] Gerando Pix padrão BACEN com chave direta:', directPixKey);
    const validPixCode = generateBacenPix(directPixKey, 'ATELIE ALFAIATARIA', 'SAO PAULO', finalPrice, gatewayId);
    const validQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(validPixCode)}`;

    return res.status(200).json({
      success: true,
      transactionId: gatewayId,
      status: 'pending',
      amount: finalPrice,
      pix: {
        code: validPixCode,
        image: validQrImage,
      },
      source: 'direct_bacen'
    });
  }

  // Caso o gateway não tenha respondido e nenhuma chave Pix manual tenha sido fornecida:
  console.warn('[pix] Gateway SigiloPay indisponível e sem CHAVE_PIX cadastrada:', lastError);
  return res.status(502).json({
    success: false,
    errorCode: 'GATEWAY_ERROR',
    message: 'Não foi possível gerar a cobrança no momento. Verifique as credenciais da SigiloPay ou defina CHAVE_PIX no painel.',
    details: lastError
  });
}
