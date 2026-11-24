document.documentElement.classList.add('js');

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 앵커 클릭 스크롤 — 표지(#top)는 position:sticky라 브라우저 기본 앵커 이동이
// 가끔 어긋나서, 직접 scrollTo로 처리. 나머지는 scrollIntoView로 통일.
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  var id = link.getAttribute('href').slice(1);
  if (!id) return;
  var target = document.getElementById(id);
  if (!target) return;

  link.addEventListener('click', function (e) {
    e.preventDefault();
    var behavior = reduceMotion ? 'auto' : 'smooth';
    if (id === 'top') {
      window.scrollTo({ top: 0, left: 0, behavior: behavior });
    } else {
      target.scrollIntoView({ behavior: behavior, block: 'start' });
    }
    history.pushState(null, '', '#' + id);
  });
});

if (!reduceMotion && 'IntersectionObserver' in window) {
  document.querySelectorAll('.page:not(.page--cover)').forEach(function (el) {
    el.classList.add('reveal');
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el);
  });
}

// 유튜브 썸네일 클릭 시 그 자리에서 바로 재생
document.querySelectorAll('.video__thumb').forEach(function (thumb) {
  thumb.addEventListener('click', function (e) {
    e.preventDefault();
    var id = thumb.getAttribute('data-yt-id');
    var iframe = document.createElement('iframe');
    iframe.className = 'video__iframe';
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
    iframe.title = thumb.querySelector('img').alt;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    thumb.replaceWith(iframe);
  });
});

// GeoIP 타일 동기화 3안 비교 데모 (모달)
(function () {
  var dialog = document.getElementById('tile-sync-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="tile-sync-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var usersInput = dialog.querySelector('#demo-users');
  var changesInput = dialog.querySelector('#demo-changes');
  var GRID = 11250;

  function setBar(key, value, max, labelText) {
    var fill = dialog.querySelector('[data-bar="' + key + '"]');
    var valueEl = dialog.querySelector('[data-val="' + key + '"]');
    if (!fill || !valueEl) return;
    var pct = Math.min(100, (value / max) * 100);
    if (value > 0) pct = Math.max(pct, 3); // 값이 있으면 눈에 보이는 최소 너비 보장
    fill.style.width = pct + '%';
    valueEl.textContent = labelText;
  }

  function render() {
    var users = Number(usersInput.value);
    var changes = Number(changesInput.value);
    dialog.querySelector('[data-out="users"]').textContent = users;
    dialog.querySelector('[data-out="changes"]').textContent = changes;

    var mem1 = users * changes;
    var mem2 = GRID;
    var mem3 = changes;
    var memMax = Math.max(mem1, mem2, mem3, 1);

    var scan1 = users * changes;
    var scan2 = GRID;
    var scan3 = changes;
    var scanMax = Math.max(scan1, scan2, scan3, 1);

    setBar('mem-1', mem1, memMax, '약 ' + mem1.toLocaleString() + '칸');
    setBar('mem-2', mem2, memMax, mem2.toLocaleString() + '칸');
    setBar('mem-3', mem3, memMax, mem3.toLocaleString() + '칸');

    setBar('scan-1', scan1, scanMax, '약 ' + scan1.toLocaleString() + '회');
    setBar('scan-2', scan2, scanMax, scan2.toLocaleString() + '칸 전체 스캔');
    setBar('scan-3', scan3, scanMax, scan3.toLocaleString() + '건');
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      render();
      dialog.showModal();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { dialog.close(); });
  }
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  usersInput.addEventListener('input', render);
  changesInput.addEventListener('input', render);
})();

// Truss LLM 출력 검증 파이프라인 흐름 데모 (모달)
(function () {
  var dialog = document.getElementById('truss-pipeline-demo');
  if (!dialog) return;

  var openBtn = document.querySelector('[data-dialog="truss-pipeline-demo"]');
  var closeBtn = dialog.querySelector('.demo-dialog__close');
  var canvas = dialog.querySelector('#pipeline-canvas');
  var serverNode = dialog.querySelector('#pipeline-server');

  var inputNode = dialog.querySelector('#pipeline-input');
  var llmNode = dialog.querySelector('#pipeline-llm');
  var stage1Node = dialog.querySelector('#pipeline-stage-1');
  var stage2Node = dialog.querySelector('#pipeline-stage-2');
  var stage3Node = dialog.querySelector('#pipeline-stage-3');
  var stage4Node = dialog.querySelector('#pipeline-stage-4');

  var START_X = 7;
  var END_X = 94;
  var SPEED = 0.3; // % / frame
  var SPAWN_INTERVAL = 2500;

  // 정상 매수 → 정상 매도 → 비정상 4종(항목검사·항목검사·호출실패·서버검증)을 고정 순서로 반복
  // 실제 출력 스키마(market/side/price/quantity)와 동일한 필드로 구성
  var SCRIPT = [
    { market: 'BTC', side: 'BUY', price: 83000000, quantity: 0.05, invalidKind: 'none' },
    { market: 'ETH', side: 'SELL', price: 4500000, quantity: 1.2, invalidKind: 'none' },
    { market: 'XRP', side: 'HOLD', price: 900, quantity: 500, invalidKind: 'enum' },
    { market: 'BTC', side: 'SELL', price: -500, quantity: 0.1, invalidKind: 'price' },
    { market: 'ETH', side: 'BUY', price: 4300000, quantity: 0.8, invalidKind: 'callfail' },
    { market: 'FAKE', side: 'BUY', price: 1200000, quantity: 3, invalidKind: 'fakecode' }
  ];
  var scriptIndex = 0;

  function updateLabel(p) {
    p.el.textContent = p.market + ' ' + p.side + ' ' + p.price.toLocaleString() + '원 · ' + p.quantity + '개';
  }

  function highlightNode(nodeEl, p) {
    if (!nodeEl) return;
    var cls = p.invalidKind === 'none' ? 'is-hit-pass' : 'is-hit-fail';
    nodeEl.classList.add(cls);
    setTimeout(function () { nodeEl.classList.remove(cls); }, 700);
  }

  // 입력({market, prices[]})이 LLM을 거쳐 결정(JSON)으로 바뀌는 지점.
  function handleLlm(p) {
    p.el.classList.add('is-decision');
    updateLabel(p);
    return false;
  }

  function handleStage1(p) {
    if (p.invalidKind === 'enum' || p.invalidKind === 'price') {
      dropParticle(p, p.invalidKind === 'enum' ? 'side 오류' : '가격 오류');
      return true;
    }
    return false;
  }

  function handleStage2(p) {
    if (p.invalidKind === 'callfail') {
      dropParticle(p, '호출 타임아웃');
      return true;
    }
    return false;
  }

  function handleStage3(p) {
    // 필터링 없음 — 호가 단위로 가격만 스냅해서 변환을 눈으로 보여준다
    p.price = Math.round(p.price / 1000) * 1000;
    updateLabel(p);
    return false;
  }

  function handleStage4(p) {
    if (p.invalidKind === 'fakecode') {
      dropParticle(p, '마켓코드 오류');
      return true;
    }
    return false;
  }

  var CHECKPOINTS = [
    { x: 20, node: llmNode, handle: handleLlm },
    { x: 33, node: stage1Node, handle: handleStage1 },
    { x: 49, node: stage2Node, handle: handleStage2 },
    { x: 65, node: stage3Node, handle: handleStage3 },
    { x: 81, node: stage4Node, handle: handleStage4 }
  ];

  var particles = [];
  var rafId = null;
  var spawnTimer = null;

  function spawnParticle() {
    var data = SCRIPT[scriptIndex % SCRIPT.length];
    scriptIndex++;

    var el = document.createElement('div');
    el.className = 'pipeline-particle';
    el.style.left = START_X + '%';
    el.textContent = '요청';
    canvas.appendChild(el);

    var p = {
      el: el,
      x: START_X,
      nextCheckpoint: 0,
      state: 'moving',
      market: data.market,
      side: data.side,
      price: data.price,
      quantity: data.quantity,
      invalidKind: data.invalidKind
    };
    particles.push(p);
    highlightNode(inputNode, p);
  }

  function dropParticle(p, reasonText) {
    p.state = 'falling';
    p.el.classList.add('is-drop');
    p.el.textContent = reasonText;
    p.el.style.top = '96%';
    p.el.style.opacity = '0';
    setTimeout(function () {
      p.el.remove();
      p.state = 'removed';
    }, 2300);
  }

  function arriveParticle(p) {
    p.state = 'removed';
    p.el.remove();
    highlightNode(serverNode, p);
  }

  function step() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.state !== 'moving') continue;

      p.x += SPEED;
      var cp = CHECKPOINTS[p.nextCheckpoint];
      if (cp && p.x >= cp.x) {
        p.nextCheckpoint++;
        highlightNode(cp.node, p);
        if (cp.handle(p)) continue;
      }
      if (p.x >= END_X) {
        arriveParticle(p);
        continue;
      }
      p.el.style.left = p.x + '%';
    }
    particles = particles.filter(function (p) { return p.state !== 'removed'; });
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId) return;
    scriptIndex = 0;
    spawnParticle();
    spawnTimer = setInterval(spawnParticle, SPAWN_INTERVAL);
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    clearInterval(spawnTimer);
    particles.forEach(function (p) { p.el.remove(); });
    particles = [];
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (dialog.open) return;
      dialog.showModal();
      start();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', stop);
})();

// 상단 네비 현재 위치 강조 (scrollspy)
(function () {
  var navLinks = document.querySelectorAll('.site-nav__links a');
  if (!navLinks.length || !('IntersectionObserver' in window)) return;

  var sections = Array.prototype.map.call(navLinks, function (link) {
    var id = link.getAttribute('href').slice(1);
    return document.getElementById(id);
  }).filter(Boolean);

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = document.querySelector('.site-nav__links a[href="#' + entry.target.id + '"]');
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(function (s) { spy.observe(s); });
})();
