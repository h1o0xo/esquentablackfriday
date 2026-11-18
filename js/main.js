/**
 * Main Product Page Scripts
 * Handles Carousel, Countdown Timer, Dynamic Dates, Modals, Variants and Shipping
 */

document.addEventListener('DOMContentLoaded', function () {
  // ─── 1. Timer Regressivo (Esquenta Black Friday) ───
  var totalSeconds = 8 * 60 + 27; // 8 minutos e 27 segundos
  function updateTimer() {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var mmEl = document.getElementById('mm');
    var ssEl = document.getElementById('ss');
    if (mmEl) mmEl.textContent = String(minutes).padStart(2, '0');
    if (ssEl) ssEl.textContent = String(seconds).padStart(2, '0');
    if (totalSeconds > 0) {
      totalSeconds--;
    } else {
      totalSeconds = 15 * 60; // reinicia ciclo de urgência
    }
  }
  updateTimer();
  setInterval(updateTimer, 1000);

  // ─── 2. Data Promocional Dinâmica (Hoje) ───
  var now = new Date();
  var day = String(now.getDate()).padStart(2, '0');
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var promoEl = document.getElementById('promoDate');
  if (promoEl) {
    promoEl.textContent = '🔥 PROMO ' + day + '.' + month;
  }

  // ─── 3. Data de Envio Estimada Dinâmica ───
  var meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  var dateMin = new Date();
  dateMin.setDate(dateMin.getDate() + 2);
  var dateMax = new Date();
  dateMax.setDate(dateMax.getDate() + 4);
  var shipEl = document.getElementById('shipDate');
  if (shipEl) {
    if (dateMin.getMonth() === dateMax.getMonth()) {
      shipEl.textContent = 'Chegará com Frete Grátis (' + dateMin.getDate() + ' a ' + dateMax.getDate() + ' de ' + meses[dateMin.getMonth()] + ')';
    } else {
      shipEl.textContent = 'Chegará com Frete Grátis (' + dateMin.getDate() + ' de ' + meses[dateMin.getMonth()] + ' a ' + dateMax.getDate() + ' de ' + meses[dateMax.getMonth()] + ')';
    }
  }

  // ─── 4. Carrossel de Imagens Interativo (Fluido sem travar scroll) ───
  var track = document.getElementById('carTrack');
  var cur = document.getElementById('carCur');
  var prev = document.getElementById('carPrev');
  var next = document.getElementById('carNext');
  var slides = document.querySelectorAll('.car-slide');
  var total = slides.length || 11;
  var totalEl = document.getElementById('carTotal');
  if (totalEl) totalEl.textContent = String(total);
  var currentIndex = 0;

  function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= total) index = total - 1;
    currentIndex = index;

    if (track) {
      var slideWidth = track.clientWidth || track.offsetWidth;
      track.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
    }
    if (cur) cur.textContent = String(currentIndex + 1);
    if (prev) prev.classList.toggle('hidden', currentIndex === 0);
    if (next) next.classList.toggle('hidden', currentIndex === total - 1);
  }

  if (track) {
    track.addEventListener('scroll', function () {
      var slideWidth = track.clientWidth || track.offsetWidth;
      if (slideWidth > 0) {
        var i = Math.round(track.scrollLeft / slideWidth);
        if (i !== currentIndex && i >= 0 && i < total) {
          currentIndex = i;
          if (cur) cur.textContent = String(currentIndex + 1);
          if (prev) prev.classList.toggle('hidden', currentIndex === 0);
          if (next) next.classList.toggle('hidden', currentIndex === total - 1);

          // Sincroniza cor ativa ao deslizar o carrossel
          if (colorCards && colorCards[i]) {
            colorCards.forEach(function (c) { c.classList.remove('active'); });
            colorCards[i].classList.add('active');
            currentColor = colorCards[i].getAttribute('data-color') || 'Preto';
            currentImg = colorCards[i].getAttribute('data-img') || '';
            if (selectedColorLabel) selectedColorLabel.textContent = currentColor;
            updateCheckoutLinks();
          }
        }
      }
    }, { passive: true });
  }

  if (prev) prev.addEventListener('click', function () { goToSlide(currentIndex - 1); });
  if (next) next.addEventListener('click', function () { goToSlide(currentIndex + 1); });

  // ─── 5. Estado de Variantes & Links de Checkout Dinâmicos ───
  var currentColor = 'Preto';
  var currentSize = 'P';
  var currentImg = 'https://i.ibb.co/6JfmSc0Z/Gemini-Generated-Image-2yedqj2yedqj2yed.jpg';

  function updateCheckoutLinks() {
    try {
      localStorage.setItem('cart_color', currentColor);
      localStorage.setItem('cart_size', currentSize);
      localStorage.setItem('cart_img', currentImg);
    } catch (e) {}

    var links = document.querySelectorAll('a[href*="pagamento.html"]');
    var currentParams = new URLSearchParams(window.location.search);
    currentParams.set('cor', currentColor);
    currentParams.set('tamanho', currentSize);
    currentParams.set('img', currentImg);
    var queryString = currentParams.toString();

    links.forEach(function (link) {
      link.setAttribute('href', 'pagamento.html?' + queryString);
    });
  }

  // Inicializa os links de checkout no carregamento
  updateCheckoutLinks();

  // ─── 6. Seletor de Cores: Grid de Fotos (Semelhante à 5ª imagem) ───
  var colorCards = document.querySelectorAll('.pi-color-card');
  var selectedColorLabel = document.getElementById('selectedColorLabel');

  colorCards.forEach(function (card, index) {
    card.addEventListener('click', function () {
      colorCards.forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');

      currentColor = card.getAttribute('data-color') || 'Preto';
      currentImg = card.getAttribute('data-img') || 'https://i.ibb.co/6JfmSc0Z/Gemini-Generated-Image-2yedqj2yedqj2yed.jpg';

      if (selectedColorLabel) selectedColorLabel.textContent = currentColor;
      goToSlide(index);
      updateCheckoutLinks();
    });
  });

  // ─── 7. Seletor de Tamanhos: Botões Quadrados (Semelhante à 5ª imagem) ───
  var sizeBoxes = document.querySelectorAll('.pi-size-box');
  var selectedSizeLabel = document.getElementById('selectedSizeLabel');

  sizeBoxes.forEach(function (box) {
    box.addEventListener('click', function () {
      sizeBoxes.forEach(function (b) { b.classList.remove('active'); });
      box.classList.add('active');

      currentSize = box.getAttribute('data-size') || 'P';
      if (selectedSizeLabel) selectedSizeLabel.textContent = currentSize;
      updateCheckoutLinks();
    });
  });

  // ─── 8. Cálculo de Frete e Prazo com CEP ───
  var inputCep = document.getElementById('inputCepCalc');
  var btnCalcCep = document.getElementById('btnCalcCep');
  var cepShippingResult = document.getElementById('cepShippingResult');

  if (inputCep) {
    inputCep.addEventListener('input', function () {
      var v = inputCep.value.replace(/\D/g, '');
      if (v.length > 5) {
        inputCep.value = v.substring(0, 5) + '-' + v.substring(5, 8);
      } else {
        inputCep.value = v;
      }
    });

    inputCep.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnCalcCep) btnCalcCep.click();
      }
    });
  }

  if (btnCalcCep) {
    btnCalcCep.addEventListener('click', function () {
      var cepVal = (inputCep ? inputCep.value : '').replace(/\D/g, '');
      if (cepVal.length !== 8) {
        alert('Por favor, digite um CEP válido com 8 dígitos.');
        return;
      }
      btnCalcCep.textContent = 'Calculando...';
      btnCalcCep.disabled = true;

      fetch('https://viacep.com.br/ws/' + cepVal + '/json/')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          btnCalcCep.textContent = 'Calcular';
          btnCalcCep.disabled = false;
          if (cepShippingResult) {
            cepShippingResult.style.display = 'block';
            var localidade = data.localidade ? data.localidade + ' - ' + data.uf : 'sua região';
            cepShippingResult.innerHTML = 
              '<div class="pi-shipping-item">' +
                '<div class="pi-shipping-badge">Frete Grátis</div>' +
                '<div class="pi-shipping-info">' +
                  '<span>Envio Prioritário com Seguro para <strong>' + localidade + '</strong></span>' +
                  '<span class="pi-shipping-free">GRÁTIS (Hoje)</span>' +
                '</div>' +
              '</div>' +
              '<div style="font-size:12px;color:#00b578;font-weight:600;margin-top:6px;">✓ Prazo estimado: 2 a 4 dias úteis</div>';
          }
        })
        .catch(function () {
          btnCalcCep.textContent = 'Calcular';
          btnCalcCep.disabled = false;
          if (cepShippingResult) {
            cepShippingResult.style.display = 'block';
            cepShippingResult.innerHTML = 
              '<div class="pi-shipping-item">' +
                '<div class="pi-shipping-badge">Frete Grátis</div>' +
                '<div class="pi-shipping-info">' +
                  '<span>Envio Prioritário com Seguro para todo o Brasil</span>' +
                  '<span class="pi-shipping-free">GRÁTIS (Hoje)</span>' +
                '</div>' +
              '</div>' +
              '<div style="font-size:12px;color:#00b578;font-weight:600;margin-top:6px;">✓ Prazo estimado: 2 a 4 dias úteis</div>';
          }
        });
    });
  }

  // ─── 9. Modal de Formas de Pagamento (Idêntico à 2ª e 3ª imagem) ───
  var modalPaymentOverlay = document.getElementById('modalPaymentOverlay');
  var btnOpenPaymentModal = document.getElementById('btnOpenPaymentModal');
  var btnClosePaymentModal = document.getElementById('btnClosePaymentModal');

  function openPaymentModal(e) {
    if (e) e.preventDefault();
    if (modalPaymentOverlay) {
      modalPaymentOverlay.classList.add('show');
      modalPaymentOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closePaymentModal(e) {
    if (e) e.preventDefault();
    if (modalPaymentOverlay) {
      modalPaymentOverlay.classList.remove('show');
      modalPaymentOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (btnOpenPaymentModal) btnOpenPaymentModal.addEventListener('click', openPaymentModal);
  if (btnClosePaymentModal) btnClosePaymentModal.addEventListener('click', closePaymentModal);
  if (modalPaymentOverlay) {
    modalPaymentOverlay.addEventListener('click', function (e) {
      if (e.target === modalPaymentOverlay) closePaymentModal();
    });
  }

  // ─── 10. Modais Interativos (Loja, Chat, Avaliações) ───
  var built = { visit: false, chat: false, rev: false };

  function openModal(id) {
    var bd = document.getElementById(id + '-bd');
    var m = document.getElementById(id);
    if (!bd || !m) return;
    bd.style.display = 'block';
    m.style.display = 'block';
    requestAnimationFrame(function () {
      bd.classList.add('show');
      m.classList.add('show');
    });
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    var bd = document.getElementById(id + '-bd');
    var m = document.getElementById(id);
    if (!bd || !m) return;
    bd.classList.remove('show');
    m.classList.remove('show');
    setTimeout(function () {
      bd.style.display = 'none';
      m.style.display = 'none';
      document.body.style.overflow = '';
    }, 250);
  }

  function createModalShell(id, title, bodyHtml) {
    var bd = document.createElement('div');
    bd.className = 'cfx-mdl-bd';
    bd.id = id + '-bd';
    bd.style.display = 'none';
    bd.onclick = function () { closeModal(id); };

    var m = document.createElement('div');
    m.className = 'cfx-mdl';
    m.id = id;
    m.style.display = 'none';
    m.innerHTML = '<div class="cfx-mdl-hdr">' +
      '<div class="cfx-mdl-title">' + title + '</div>' +
      '<button class="cfx-mdl-close" type="button" aria-label="Fechar">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button></div>' +
      '<div class="cfx-mdl-body">' + bodyHtml + '</div>';

    m.querySelector('.cfx-mdl-close').onclick = function () { closeModal(id); };
    document.body.appendChild(bd);
    document.body.appendChild(m);
  }

  function buildVisit() {
    if (built.visit) return;
    built.visit = true;
    createModalShell('cfxVisit', "Ateliê & Alfaiataria Feminina Oficial",
      '<div class="cfx-store-row"><div class="cfx-store-logo" style="background:#111;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;border-radius:10px;width:48px;height:48px;">AF</div>' +
      '<div style="flex:1;"><div class="cfx-store-name">Ateliê & Alfaiataria Feminina Oficial</div>' +
      '<div class="cfx-store-meta">Loja oficial · 4.9 ★ · Alfaiataria Exclusiva</div></div></div>' +
      '<div class="cfx-store-stat"><div><strong>94.8K</strong><span>Vendidos</span></div>' +
      '<div><strong>4.9</strong><span>Avaliação</span></div>' +
      '<div><strong>100%</strong><span>Garantia</span></div></div>' +
      '<p style="font-size:13px;color:#555;line-height:1.6;margin-top:12px;">Loja oficial de alfaiataria feminina. Peças exclusivas com acabamento de alta costura, tecido nobre, modelagem impecável e envio imediato com seguro para todo o Brasil.</p>' +
      '<a href="pagamento.html" style="display:block;text-align:center;width:100%;margin-top:16px;padding:13px;background:linear-gradient(90deg, #ff3b30, #ff5e3a);color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Garantir Meu Conjunto Alfaiataria</a>'
    );
  }

  function buildChat() {
    if (built.chat) return;
    built.chat = true;
    createModalShell('cfxChat', 'Atendimento Exclusivo - Alfaiataria',
      '<div class="cfx-chat-msg">' +
      '<span class="cfx-chat-time">Hoje, online agora</span>' +
      '<div class="cfx-chat-bubble cfx-chat-them">Olá! Seja muito bem-vinda ao atendimento do Ateliê de Alfaiataria Feminina 👋</div>' +
      '<div class="cfx-chat-bubble cfx-chat-them">O <strong>Conjunto Calça Pantalona e Colete Curto</strong> está com 84% OFF no Esquenta Black Friday por apenas <strong>R$ 37,90</strong> (De R$ 239,90)!</div>' +
      '<span class="cfx-chat-time">Dúvidas sobre tamanho e tecido</span>' +
      '<div class="cfx-chat-bubble cfx-chat-them">O tecido tem 4% de elastano para conforto absoluto no movimento, não fica transparente e não amassa fácil. O envio é imediato com Frete Grátis hoje! ⚡</div>' +
      '</div>' +
      '<div style="margin-top:16px;text-align:center;">' +
      '<a href="pagamento.html" style="display:inline-block;padding:12px 24px;background:#ff3b30;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:13px;">Aproveitar Preço Black Friday</a>' +
      '</div>'
    );
  }

  function buildReviews() {
    if (built.rev) return;
    built.rev = true;
    var extras = [
      { n: 'Mariana S.', d: 'há 1 dia', t: 'O caimento é surreal de perfeito! O colete modela muito a cintura e a calça pantalona veste super bem com salto ou tênis.' },
      { n: 'Camila A.', d: 'há 2 dias', t: 'Chegou em 3 dias aqui em SP. O tecido é encorpado, botões muito bem costurados. Já virou meu look preferido!' },
      { n: 'Fernanda M.', d: 'há 3 dias', t: 'Comprei o tamanho P e ficou sob medida. O elastano dá muito conforto para usar o dia todo no trabalho.' },
      { n: 'Juliana P.', d: 'há 4 dias', t: 'Excelente custo-benefício! Nem acredito que paguei esse preço numa peça de alfaiataria tão bonita.' }
    ];
    var html = extras.map(function (e) {
      return '<div class="cfx-rev-extra"><span class="nm">' + e.n + '</span><span class="dt">' + e.d + '</span>' +
        '<div style="margin-top:4px;">' + e.t + '</div></div>';
    }).join('');
    createModalShell('cfxRev', 'Avaliações Verificadas das Clientes (148)', html +
      '<p style="text-align:center;font-size:12px;color:#888;margin-top:14px;">148 avaliações verificadas · 4.9 ★ de 5</p>'
    );
  }

  document.addEventListener('click', function (e) {
    var visitBtn = e.target.closest('#btnVisitar');
    if (visitBtn) {
      e.preventDefault();
      buildVisit();
      openModal('cfxVisit');
      return;
    }

    var chatBtn = e.target.closest('#btnChat');
    if (chatBtn) {
      e.preventDefault();
      buildChat();
      openModal('cfxChat');
      return;
    }

    var revBtn = e.target.closest('#btnReviewMore');
    if (revBtn) {
      e.preventDefault();
      buildReviews();
      openModal('cfxRev');
      return;
    }

    var termsBtn = e.target.closest('.pd-terms-btn');
    if (termsBtn) {
      e.preventDefault();
      alert('Termos de Uso, Garantia & Políticas:\n\n1. Produto 100% Original com Nota Fiscal e garantia de confecção.\n2. Enviado com Frete Grátis e Seguro de Transporte para todo o Brasil.\n3. Troca ou devolução grátis em até 30 dias caso não sirva.\n4. Parcele em até 5x sem juros no cartão ou pague com 5% de desconto no PIX.');
      return;
    }
  });
});
