/**
 * Main Product Page Scripts
 * Handles Carousel, Countdown Timer, Dynamic Dates, Modals and Navigation
 */

document.addEventListener('DOMContentLoaded', function () {
  // ── 1. Timer Regressivo (Oferta Halloween) ──
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

  // ── 2. Data Promocional Dinâmica (Hoje) ──
  var now = new Date();
  var day = String(now.getDate()).padStart(2, '0');
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var promoEl = document.getElementById('promoDate');
  if (promoEl) {
    promoEl.textContent = '🔥 PROMO ' + day + '.' + month;
  }

  // ── 3. Data de Envio Estimada Dinâmica ──
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

  // ── 4. Carrossel de Imagens Interativo ──
  var track = document.getElementById('carTrack');
  var cur = document.getElementById('carCur');
  var prev = document.getElementById('carPrev');
  var next = document.getElementById('carNext');
  var slides = document.querySelectorAll('.car-slide');
  var total = slides.length || 8;
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
        }
      }
    });
  }

  if (prev) prev.addEventListener('click', function () { goToSlide(currentIndex - 1); });
  if (next) next.addEventListener('click', function () { goToSlide(currentIndex + 1); });

  // ── 5. Preservar UTMs e parâmetros nos botões de checkout ──
  var checkoutLinks = document.querySelectorAll('.bb-buy, .bb-cart');
  checkoutLinks.forEach(function (link) {
    var search = window.location.search;
    if (search) {
      var href = link.getAttribute('href');
      if (href && !href.includes('?')) {
        link.setAttribute('href', href + search);
      } else if (href) {
        link.setAttribute('href', href + '&' + search.substring(1));
      }
    }
  });

  // ── 6. Modais Interativos (Loja, Chat, Avaliações) ──
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
    createModalShell('cfxVisit', "Loja Oficial JBL",
      '<div class="cfx-store-row"><div class="cfx-store-logo" style="background:#ff5500;">JBL</div>' +
      '<div style="flex:1;"><div class="cfx-store-name">JBL Oficial do Brasil</div>' +
      '<div class="cfx-store-meta">Loja oficial · 4.9 ★ · Distribuidor Autorizado</div></div></div>' +
      '<div class="cfx-store-stat"><div><strong>540.2K</strong><span>Vendidos</span></div>' +
      '<div><strong>4.9</strong><span>Avaliação</span></div>' +
      '<div><strong>100%</strong><span>Garantia</span></div></div>' +
      '<p style="font-size:13px;color:#555;line-height:1.6;margin-top:12px;">Loja oficial JBL. Produto 100% original com nota fiscal, 1 ano de garantia nacional Harman/JBL e envio com logística prioritária com seguro de transporte.</p>' +
      '<a href="pagamento.html" style="display:block;text-align:center;width:100%;margin-top:16px;padding:13px;background:linear-gradient(90deg, #ff3b30, #ff5e3a);color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Garantir JBL PartyBox 520</a>'
    );
  }

  function buildChat() {
    if (built.chat) return;
    built.chat = true;
    createModalShell('cfxChat', 'Atendimento JBL Especial',
      '<div class="cfx-chat-msg">' +
      '<span class="cfx-chat-time">Hoje, online agora</span>' +
      '<div class="cfx-chat-bubble cfx-chat-them">Olá! Tudo bem? Bem-vindo ao atendimento da Loja Oficial JBL 👋</div>' +
      '<div class="cfx-chat-bubble cfx-chat-them">A <strong>JBL PartyBox 520</strong> está com 82% OFF no Esquenta Black Friday por apenas R$ 127,90 (De R$ 697,00)! São 400W RMS de som potente, AI Sound Boost e show de luzes dinâmico.</div>' +
      '<span class="cfx-chat-time">Dúvidas sobre bateria e entrega</span>' +
      '<div class="cfx-chat-bubble cfx-chat-them">A bateria dura até 15 horas contínuas, tem alça telescópica e rodinhas reforçadas. Envio imediato com Frete Grátis! ⚡</div>' +
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
      { n: 'Rodrigo A.', d: 'há 1 dia', t: 'Os 400W de potência impressionam! Graves profundos e som limpo até no volume máximo. As rodinhas ajudam muito a transportar.' },
      { n: 'Marcelo F.', d: 'há 2 dias', t: 'Show de luzes muito top no ritmo da música. Conectei o microfone para karaokê e a festa foi até de manhã sem descarregar a bateria!' },
      { n: 'Luciana T.', d: 'há 3 dias', t: 'O AI Sound Boost realmente equilibra o som em ambientes abertos perto da piscina. Recomendo de olhos fechados!' },
      { n: 'Eduardo M.', d: 'há 4 dias', t: 'A melhor PartyBox que a JBL já lançou. Vale cada real pago nessa promoção do Esquenta Black Friday.' },
      { n: 'Julio C.', d: 'há 1 semana', t: 'Entrega super rápida, muito bem embalada e com nota fiscal. Qualidade JBL indiscutível!' }
    ];
    var html = extras.map(function (e) {
      return '<div class="cfx-rev-extra"><span class="nm">' + e.n + '</span><span class="dt">' + e.d + '</span>' +
        '<div style="margin-top:4px;">' + e.t + '</div></div>';
    }).join('');
    createModalShell('cfxRev', 'Avaliações Verificadas de Clientes (96)', html +
      '<p style="text-align:center;font-size:12px;color:#888;margin-top:14px;">96 avaliações verificadas · 4.9 ★ de 5</p>'
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
      alert('Termos de Uso e Garantia JBL:\n\n1. Produto 100% Original JBL com 1 ano de garantia de fábrica.\n2. Enviado com Frete Grátis e Seguro de Transporte.\n3. Devolução grátis em até 30 dias se não ficar satisfeito.\n4. Parcele em até 12x ou pague com 5% de desconto no PIX/NuPay.');
      return;
    }
  });
});
