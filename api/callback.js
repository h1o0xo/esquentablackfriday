/**
 * Vercel Serverless Function — SigiloPay Callback
 * POST /api/callback
 *
 * Recebe as atualizações de status de pagamento da SigiloPay.
 * Estenda esta função para atualizar banco de dados, enviar e-mails, etc.
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

  console.log('[callback] Payment status update:', {
    transactionId,
    identifier,
    status,
    amount,
    fee,
  });

  /**
   * Possíveis valores de status:
   *
   * PENDING   — aguardando pagamento
   * PAID      — pago
   * EXPIRED   — expirado
   * REFUNDED  — estornado
   * CANCELLED — cancelado
   */

  if (status === 'PAID') {
    // TODO: marcar pedido como pago no banco de dados
    // TODO: enviar confirmação por WhatsApp/e-mail ao cliente
    console.log('[callback] ✓ Pagamento confirmado — JBL PartyBox 520:', transactionId);
    console.log('[callback] Dados do pedido:', metadata);
  }

  // Sempre retorna 200 para a SigiloPay parar de reenviar
  return res.status(200).json({ received: true });
}
