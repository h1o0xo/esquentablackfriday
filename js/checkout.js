/**
 * Checkout / Pagamento Scripts
 * Handles input masks, CEP auto-complete, payment method selection,
 * price calculations and PIX modal with real SigiloPay API integration.
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
  if (inputCpf) {
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

  // ── 4. Seleção de Método de Pagamento (CORRIGIDO PARA ABRIR CARTÃO) ──
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
      
      var method = card.getAttribute('data-method');
      if (cardFields) {
        if (method === 'cartao') {
          cardFields.classList.add('show');
          cardFields.style.display = 'block'; // Força exibição caso o CSS dependa disso
        } else {
          cardFields.classList.remove('show');
          cardFields.style.display = 'none';
        }
      }
      updatePrices();
    });
  });

  // ── 5. Modal PIX — Controle de Estados ──
  var pixOverlay = document.getElementById('pixOverlay');
  var pixLoading = document.getElementById('pixLoading');
  var pixContent = document.getElementById('pixContent');
  var pixPaid    = document.getElementById('pixPaid');

  function showPixState(state) {
    if (pixLoading) pixLoading.style.display = (state === 'loading' ? 'flex' : 'none');
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

function renderPix(data, isCardFallback) {
    var amountEl   = document.getElementById('pixModalAmount');
    var codeEl     = document.getElementById('pixCodeText');
    var qrImg      = document.getElementById('pixQrImg');
    var qrFallback = document.getElementById('pixQrFallback');
    var cardAlert  = document.getElementById('pixCardErrorAlert');
    var modalTitle = document.getElementById('pixModalTitle');
    var modalSub   = document.getElementById('pixModalSub');

    if (amountEl) amountEl.textContent = formatBRL(data.amount || getTotalAmount());

    var pixCode = (data.pix && data.pix.code) ? data.pix.code : '';
    if (codeEl) codeEl.textContent = pixCode;

    // OCULTA DEFINITIVAMENTE A IMAGEM ANTIGA DE BAIXO
    if (qrImg) {
      qrImg.style.display = 'none';
      qrImg.src = '';
    }
    if (qrFallback) qrFallback.style.display = 'none';

    // Cria ou atualiza apenas o QR code limpo e perfeito em cima
    var qrContainer = qrImg ? qrImg.parentElement : null;
    if (qrContainer && pixCode) {
      var existingCanvasDiv = document.getElementById('nativeQrCanvas');
      if (!existingCanvasDiv) {
        existingCanvasDiv = document.createElement('div');
        existingCanvasDiv.id = 'nativeQrCanvas';
        existingCanvasDiv.style.display = 'flex';
        existingCanvasDiv.style.justifyContent = 'center';
        existingCanvasDiv.style.margin = '10px 0';
        qrContainer.appendChild(existingCanvasDiv);
      } else {
        existingCanvasDiv.innerHTML = '';
      }

      try {
        new QRCode(existingCanvasDiv, {
          text: pixCode,
          width: 160,
          height: 160,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        console.error("Erro ao gerar QR code nativo:", e);
      }
    }

    // Restante do código da função...

    if (isCardFallback) {
      if (cardAlert) cardAlert.style.display = 'flex';
      if (modalTitle) modalTitle.textContent = 'Transação Recusada no Cartão ⚠️';
      if (modalSub) modalSub.textContent = 'A operadora não autorizou. Pague via PIX abaixo:';
    } else {
      if (cardAlert) cardAlert.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'PIX Gerado com Sucesso! ⚡';
      if (modalSub) modalSub.textContent = 'Sua JBL PartyBox 520 está reservada! Pague agora.';
    }

    currentTransactionId = data.transactionId || null;
    showPixState('content');
    startPixExpireTimer(3600);
    startPixPolling();
  }

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

  // ── 6. Submissão do Formulário (Garante o Clique do Botão) ──
  var checkoutForm = document.getElementById('checkoutForm');

  function handleCheckoutSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var nome = (document.getElementById('cliNome') || {}).value || 'Cliente Teste';
    var cpf  = (document.getElementById('cliC2') || document.getElementById('cliCpf') || {}).value || '12345678901';
    var tel  = (document.getElementById('cliTel') || {}).value || '11999999999';

    var activeMethod = document.querySelector('.co-method.active');
    var method = activeMethod ? activeMethod.getAttribute('data-method') : 'pix';
    var isCard = (method === 'cartao');

    openPixModal();

    var loadingText = document.querySelector('.pix-loading-text');
    var loadingSub  = document.querySelector('.pix-loading-sub');

    if (isCard) {
      if (loadingText) loadingText.textContent = 'Processando cartão de crédito...';
      if (loadingSub) loadingSub.textContent = 'Verificando autorização 🔒';
    } else {
      if (loadingText) loadingText.textContent = 'Gerando seu PIX...';
      if (loadingSub) loadingSub.textContent = 'Conectando ao banco de forma segura 🔒';
    }

    var bumps = getSelectedBumps();
    var finalTotal = getTotalAmount();

    setTimeout(function () {
      fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.message || 'Erro HTTP ' + r.status);
            return data;
          });
        })
        .then(function (data) {
          renderPix(data, isCard);
        })
        .catch(function (err) {
          console.error('[checkout] Erro ao comunicar com a API /api/pix:', err);
          alert('Erro ao gerar o pagamento: ' + err.message);
          closePixModal();
        });
    }, 400);
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }

  var btnFinalizar = document.getElementById('btnFinalizar');
  if (btnFinalizar) {
    // Garante tanto o click quanto o touchstart para dispositivos móveis
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
      if (!code) {
        alert('Código PIX indisponível.');
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          pixCopyBtn.innerHTML = '✓ Código Copiado!';
          setTimeout(function () {
            pixCopyBtn.innerHTML = 'Copiar Código PIX';
          }, 2500);
        });
      }
    });
  }
});
