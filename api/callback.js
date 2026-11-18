/**
 * Vercel Serverless Function — SigiloPay Callback
 * POST /api/callback
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    transactionId,
    identifier,
    status,
    amount,
    fee,
    order,
    pix,
    metadata,
  } = req.body || {};

  console.log('[callback] SigiloPay Status Update:', {
    transactionId,
    identifier,
    status,
    amount,
  });

  if (status === 'PAID') {
    console.log('[callback] ✓ Pagamento confirmado na SigiloPay:', transactionId);
  }

  return res.status(200).json({ received: true });
}
