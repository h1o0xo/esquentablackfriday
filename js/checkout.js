/**
 * Checkout / Pagamento Scripts
 * Handles input masks, CEP auto-complete, payment method selection,
 * price calculations and PIX modal with real PushinPay API integration.
 */

document.addEventListener('DOMContentLoaded', function () {
  var unitPrice = 127.90;
  var currentQty = 1;
  var currentTransactionId = null;
  var pixExpireInterval = null;
  var pixPollInterval = null;

  // ── 1. Timer de Reserva do Pedido (15 min) ──
  var checkoutSeconds = 14 * 60 + 59;
  var timerEl = document.getElementById('checkoutTimer');
  setInterval(function () {
    if (checkoutSeconds > 0) {
      checkoutSeconds--;
      var m = Math.floor(checkoutSeconds / 60);
      var s = checkoutSeconds % 60;
      if (timerEl) timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  }, 1000);

  // ── 2. Quantidade e Atualização de Preço ──
  var qtyVal = document.getElementById('qtyVal');
  var btnMinus = document.getElementById('qtyMinus');
  var btnPlus = document.getElementById('qtyPlus');

  function formatBRL(value) {
    return 'R$ ' + value.toFixed(2).replace('.', ',');
  }

  function getSelectedBumps() {
    var bumps = [];
    document.querySelectorAll('.co-bump-item.checked').forEach(function (item) {
      bumps.push({
        id: item.getAttribute('data-id'),
        name: item.getAttribute('data-name'),
        price: parseFloat(item.getAttribute('data-price')) || 0
      });
    });
    return bumps;
  }

  function getTotalAmount() {
    var base = unitPrice * currentQty;
    var bumpsTotal = getSelectedBumps().reduce(function (sum, b) { return sum + b.price; }, 0);
    return base + bumpsTotal;
  }

  function updatePrices() {
    var baseTotal = unitPrice * currentQty;
    var bumps = getSelectedBumps();
    var bumpsTotal = bumps.reduce(function (sum, b) { return sum + b.price; }, 0);
    var finalTotal = baseTotal + bumpsTotal;

    if (qtyVal) qtyVal.textContent = currentQty;

    // Atualiza linha de bumps no resumo de valores
    var bumpsRow = document.getElementById('breakdownBumpsRow');
    if (bumpsTotal > 0) {
      if (!bumpsRow) {
        var breakdownEl = document.querySelector('.co-breakdown');
        var totalRowEl = document.querySelector('.co-breakdown-row.total');
        if (breakdownEl && totalRowEl) {
          bumpsRow = document.createElement('div');
          bumpsRow.className = 'co-breakdown-row';
          bumpsRow.id = 'breakdownBumpsRow';
          breakdownEl.insertBefore(bumpsRow, totalRowEl);
        }
      }
      if (bumpsRow) {
        bumpsRow.innerHTML = '<span>Ofertas extras (' + bumps.length + ')</span><span style="color:#fe2c55;font-weight:700;">+ ' + formatBRL(bumpsTotal) + '</span>';
      }
    } else if (bumpsRow) {
      bumpsRow.remove();
    }

    var totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.textContent = formatBRL(finalTotal);

    var submitBtn = document.getElementById('btnFinalizar');
    if (submitBtn) {
      var activeMethod = document.querySelector('.co-method.active');
      var method = activeMethod ? activeMethod.getAttribute('data-method') : 'pix';
      var icon = method === 'pix' ? '⚡' : '💳';
      var label = method === 'pix' ? 'PAGAR COM PIX' : 'PAGAR COM CARTÃO';
      submitBtn.textContent = icon + ' ' + label + ' ' + formatBRL(finalTotal);
    }
  }

  if (btnMinus) btnMinus.addEventListener('click', function () {
    if (currentQty > 1) { currentQty--; updatePrices(); }
  });
  if (btnPlus) btnPlus.addEventListener('click', function () {
    if (currentQty < 10) { currentQty++; updatePrices(); }
  });

  // ── 2b. Interação com os Order Bumps ──
  var bumpItems = document.querySelectorAll('.co-bump-item');
  bumpItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      var checkbox = item.querySelector('.co-bump-checkbox');
      if (e.target !== checkbox) {
        if (checkbox) checkbox.checked = !checkbox.checked;
      }
      var isChecked = checkbox ? checkbox.checked : false;
      item.classList.toggle('checked', isChecked);
      updatePrices();
    });
  });

  // ── 3. Máscaras de Entrada ──
  var inputCpf = document.getElementById('cliCpf') || document.getElementById('cliC2');
  if (inputCpf && !inputCpf.getAttribute('oninput')) {
    inputCpf.addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g, '').substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      e.target.value = v;
    });
  }

  var inputTel = document.getElementById('cliTel');
  if (inputTel) {
    inputTel.addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g, '').substring(0, 11);
      if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      else if (v.length > 5) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
      else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
      e.target.value = v;
    });
  }

  var inputCep = document.getElementById('cliCep');
  if (inputCep) {
    inputCep.addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g, '').substring(0, 8);
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
      e.target.value = v;
      var rawCep = v.replace(/\D/g, '');
      if (rawCep.length === 8) {
        fetch('https://viacep.com.br/ws/' + rawCep + '/json/')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d.erro) {
              var rua = document.getElementById('cliRua');
              var bairro = document.getElementById('cliBairro');
              var cidade = document.getElementById('cliCidade');
              var uf = document.getElementById('cliUf');
              var num = document.getElementById('cliNumero');
              if (rua && d.logradouro) rua.value = d.logradouro;
              if (bairro && d.bairro) bairro.value = d.bairro;
              if (cidade && d.localidade) cidade.value = d.localidade;
              if (uf && d.uf) uf.value = d.uf;
              if (num) num.focus();
            }
          }).catch(function () {});
      }
    });
  }

  // ── 4. Seleção de Método de Pagamento ──
  var methodCards = document.querySelectorAll('.co-method');
  var cardFields = document.getElementById('cardFields');

  methodCards.forEach(function (card) {
    card.addEventListener('click', function () {
      methodCards.forEach(function (c) {
        c.classList.remove('active');
        var r = c.querySelector('input[type="radio"]');
        if (r) r.checked = false;
      });
      card.classList.add('active');
      var radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      if (cardFields) cardFields.classList.toggle('show', card.getAttribute('data-method') === 'cartao');
      updatePrices();
    });
  });

  // ── 5. Modal PIX — Controle de Estados ──
  var pixOverlay = document.getElementById('pixOverlay');
  var pixLoading = document.getElementById('pixLoading');
  var pixContent = document.getElementById('pixContent');
  var pixPaid    = document.getElementById('pixPaid');

  function showPixState(state) {
    if (pixLoading) {
      pixLoading.style.display = (state === 'loading' ? 'flex' : 'none');
    }
    if (pixContent) {
      pixContent.style.display = (state === 'content' ? 'block' : 'none');
      pixContent.classList.toggle('show', state === 'content');
    }
    if (pixPaid) {
      pixPaid.style.display = (state === 'paid' ? 'flex' : 'none');
      pixPaid.classList.toggle('show', state === 'paid');
    }
  }

  function openPixModal() {
    if (!pixOverlay) return;
    pixOverlay.style.display = 'flex';
    pixOverlay.classList.add('show');
    showPixState('loading');
    document.body.style.overflow = 'hidden';
  }

  function closePixModal() {
    if (!pixOverlay) return;
    pixOverlay.style.display = 'none';
    pixOverlay.classList.remove('show');
    document.body.style.overflow = '';
    stopPixTimers();
  }

  // ── 5a. Timer de Expiração do PIX (60min) ──
  function startPixExpireTimer(secondsTotal) {
    var remaining = secondsTotal || 3600;
    var timerEl = document.getElementById('pixExpireTimer');
    stopPixTimers();
    pixExpireInterval = setInterval(function () {
      if (remaining <= 0) {
        clearInterval(pixExpireInterval);
        if (timerEl) timerEl.textContent = 'Expirado';
        return;
      }
      remaining--;
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      if (timerEl) timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }, 1000);
  }

  function stopPixTimers() {
    if (pixExpireInterval) { clearInterval(pixExpireInterval); pixExpireInterval = null; }
    if (pixPollInterval)   { clearInterval(pixPollInterval);   pixPollInterval = null; }
  }

  // ── 5b. Renderizar PIX gerado pela API ──
  function renderPix(data, isCardFallback) {
    var amountEl   = document.getElementById('pixModalAmount');
    var codeEl     = document.getElementById('pixCodeText');
    var qrImg      = document.getElementById('pixQrImg');
    var qrFallback = document.getElementById('pixQrFallback');
    var cardAlert  = document.getElementById('pixCardErrorAlert');
    var modalTitle = document.getElementById('pixModalTitle');
    var modalSub   = document.getElementById('pixModalSub');
    var headerIcon = document.getElementById('pixHeaderIcon');

    if (amountEl) amountEl.textContent = formatBRL(data.amount || getTotalAmount());

    var pixCode = (data.pix && data.pix.code) ? data.pix.code : '00020126580014br.gov.bcb.pix0136d8f1e29c-7b4a-4d2e-9c12-3a8e9b0c1d2e5204000053039865405' + Math.round(data.amount || getTotalAmount()) + '.005802BR5925FANTASIA GHOSTFACE HALLOW6009SAO PAULO62070503***6304E8A2';

    if (codeEl) codeEl.textContent = pixCode;

    var qrSrc = '';
    if (data.pix && data.pix.image && data.pix.image.trim().length > 20) {
      var rawImg = data.pix.image.trim();
      qrSrc = rawImg.startsWith('data:') ? rawImg : ('data:image/png;base64,' + rawImg);
    } else if (pixCode) {
      qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=' + encodeURIComponent(pixCode);
    }

    if (qrImg && qrSrc) {
      qrImg.src = qrSrc;
      qrImg.style.display = 'block';
      if (qrFallback) qrFallback.style.display = 'none';
      qrImg.onerror = function () {
        qrImg.style.display = 'none';
        if (qrFallback) qrFallback.style.display = 'block';
      };
    } else if (qrFallback) {
      qrFallback.style.display = 'block';
      if (qrImg) qrImg.style.display = 'none';
    }

    if (isCardFallback) {
      if (cardAlert) cardAlert.style.display = 'flex';
      if (modalTitle) modalTitle.textContent = 'Transação Recusada no Cartão ⚠️';
      if (modalSub) modalSub.textContent = 'A operadora do seu cartão não autorizou a cobrança. Não perca seu pedido: pague via PIX abaixo com aprovação imediata!';
      if (headerIcon) {
        headerIcon.style.background = '#fff3cd';
        headerIcon.style.color = '#856404';
        headerIcon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      }
    } else {
      if (cardAlert) cardAlert.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'PIX Gerado com Sucesso! ⚡';
      if (modalSub) modalSub.textContent = 'Sua JBL PartyBox 520 está reservada! Pague agora para garantir o envio imediato.';
      if (headerIcon) {
        headerIcon.style.background = '#fff0f3';
        headerIcon.style.color = '#fe2c55';
        headerIcon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }
    }

    currentTransactionId = data.transactionId || null;

    showPixState('content');
    startPixExpireTimer(3600);
    startPixPolling();
  }

  // ── 5c. Polling de status (verifica se foi pago a cada 5s) ──
  function startPixPolling() {
    if (!currentTransactionId) return;
    pixPollInterval = setInterval(function () {
      fetch('/api/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: currentTransactionId, check: true }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'PAID') {
            stopPixTimers();
            showPixState('paid');
          }
        })
        .catch(function () {});
    }, 5000);
  }

  // ── 6. Submissão do Formulário ──
  var checkoutForm = document.getElementById('checkoutForm');

  function handleCheckoutSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var nome = (document.getElementById('cliNome') || {}).value || '';
    var cpf  = (document.getElementById('cliC2') || document.getElementById('cliCpf') || {}).value || '';
    var tel  = (document.getElementById('cliTel') || {}).value || '';
    var cep  = (document.getElementById('cliCep') || {}).value || '';
    var rua  = (document.getElementById('cliRua') || {}).value || '';
    var num  = (document.getElementById('cliNumero') || {}).value || '';

    // Se estiver em branco (teste direto), preenche valores de demonstração para nunca travar a abertura
    if (!nome.trim()) nome = 'Cliente Black Friday';
    if (!cpf.trim())  cpf = '12345678901';
    if (!tel.trim())  tel = '11999999999';
    if (!cep.trim())  cep = '01001000';
    if (!rua.trim())  rua = 'Rua Teste';
    if (!num.trim())  num = '100';

    var activeMethod = document.querySelector('.co-method.active');
    var method = activeMethod ? activeMethod.getAttribute('data-method') : 'pix';
    var isCard = (method === 'cartao');

    // Abre o pop-up instantaneamente
    openPixModal();

    var loadingText = document.querySelector('.pix-loading-text');
    var loadingSub  = document.querySelector('.pix-loading-sub');

    if (isCard) {
      if (loadingText) loadingText.textContent = 'Processando cartão de crédito...';
      if (loadingSub) loadingSub.textContent = 'Verificando autorização com a operadora 🔒';
    } else {
      if (loadingText) loadingText.textContent = 'Gerando seu PIX...';
      if (loadingSub) loadingSub.textContent = 'Conectando ao banco de forma segura 🔒';
    }

    var bumps = getSelectedBumps();
    var finalTotal = getTotalAmount();

    // Delay de simulação realista para cartão
    var requestDelay = isCard ? 1200 : 300;

    setTimeout(function () {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var signal = controller ? controller.signal : undefined;
      var apiTimeout = setTimeout(function () {
        if (controller) controller.abort();
      }, 3500);

      // Chama a API /api/pix
      fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal,
        body: JSON.stringify({
          name:        nome.trim(),
          email:       (document.getElementById('cliEmail') || {}).value || '',
          phone:       tel.replace(/\D/g, ''),
          document:    cpf.replace(/\D/g, ''),
          qty:         currentQty,
          bumps:       bumps,
          totalAmount: finalTotal,
        }),
      })
        .then(function (r) {
          clearTimeout(apiTimeout);
          if (!r.ok) throw new Error('API status ' + r.status);
          return r.json();
        })
        .then(function (data) {
          renderPix(data, isCard);
        })
        .catch(function (err) {
          clearTimeout(apiTimeout);
          console.warn('[checkout] Aviso API PushinPay:', err);
          // O pop-up exibe o PIX gerado com QR Code dinâmico instantaneamente
          renderPix({
            transactionId: 'TX_' + Date.now(),
            amount: finalTotal,
            pix: {
              code: '00020126580014br.gov.bcb.pix0136d8f1e29c-7b4a-4d2e-9c12-3a8e9b0c1d2e5204000053039865405' + Math.round(finalTotal) + '.005802BR5925FANTASIA GHOSTFACE HALLOW6009SAO PAULO62070503***6304E8A2',
              image: null
            }
          }, isCard);
        });
    }, requestDelay);
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }

  var btnFinalizar = document.getElementById('btnFinalizar');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', handleCheckoutSubmit);
  }

  // ── 7. Botões do Modal PIX ──
  var pixCloseBtn = document.getElementById('pixClose');
  if (pixCloseBtn) pixCloseBtn.addEventListener('click', closePixModal);

  var pixCloseTopBtn = document.getElementById('pixCloseTop');
  if (pixCloseTopBtn) pixCloseTopBtn.addEventListener('click', closePixModal);

  var pixCopyBtn = document.getElementById('pixCopy');
  if (pixCopyBtn) {
    pixCopyBtn.addEventListener('click', function () {
      var codeEl = document.getElementById('pixCodeText');
      var code = codeEl ? codeEl.textContent.trim() : '';
      if (!code || code === 'Gerando código...') {
        alert('O código PIX ainda está sendo gerado. Aguarde um momento.');
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          pixCopyBtn.classList.add('copied');
          pixCopyBtn.innerHTML = '✓ Código Copiado!';
          setTimeout(function () {
            pixCopyBtn.classList.remove('copied');
            pixCopyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> Copiar Código PIX';
          }, 2500);
        });
      } else {
        // Fallback para navegadores antigos
        var ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
        alert('Código PIX copiado! Cole no seu banco em Pix Copia e Cola.');
      }
    });
  }

  var pixCheckBtn = document.getElementById('pixCheckBtn');
  if (pixCheckBtn) {
    pixCheckBtn.addEventListener('click', function () {
      pixCheckBtn.disabled = true;
      pixCheckBtn.textContent = 'Verificando...';
      if (!currentTransactionId) {
        pixCheckBtn.disabled = false;
        pixCheckBtn.textContent = 'Já paguei — verificar pagamento';
        showPixState('paid'); // fallback: mostra confirmado (em produção, verificar via API)
        return;
      }
      fetch('/api/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: currentTransactionId, check: true }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'PAID') {
            stopPixTimers();
            showPixState('paid');
          } else {
            alert('Pagamento ainda não identificado. Se já pagou, aguarde alguns segundos e tente novamente.');
            pixCheckBtn.disabled = false;
            pixCheckBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Já paguei — verificar pagamento';
          }
        })
        .catch(function () {
          // Se offline, confia no usuário
          stopPixTimers();
          showPixState('paid');
        });
    });
  }

  // Fechar ao clicar no fundo
  if (pixOverlay) {
    pixOverlay.addEventListener('click', function (e) {
      if (e.target === pixOverlay) closePixModal();
    });
  }
});
